// Small, independent breadcrumbs. Never pass message, prompt or tool content here.
export type GenerationStage = "GEN_TRIGGERED" | "HISTORY_LOAD_BEGIN" | "HISTORY_LOADED" | "API_BEGIN" | "API_FIRST_DELTA"
    | "CONTEXT_PREP_BEGIN" | "SHORT_TERM_BEGIN" | "SHORT_TERM_READY" | "MEMORY_RETRIEVAL_BEGIN" | "LONG_TERM_READY" | "CORE_MEMORY_READY"
    | "MEMORY_RETRIEVAL_READY" | "PROMPT_ASSEMBLY_BEGIN" | "PROMPT_ASSEMBLED" | "PROVIDER_PAYLOAD_BEGIN" | "PROVIDER_REQUEST_BEGIN" | "PROVIDER_RESPONSE_HEADERS"
    | "PROVIDER_RESPONSE_RECEIVED" | "RESPONSE_RECEIVED" | "PARSE_DONE" | "PUBLISHING" | "PUBLISH_DONE"
    | "MESSAGE_DISPATCH_BEGIN" | "MESSAGE_DISPATCH_DONE" | "GEN_ERROR" | "GEN_FINALLY";
const NUMERIC_FIELDS = ["shortTermBudget", "longTermBudget", "coreMemoryBudget", "survivingHistoryCount",
    "survivingRecentItemCount", "longTermSelectedCount", "coreMemorySelectedCount", "llmMessageCount", "requestTokenEstimate",
    "providerRequestCount", "dispatchedCount"] as const;
type NumericField = typeof NUMERIC_FIELDS[number];
export interface GenerationDiagnostic {
    version: 1;
    runId: string;
    sessionId: string;
    isGroup: boolean;
    startedAt: number;
    lastStage: GenerationStage;
    lastStageAt: number;
    historyCount: number;
    rawLength: number;
    draftCount: number;
    publishedCount: number;
    errorName?: string;
    completed: boolean;
    source?: "chatroom" | "background";
    streaming?: boolean;
    providerRequestStarted?: boolean;
    longTermRetrievalFailed?: boolean;
    coreMemoryRetrievalFailed?: boolean;
    stageTimes?: Partial<Record<GenerationStage, number>>;
    errorStage?: GenerationStage;
    shortTermBudget?: number;
    longTermBudget?: number;
    coreMemoryBudget?: number;
    survivingHistoryCount?: number;
    survivingRecentItemCount?: number;
    longTermSelectedCount?: number;
    coreMemorySelectedCount?: number;
    llmMessageCount?: number;
    requestTokenEstimate?: number;
    providerRequestCount?: number;
    dispatchedCount?: number;
}
const CURRENT = "ai_phone_chat_generation_diag_current_v1";
const PREVIOUS = "ai_phone_chat_generation_diag_previous_v1";
const STAGES: GenerationStage[] = ["GEN_TRIGGERED", "HISTORY_LOAD_BEGIN", "HISTORY_LOADED", "API_BEGIN", "CONTEXT_PREP_BEGIN", "SHORT_TERM_BEGIN", "SHORT_TERM_READY",
    "MEMORY_RETRIEVAL_BEGIN", "LONG_TERM_READY", "CORE_MEMORY_READY", "MEMORY_RETRIEVAL_READY", "PROMPT_ASSEMBLY_BEGIN", "PROMPT_ASSEMBLED",
    "PROVIDER_PAYLOAD_BEGIN", "PROVIDER_REQUEST_BEGIN", "PROVIDER_RESPONSE_HEADERS", "PROVIDER_RESPONSE_RECEIVED", "API_FIRST_DELTA",
    "RESPONSE_RECEIVED", "PARSE_DONE", "PUBLISHING", "PUBLISH_DONE", "MESSAGE_DISPATCH_BEGIN", "MESSAGE_DISPATCH_DONE", "GEN_ERROR", "GEN_FINALLY"];
