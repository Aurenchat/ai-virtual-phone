// Carefully scoped, non-destructive per-character memory import.
// Parsing never writes. Commit uses IDB add(), never put(), in one transaction.
import type { MemoryEntry } from "@/lib/memory-types";
import { CONTENT_APP_IDS } from "@/lib/settings-types";
import { loadMemoryEntries, insertMemoryEntriesAtomically } from "@/lib/memory-storage";

const MAX_ZIP_SIZE = 25 * 1024 * 1024;
const MAX_JSON_CHARS = 40 * 1024 * 1024;
const MAX_ENTRY_COUNT = 15000;

export type MemoryImportPreview = {
    filename: string;
    sourceCharacterName: string;
    longTermEntries: MemoryEntry[];
    coreEntries: MemoryEntry[];
    existingIds: string[];
    currentCounts: { longTerm: number; core: number };
};
export type MemoryImportResult = { added: number; skipped: number; longTerm: number; core: number };

function object(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown> : null;
}
function readJson(text: string): unknown {
    if (text.length > MAX_JSON_CHARS) throw new Error("记忆文件过大，请分批导入");
    try { return JSON.parse(text); } catch { throw new Error("JSON 格式无效"); }
}
function validIso(value: unknown): value is string {
    if (typeof value !== "string") return false;
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match || !Number.isFinite(Date.parse(value))) return false;
    const [, year, month, day, hour, minute, second, zone] = match;
    const calendar = new Date(0);
    calendar.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
    return calendar.getUTCFullYear() === Number(year)
        && calendar.getUTCMonth() === Number(month) - 1 && calendar.getUTCDate() === Number(day)
        && Number(hour) < 24 && Number(minute) < 60 && Number(second) < 60
        && (zone === "Z" || (Number(zone.slice(1, 3)) < 24 && Number(zone.slice(4)) < 60));
}
function validProvenance(value: unknown): boolean {
    const p = object(value);
    return !!p && typeof p.mixed === "boolean" && Array.isArray(p.sources)
        && p.sources.every(raw => {
            const ref = object(raw);
            return !!ref && ref.sourceKind === "custom_app"
                && ["sourceAppId", "sourceNamespace", "sourceEntityId", "viewerCharacterId"]
                    .every(key => typeof ref[key] === "string" && !!ref[key])
                && Number.isSafeInteger(ref.revision) && Number(ref.revision) >= 0;
        });
}
function assertEntry(raw: unknown, characterId: string): MemoryEntry {
    const entry = object(raw);
    if (!entry || typeof entry.id !== "string" || !entry.id.trim()
        || entry.characterId !== characterId
        || (entry.type !== "core" && entry.type !== "long_term")
        || typeof entry.content !== "string" || !entry.content.trim()
        || typeof entry.sourceApp !== "string"
        || ![...CONTENT_APP_IDS, "forum", "custom_app"].includes(entry.sourceApp)
        || (entry.sourceMessageIds !== undefined && (!Array.isArray(entry.sourceMessageIds)
            || !entry.sourceMessageIds.every(id => typeof id === "string")))
        || (entry.metadata !== undefined && !object(entry.metadata))
        || (entry.provenance !== undefined && !validProvenance(entry.provenance))
        || typeof entry.importance !== "number" || !Number.isFinite(entry.importance)
        || entry.importance < 0 || entry.importance > 1
        || !validIso(entry.createdAt) || !validIso(entry.updatedAt)
        || (entry.embedding !== undefined && (!Array.isArray(entry.embedding)
            || !entry.embedding.every(x => typeof x === "number" && Number.isFinite(x))))) {
        throw new Error("文件包含格式错误或不属于当前角色的记忆，已取消导入");
    }
    return entry as unknown as MemoryEntry;
}
function unpackEntries(raw: unknown, expectedType?: MemoryEntry["type"]): { entries: unknown[]; name: string; id: string; type?: MemoryEntry["type"] } {
    if (Array.isArray(raw)) return { entries: raw, name: "", id: "" };
    const obj = object(raw);
    if (!obj) throw new Error("文件不是受支持的 Float 记忆 JSON");
    if (Array.isArray(obj.entries)) {
        if (obj.schema !== "float_character_memory_export" || obj.schemaVersion !== 1) throw new Error("无法识别记忆文件的 schema 或版本");
        if (typeof obj.characterId !== "string" || !obj.characterId) throw new Error("缺少文件的角色 ID");
        if (expectedType && obj.type !== expectedType) throw new Error("ZIP 内记忆类型与文件名不一致");
        if (obj.type !== "core" && obj.type !== "long_term") throw new Error("未知的记忆类型");
        return { entries: obj.entries, type: obj.type, name: typeof obj.characterName === "string" ? obj.characterName : "", id: typeof obj.characterId === "string" ? obj.characterId : "" };
    }
    // One manually saved raw MemoryEntry object is also accepted.
    if (obj.id && obj.characterId && obj.type) return { entries: [obj], name: "", id: "" };
    throw new Error("文件没有可识别的记忆记录");
}

