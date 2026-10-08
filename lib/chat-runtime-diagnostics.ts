export type ChatRuntimeOperation = "STICKER_PANEL" | "PHOTO_UPLOAD" | "VOICE_CALL";
export type ChatRuntimeStage = "STICKER_PANEL_OPEN" | "STICKER_PACK_CHANGED" | "STICKER_RESOLVE_BEGIN" | "STICKER_PANEL_CLOSED"
    | "PHOTO_SELECTED" | "PHOTO_STORE_BEGIN" | "PHOTO_STORED" | "PHOTO_MESSAGE_PERSISTED" | "PHOTO_DONE"
    | "CALL_TRIGGERED" | "CALL_SCREEN_MOUNTED" | "CALL_RECORD_PERSISTED" | "CALL_BG_BEGIN" | "CALL_BG_READY" | "CALL_CONNECTED" | "CALL_ENDED";
export interface ChatRuntimeDiagnostic {
    version: 1;
    operationId: string;
    sessionId: string;
    operation: ChatRuntimeOperation;
    stage: ChatRuntimeStage;
    startedAt: number;
    lastStageAt: number;
    completed: boolean;
    metadata?: Record<string, number | string | boolean>;
}
const CURRENT = "ai_phone_chat_runtime_diag_current_v1";
const PREVIOUS = "ai_phone_chat_runtime_diag_previous_v1";
const STAGES: ChatRuntimeStage[] = ["STICKER_PANEL_OPEN", "STICKER_PACK_CHANGED", "STICKER_RESOLVE_BEGIN", "STICKER_PANEL_CLOSED", "PHOTO_SELECTED", "PHOTO_STORE_BEGIN", "PHOTO_STORED", "PHOTO_MESSAGE_PERSISTED", "PHOTO_DONE", "CALL_TRIGGERED", "CALL_SCREEN_MOUNTED", "CALL_RECORD_PERSISTED", "CALL_BG_BEGIN", "CALL_BG_READY", "CALL_CONNECTED", "CALL_ENDED"];
function metadataOnly(value?: Record<string, unknown>) {
    const result: Record<string, number | string | boolean> = {};
    for (const key of ["packCount", "activePackStickerCount", "fileBytes"]) {
        const n = value?.[key];
        if (typeof n === "number" && Number.isFinite(n)) result[key] = Math.max(0, Math.floor(n));
    }
    const mime = value?.mime;
    if (typeof mime === "string" && /^[\w.+-]+\/[\w.+-]+$/.test(mime) && mime.length <= 128) result.mime = mime;
    if (value?.initiator === "character" || value?.initiator === "user") result.initiator = value.initiator;
    return result;
}
function read(key: string): ChatRuntimeDiagnostic | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw || raw.length > 2048) return null;
        const r = JSON.parse(raw);
        if (r.version !== 1 || typeof r.operationId !== "string" || r.operationId.length > 128
            || typeof r.sessionId !== "string" || r.sessionId.length > 200
            || !["STICKER_PANEL", "PHOTO_UPLOAD", "VOICE_CALL"].includes(r.operation) || !STAGES.includes(r.stage)
            || !Number.isFinite(r.startedAt) || !Number.isFinite(r.lastStageAt) || typeof r.completed !== "boolean") return null;
        return { version: 1, operationId: r.operationId, sessionId: r.sessionId, operation: r.operation,
            stage: r.stage, startedAt: r.startedAt, lastStageAt: r.lastStageAt, completed: r.completed,
            metadata: metadataOnly(r.metadata) };
    } catch { return null; }
}
function write(key: string, r: ChatRuntimeDiagnostic) {
    try { localStorage.setItem(key, JSON.stringify(r)); } catch { /* Diagnostics are best effort. */ }
}
export function readChatRuntimeDiagnostics() { return { current: read(CURRENT), previous: read(PREVIOUS) }; }
export function startChatRuntimeDiagnostic(sessionId: string, operation: ChatRuntimeOperation, stage: ChatRuntimeStage,
    metadata?: Record<string, number | string | boolean>): string {
    const old = read(CURRENT);
    if (old && !old.completed) write(PREVIOUS, old);
    const now = Date.now();
    const operationId = `${now.toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    write(CURRENT, { version: 1, operationId, sessionId, operation, stage, startedAt: now, lastStageAt: now,
        completed: false, metadata: metadataOnly(metadata) });
    return operationId;
}
export function markChatRuntimeDiagnostic(operationId: string | undefined, stage: ChatRuntimeStage,
    completed = false, metadata?: Record<string, number | string | boolean>) {
    const r = read(CURRENT);
    if (!r || r.operationId !== operationId || r.completed) return;
    r.stage = stage;
    r.lastStageAt = Date.now();
    r.completed = completed;
    r.metadata = { ...r.metadata, ...metadataOnly(metadata) };
    write(CURRENT, r);
}