// Fixed sidecar slots preserve concurrent runs without changing current/previous semantics.
const SLOT_COUNT = 8;
const slotKey = (slot: number) => `ai_phone_chat_generation_diag_slot_${slot}_v1`;
const liveSlots = new Map<string, number>();
const count = (n: unknown) => typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
function read(key: string): GenerationDiagnostic | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw || raw.length > 4096) return null;
        const r = JSON.parse(raw);
        if (r.version !== 1 || typeof r.runId !== "string" || r.runId.length > 128
            || typeof r.sessionId !== "string" || r.sessionId.length > 200 || !STAGES.includes(r.lastStage)
            || !Number.isFinite(r.startedAt) || !Number.isFinite(r.lastStageAt)
            || typeof r.completed !== "boolean" || typeof r.isGroup !== "boolean") return null;
        const record: GenerationDiagnostic = { version: 1, runId: r.runId, sessionId: r.sessionId, isGroup: r.isGroup,
            startedAt: r.startedAt, lastStage: r.lastStage, lastStageAt: r.lastStageAt,
            historyCount: count(r.historyCount), rawLength: count(r.rawLength), draftCount: count(r.draftCount),
            publishedCount: count(r.publishedCount), completed: r.completed,
            ...(typeof r.errorName === "string" && /^[\w.-]{1,80}$/.test(r.errorName) ? { errorName: r.errorName } : {}) };
        for (const key of NUMERIC_FIELDS) if (typeof r[key] === "number" && Number.isFinite(r[key])) record[key] = count(r[key]);
        for (const key of ["streaming", "providerRequestStarted", "longTermRetrievalFailed", "coreMemoryRetrievalFailed"] as const) if (typeof r[key] === "boolean") record[key] = r[key];
        if (r.source === "chatroom" || r.source === "background") record.source = r.source;
        if (STAGES.includes(r.errorStage)) record.errorStage = r.errorStage;
        if (r.stageTimes && typeof r.stageTimes === "object") {
            record.stageTimes = {};
            for (const stage of STAGES) if (typeof r.stageTimes[stage] === "number" && Number.isFinite(r.stageTimes[stage])) record.stageTimes[stage] = count(r.stageTimes[stage]);
        }
        return record;
    } catch { return null; }
}
function write(key: string, record: GenerationDiagnostic) {
    try { localStorage.setItem(key, JSON.stringify(record)); } catch { /* Diagnostics cannot affect chat. */ }
}
export function readGenerationDiagnostics() {
    const runs: GenerationDiagnostic[] = [];
    for (let i = 0; i < SLOT_COUNT; i++) { const r = read(slotKey(i)); if (r) runs.push(r); }
    return { current: read(CURRENT), previous: read(PREVIOUS), runs };
}
export function startGenerationDiagnostic(runId: string, sessionId: string, isGroup: boolean, source: "chatroom" | "background" = "chatroom") {
    if (liveSlots.has(runId)) return;
    // Never evict a run active in this document. At capacity skip new diagnostics only.
    const occupied = new Set(liveSlots.values());
    let slot = -1, oldest = Infinity;
    for (let i = 0; i < SLOT_COUNT; i++) {
        if (occupied.has(i)) continue;
        const record = read(slotKey(i));
        const time = record?.startedAt ?? -1;
        if (time < oldest) { slot = i; oldest = time; }
    }
    if (slot < 0) return;
    liveSlots.set(runId, slot);
    const old = read(CURRENT);
    if (old && !old.completed) write(PREVIOUS, old);
    const now = Date.now();
    const record: GenerationDiagnostic = { version: 1, runId, sessionId, isGroup, source, startedAt: now, lastStageAt: now,
        lastStage: "GEN_TRIGGERED", historyCount: 0, rawLength: 0, draftCount: 0, publishedCount: 0, completed: false,
        providerRequestStarted: false, providerRequestCount: 0, stageTimes: { GEN_TRIGGERED: 0 } };
    write(slotKey(slot), record);
    write(CURRENT, record);
}
type DiagnosticValues = Partial<Pick<GenerationDiagnostic, NumericField | "historyCount" | "rawLength" | "errorName" | "completed" | "streaming" | "providerRequestStarted" | "longTermRetrievalFailed" | "coreMemoryRetrievalFailed">>;
export function markGenerationDiagnostic(runId: string | undefined, stage: GenerationStage,
    values: DiagnosticValues = {},
    addedDrafts = 0, addedPublished = 0) {
    if (!runId || !STAGES.includes(stage)) return;
    const slot = liveSlots.get(runId);
    const current = read(CURRENT);
    const r = slot === undefined ? (current?.runId === runId ? current : null) : read(slotKey(slot));
    if (!r || r.runId !== runId || r.completed) { if (values.completed === true) liveSlots.delete(runId); return; }
    if (stage === "API_FIRST_DELTA" && r.stageTimes?.API_FIRST_DELTA !== undefined) return;
    if (stage === "GEN_ERROR") r.errorStage = r.lastStage;
    r.lastStage = stage;
    r.lastStageAt = Date.now();
    r.stageTimes = r.stageTimes || {};
    // First occurrence per stage; lastStageAt still tracks later tool rounds/publishes.
    if (r.stageTimes[stage] === undefined) r.stageTimes[stage] = Math.max(0, r.lastStageAt - r.startedAt);
    for (const key of NUMERIC_FIELDS) if (values[key] !== undefined) r[key] = count(values[key]);
    for (const key of ["streaming", "providerRequestStarted", "longTermRetrievalFailed", "coreMemoryRetrievalFailed"] as const) if (typeof values[key] === "boolean") r[key] = values[key];
    if (stage === "PROVIDER_REQUEST_BEGIN") { r.providerRequestStarted = true; r.providerRequestCount = count(r.providerRequestCount) + 1; }
    if (values.historyCount !== undefined) r.historyCount = count(values.historyCount);
    if (values.rawLength !== undefined) r.rawLength += count(values.rawLength);
    if (values.errorName && /^[\w.-]{1,80}$/.test(values.errorName)) r.errorName = values.errorName;
    r.draftCount += count(addedDrafts);
    r.publishedCount += count(addedPublished);
    if (values.completed === true) r.completed = true;
    if (slot !== undefined) write(slotKey(slot), r);
    if (current?.runId === runId) write(CURRENT, r);
    if (r.completed) liveSlots.delete(runId);
}
