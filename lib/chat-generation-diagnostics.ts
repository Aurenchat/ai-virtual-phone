// Small, independent breadcrumbs. Never pass message, prompt or tool content here.
export type GenerationStage = "GEN_TRIGGERED" | "HISTORY_LOADED" | "API_BEGIN" | "API_FIRST_DELTA"
    | "RESPONSE_RECEIVED" | "PARSE_DONE" | "PUBLISHING" | "PUBLISH_DONE" | "GEN_ERROR" | "GEN_FINALLY";
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
}
const CURRENT = "ai_phone_chat_generation_diag_current_v1";
const PREVIOUS = "ai_phone_chat_generation_diag_previous_v1";
const STAGES: GenerationStage[] = ["GEN_TRIGGERED", "HISTORY_LOADED", "API_BEGIN", "API_FIRST_DELTA", "RESPONSE_RECEIVED", "PARSE_DONE", "PUBLISHING", "PUBLISH_DONE", "GEN_ERROR", "GEN_FINALLY"];
const count = (n: unknown) => typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
function read(key: string): GenerationDiagnostic | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw || raw.length > 2048) return null;
        const r = JSON.parse(raw);
        if (r.version !== 1 || typeof r.runId !== "string" || r.runId.length > 128
            || typeof r.sessionId !== "string" || r.sessionId.length > 200 || !STAGES.includes(r.lastStage)
            || !Number.isFinite(r.startedAt) || !Number.isFinite(r.lastStageAt)
            || typeof r.completed !== "boolean" || typeof r.isGroup !== "boolean") return null;
        return { version: 1, runId: r.runId, sessionId: r.sessionId, isGroup: r.isGroup,
            startedAt: r.startedAt, lastStage: r.lastStage, lastStageAt: r.lastStageAt,
            historyCount: count(r.historyCount), rawLength: count(r.rawLength), draftCount: count(r.draftCount),
            publishedCount: count(r.publishedCount), completed: r.completed,
            ...(typeof r.errorName === "string" && /^[\w.-]{1,80}$/.test(r.errorName) ? { errorName: r.errorName } : {}) };
    } catch { return null; }
}
function write(key: string, record: GenerationDiagnostic) {
    try { localStorage.setItem(key, JSON.stringify(record)); } catch { /* Diagnostics cannot affect chat. */ }
}
export function readGenerationDiagnostics() { return { current: read(CURRENT), previous: read(PREVIOUS) }; }
export function startGenerationDiagnostic(runId: string, sessionId: string, isGroup: boolean) {
    const old = read(CURRENT);
    if (old && !old.completed) write(PREVIOUS, old);
    const now = Date.now();
    write(CURRENT, { version: 1, runId, sessionId, isGroup, startedAt: now, lastStageAt: now,
        lastStage: "GEN_TRIGGERED", historyCount: 0, rawLength: 0, draftCount: 0, publishedCount: 0, completed: false });
}
export function markGenerationDiagnostic(runId: string | undefined, stage: GenerationStage,
    values: Partial<Pick<GenerationDiagnostic, "historyCount" | "rawLength" | "errorName" | "completed">> = {},
    addedDrafts = 0, addedPublished = 0) {
    const r = read(CURRENT);
    if (!r || r.runId !== runId || r.completed) return;
    r.lastStage = stage;
    r.lastStageAt = Date.now();
    if (values.historyCount !== undefined) r.historyCount = count(values.historyCount);
    if (values.rawLength !== undefined) r.rawLength += count(values.rawLength);
    if (values.errorName && /^[\w.-]{1,80}$/.test(values.errorName)) r.errorName = values.errorName;
    r.draftCount += count(addedDrafts);
    r.publishedCount += count(addedPublished);
    if (values.completed === true) r.completed = true;
    write(CURRENT, r);
}
