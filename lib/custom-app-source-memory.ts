import type { InstalledCustomApp } from "./custom-app-types";
import type { MemoryEntry } from "./memory-types";
import { loadMemoryEntries, saveMemoryEntry } from "./memory-storage";
import { requireAppCapability } from "./custom-app-protected-policy";
import { invalidateMemorySource, memorySourceKey, readMemoryRevisions, type MemorySourceRef } from "./memory-provenance";
import { loadCharacters } from "./character-storage";
import { hydrateKvDb } from "./kv-db";
import { appendCustomAppTimelineEntry } from "./custom-app-storage";

export type SourceMemoryScope = { viewerCharacterId: string; sourceNamespace: string; sourceEntityId: string };
async function withSourceLock<T>(ref: Omit<MemorySourceRef, "revision">, fn: () => Promise<T>): Promise<T> {
    if (!navigator.locks) throw new Error("Source memory writes require Web Locks");
    return navigator.locks.request(`memory-source:${memorySourceKey(ref)}`, fn);
}
function refFor(app: InstalledCustomApp, scope: SourceMemoryScope): Omit<MemorySourceRef, "revision"> {
    if (!scope || !loadCharacters().some(c => c.id === scope.viewerCharacterId)) throw new Error("Unknown viewer");
    for (const value of [scope.sourceNamespace, scope.sourceEntityId]) if (typeof value !== "string" || !/^[\w.-]{1,160}$/.test(value)) throw new Error("Invalid memory scope");
    return { sourceKind: "custom_app", sourceAppId: app.id, sourceNamespace: scope.sourceNamespace, sourceEntityId: scope.sourceEntityId, viewerCharacterId: scope.viewerCharacterId };
}
export async function searchSourceMemory(app: InstalledCustomApp, input: SourceMemoryScope & { query?: string }) {
    requireAppCapability(app, "memory.source.read");
    await hydrateKvDb();
    const ref = refFor(app, input);
    if (input.query !== undefined && (typeof input.query !== "string" || input.query.length > 4000)) throw new Error("Invalid memory query");
    const revision = (await readMemoryRevisions())[memorySourceKey(ref)] ?? 0;
    const entries = (await loadMemoryEntries(ref.viewerCharacterId)).filter(e => e.provenance && !e.provenance.mixed && e.provenance.sources.every(s => memorySourceKey(s) === memorySourceKey(ref) && s.revision === revision) && (!input.query || e.content.toLowerCase().includes(input.query.toLowerCase())));
    return { revision, entries };
}
export async function writeSourceMemory(app: InstalledCustomApp, input: SourceMemoryScope & { content: string; expectedRevision: number; evidenceId: string; timeline?: boolean }) {
    requireAppCapability(app, "memory.source.write");
    await hydrateKvDb();
    const ref = refFor(app, input);
    return withSourceLock(ref, async () => {
    const revision = (await readMemoryRevisions())[memorySourceKey(ref)] ?? 0;
    if (input.expectedRevision !== revision) throw new Error("Stale memory source revision");
    if (typeof input.content !== "string" || !input.content.trim() || input.content.length > 16000 || !/^[\w.-]{1,160}$/.test(input.evidenceId)) throw new Error("Invalid source memory");
    const id = `source:${JSON.stringify([memorySourceKey(ref), revision, input.evidenceId])}`;
    const existing = (await loadMemoryEntries(ref.viewerCharacterId)).find(e => e.id === id);
    if (existing) {
        if (existing.content !== input.content) throw new Error("Evidence id conflict");
        return existing;
    }
    const now = new Date().toISOString();
    const entry: MemoryEntry = { id, characterId: ref.viewerCharacterId, sourceApp: "custom_app", type: "long_term", content: input.content, importance: 0.8, createdAt: now, updatedAt: now, provenance: { sources: [{ ...ref, revision }], mixed: false } };
    await saveMemoryEntry(entry, { required: true });
    if (input.timeline) appendCustomAppTimelineEntry(app, { characterId: ref.viewerCharacterId, summary: input.content, provenance: entry.provenance });
    return entry;
    });
}
export async function revokeSourceMemory(app: InstalledCustomApp, input: SourceMemoryScope) {
    requireAppCapability(app, "memory.source.write");
    await hydrateKvDb();
    const ref = refFor(app, input);
    return withSourceLock(ref, async () => ({ revision: await invalidateMemorySource(ref) }));
}