export async function previewCharacterMemoryImport(file: File, characterId: string): Promise<MemoryImportPreview> {
    if (!characterId) throw new Error("请先选中角色");
    if (file.size > MAX_ZIP_SIZE) throw new Error("文件大于 25 MB，请分批导入");
    const lower = file.name.toLowerCase();
    const sources: Array<{ raw: unknown; type?: MemoryEntry["type"] }> = [];
    if (lower.endsWith(".zip")) {
        const { default: JSZip } = await import("jszip");
        let zip: Awaited<ReturnType<typeof JSZip.loadAsync>>;
        try { zip = await JSZip.loadAsync(await file.arrayBuffer()); } catch { throw new Error("ZIP 文件损坏或格式不正确"); }
        if (!zip.file("manifest.json")) throw new Error("缺少 manifest.json，无法识别 Float 记忆导出包");
        const manifest = object(readJson(await zip.file("manifest.json")!.async("string")));
        if (!manifest || manifest.schema !== "float_character_memory_export" || manifest.schemaVersion !== 1) {
            throw new Error("不支持的记忆备份版本");
        }
        if (manifest.characterId !== characterId) throw new Error("备份属于其他角色。为避免串档，本版仅允许导入同一角色 ID");
        for (const [name, type] of [["long_term.json", "long_term"], ["core.json", "core"]] as const) {
            const item = zip.file(name);
            if (item) sources.push({ raw: readJson(await item.async("string")), type });
        }
        if (!sources.length) throw new Error("ZIP 中没有长期或核心记忆 JSON");
    } else if (lower.endsWith(".json")) {
        sources.push({ raw: readJson(await file.text()) });
    } else {
        throw new Error("请选择 Float 记忆导出的 ZIP 或 JSON 文件");
    }
    const seen = new Set<string>();
    const all: MemoryEntry[] = [];
    let sourceCharacterName = "";
    for (const source of sources) {
        const parsed = unpackEntries(source.raw, source.type);
        if (parsed.id && parsed.id !== characterId) throw new Error("文件的角色 ID 与当前角色不一致");
        if (parsed.name) sourceCharacterName = parsed.name;
        for (const raw of parsed.entries) {
            const row = assertEntry(raw, characterId);
            if ((source.type ?? parsed.type) && row.type !== (source.type ?? parsed.type)) throw new Error("记录类型与文件名不一致");
            if (seen.has(row.id)) throw new Error("文件含有重复的记忆 ID，请先检查源文件");
            seen.add(row.id);
            all.push(row);
            if (all.length > MAX_ENTRY_COUNT) throw new Error("单次最多导入 15000 条，请分批导入");
        }
    }
    if (!all.length) throw new Error("文件中没有可导入的记忆记录");
    // Count existing IDs across both types, including provenance-invalidated history.
    const current = await loadMemoryEntries(characterId, { includeInvalidated: true });
    return {
        filename: file.name,
        sourceCharacterName,
        longTermEntries: all.filter(entry => entry.type === "long_term"),
        coreEntries: all.filter(entry => entry.type === "core"),
        existingIds: current.map(entry => entry.id),
        currentCounts: {
            longTerm: current.filter(entry => entry.type === "long_term").length,
            core: current.filter(entry => entry.type === "core").length,
        },
    };
}

export async function commitCharacterMemoryImport(
    preview: MemoryImportPreview,
    characterId: string,
    includeLongTerm: boolean,
    includeCore: boolean,
): Promise<MemoryImportResult> {
    if (!includeLongTerm && !includeCore) throw new Error("至少选择一种记忆类型");
    const incoming = [
        ...(includeLongTerm ? preview.longTermEntries : []),
        ...(includeCore ? preview.coreEntries : []),
    ];
    if (!incoming.length) throw new Error("所选类型没有可导入的记录");
    if (incoming.some(entry => entry.characterId !== characterId)) throw new Error("目标角色已变化，已取消导入");
    if (incoming.length > MAX_ENTRY_COUNT || new Set(incoming.map(entry => entry.id)).size !== incoming.length) {
        throw new Error("导入数量超限或包含重复 ID");
    }
    incoming.forEach(entry => assertEntry(entry, characterId));
    // Re-read before the write to avoid replacing any records created since preview.
    const current = await loadMemoryEntries(characterId, { includeInvalidated: true });
    const existing = new Set(current.map(entry => entry.id));
    const newEntries = incoming.filter(entry => !existing.has(entry.id));
    if (newEntries.length) await insertMemoryEntriesAtomically(newEntries);
    return {
        added: newEntries.length,
        skipped: incoming.length - newEntries.length,
        longTerm: newEntries.filter(x => x.type === "long_term").length,
        core: newEntries.filter(x => x.type === "core").length,
    };
}
