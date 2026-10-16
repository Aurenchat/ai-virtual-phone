// Read-only, per-character export. No writes to IndexedDB, counters or configuration.
import { loadMemoryEntries } from "@/lib/memory-storage";
import type { MemoryEntry } from "@/lib/memory-types";

export type CharacterMemoryExportResult = {
    blob: Blob;
    filename: string;
    longTermCount: number;
    coreCount: number;
    exportedAt: string;
};

function safeFilePart(value: string): string {
    return value.trim().replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").replace(/[.\s]+$/g, "").slice(0, 48) || "角色";
}

function readableEntries(title: string, entries: MemoryEntry[]): string {
    const body = entries.map((entry, index) => [
        `#${index + 1}  ${entry.createdAt}`,
        `来源: ${entry.sourceApp}  |  重要性: ${entry.importance}`,
        entry.content,
    ].join("\n")).join("\n\n---\n\n");
    return `${title}（${entries.length} 条）\n\n${body || "（无记录）"}\n`;
}

/**
 * Preserves full MemoryEntry objects (including provenance, metadata and embedding)
 * in JSON. TXT is a convenience reading copy; it is not a restore format.
 * The default scope matches the native UI: only provenance-valid entries.
 */
export async function prepareCharacterMemoryExport(
    characterId: string,
    characterName: string,
    includeInvalidated = false,
): Promise<CharacterMemoryExportResult> {
    if (!characterId || !characterName) throw new Error("未选择有效角色");

    const entries = await loadMemoryEntries(characterId, { includeInvalidated });
    // Defense in depth: never export another character or an unexpected entry type.
    const scoped = entries.filter(entry => entry.characterId === characterId);
    const longTerm = scoped.filter(entry => entry.type === "long_term");
    const core = scoped.filter(entry => entry.type === "core");
    if (longTerm.length + core.length === 0) {
        throw new Error("该角色没有可导出的长期或核心记忆，或本地记忆库暂时不可读");
    }

    const exportedAt = new Date().toISOString();
    const scope = includeInvalidated ? "including_invalidated" : "valid_only";
    const manifest = {
        schema: "float_character_memory_export",
        schemaVersion: 1,
        exportedAt,
        characterId,
        characterName,
        scope,
        counts: { longTerm: longTerm.length, core: core.length },
        note: "Standalone read-only export; not an official Float restore package.",
    };

    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    for (const [name, type, records] of [
        ["long_term.json", "long_term", longTerm],
        ["core.json", "core", core],
    ] as const) {
        zip.file(name, JSON.stringify({ ...manifest, type, entries: records }, null, 2));
    }
    const readable = [
        `角色：${characterName}\n角色 ID：${characterId}\n导出时间：${exportedAt}\n范围：${includeInvalidated ? "含已失效历史记录" : "当前有效记忆"}\n`,
        readableEntries("长期记忆", longTerm),
        readableEntries("核心记忆", core),
    ].join("\n\n====================\n\n");
    zip.file("readable.txt", "\uFEFF" + readable);

    const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 3 },
        streamFiles: true,
    });
    return {
        blob,
        filename: `Float-${safeFilePart(characterName)}-记忆-${exportedAt.slice(0, 10)}.zip`,
        longTermCount: longTerm.length,
        coreCount: core.length,
        exportedAt,
    };
}
