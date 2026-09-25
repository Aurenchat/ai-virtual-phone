import { hydrateKvDb, kvGet, kvReadFresh, kvUpdateAtomic } from "./kv-db";

export type MemorySourceRef = {
    sourceKind: "custom_app";
    sourceAppId: string;
    sourceNamespace: string;
    sourceEntityId: string;
    viewerCharacterId: string;
    revision: number;
};
export type MemoryProvenance = { sources: MemorySourceRef[]; mixed: boolean };
export const MEMORY_REVISION_KEY = "ai_phone_memory_source_revisions_v1";
export function memorySourceKey(ref: Omit<MemorySourceRef, "revision">): string {
    return JSON.stringify([ref.sourceAppId, ref.sourceNamespace, ref.sourceEntityId, ref.viewerCharacterId]);
}
export async function readMemoryRevisions(): Promise<Record<string, number>> {
    const raw = await kvReadFresh(MEMORY_REVISION_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (!data || Array.isArray(data) || typeof data !== "object" || Object.values(data).some(n => !Number.isSafeInteger(n) || Number(n) < 0)) throw new Error("Invalid memory source revisions");
    return data;
}
export function isMemoryProvenanceValid(p: MemoryProvenance | undefined, revisions: Record<string, number>): boolean {
    return !p || (p.sources.length > 0 && p.sources.every(s => s.revision === (revisions[memorySourceKey(s)] ?? 0)));
}
export function isCachedMemoryProvenanceValid(p?: MemoryProvenance): boolean {
    if (!p) return true;
    const raw = kvGet(MEMORY_REVISION_KEY);
    return isMemoryProvenanceValid(p, raw ? JSON.parse(raw) : {});
}
export async function invalidateMemorySource(ref: Omit<MemorySourceRef, "revision">): Promise<number> {
    await hydrateKvDb();
    return kvUpdateAtomic(MEMORY_REVISION_KEY, raw => {
        const data = raw ? JSON.parse(raw) : {};
        const key = memorySourceKey(ref);
        const revision = (data[key] ?? 0) + 1;
        if (!Number.isSafeInteger(revision)) throw new Error("Invalid source revision");
        data[key] = revision;
        return { value: JSON.stringify(data), result: revision };
    });
}
/** Keep conservative lineage, including mixed legacy inputs. Never infer source from text. */
export function mergeMemoryProvenance(items: { provenance?: MemoryProvenance }[]): MemoryProvenance | undefined {
    const refs = items.flatMap(e => e.provenance?.sources ?? []);
    if (!refs.length) return undefined;
    return { sources: [...new Map(refs.map(s => [JSON.stringify(s), s])).values()], mixed: items.some(e => !e.provenance || e.provenance.mixed) };
}
export function memorySourceEnvelope(p?: MemoryProvenance): string {
    if (!p) return "";
    // Viewer is storage/routing metadata, not model-facing source identity.
    return `[memory sources=${JSON.stringify(p.sources.map(({ viewerCharacterId: _viewer, ...source }) => source))}; mixed=${p.mixed}] `;
}
