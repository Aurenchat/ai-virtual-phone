export type CrashApp = "desktop" | "chat" | "characters" | "settings" | "other" | "unknown";
export type CrashEvidence = "UNOBSERVED_FOREGROUND_END" | "PAGEHIDE_OBSERVED" | "BACKGROUND_OR_SUSPENDED" | "UNKNOWN";
export interface CrashGenerationSnapshot {
    runId: string; status: "available" | "not_available"; source?: "chatroom" | "background" | "unknown";
    lastStage?: string; startedAt?: number; lastStageAt?: number; completed?: boolean;
    historyCount?: number; draftCount?: number; publishedCount?: number;
}
export interface CrashSession {
    version: 1; documentId: string; buildId: string; startedAt: number; lastRecordedAt: number;
    app: CrashApp; visibility: "visible" | "hidden" | "unknown"; pagehideObserved: boolean;
    pagehidePersisted?: boolean; pageshowFromBFCache?: boolean; observationGap?: boolean; lastActivity?: string;
    activeGenerationRunIds: string[];
    canvas?: { mounted: boolean; renderedCards: number; backgrounds: number; relations: number; gesture: "pan" | "pinch" | "none" };
    jsErrors?: { count: number; lastKind: "error" | "unhandledrejection"; lastName: string };
    recentEvents: { t: number; kind: string; v?: number }[];
    generationSnapshots: CrashGenerationSnapshot[]; systemTerminationReason: "unknown";
    recoveredAt?: number; evidence?: CrashEvidence;
}
export interface CrashDiagnosticsSnapshot { enabled: boolean; current: CrashSession | null; history: CrashSession[]; suspect: CrashSession | null }
declare global {
    interface Window {
        __FLOAT_CRASH_DIAG_INTERNAL_V1__?: {
            read(): CrashDiagnosticsSnapshot; setEnabled(value: boolean): void; clear(): void;
            runStart(runId: string, source: "chatroom" | "background"): void; runEnd(runId: string): void;
            app(app: CrashApp): void; canvas(mounted: boolean, cards: number, backgrounds: number, relations: number, force?: boolean): void;
            gesture(kind: "pan" | "pinch", begin: boolean): void;
        };
    }
}
function empty(): CrashDiagnosticsSnapshot { return { enabled: false, current: null, history: [], suspect: null }; }
export function readCrashDiagnostics(): CrashDiagnosticsSnapshot {
    try { return typeof window !== "undefined" ? window.__FLOAT_CRASH_DIAG_INTERNAL_V1__?.read() ?? empty() : empty(); } catch { return empty(); }
}
export function setCrashDiagnosticsEnabled(value: boolean): void { try { window.__FLOAT_CRASH_DIAG_INTERNAL_V1__?.setEnabled(value); } catch {} }
export function clearCrashDiagnostics(): void { try { window.__FLOAT_CRASH_DIAG_INTERNAL_V1__?.clear(); } catch {} }
export function recordCrashApp(app: CrashApp): void { try { window.__FLOAT_CRASH_DIAG_INTERNAL_V1__?.app(app); } catch {} }
export function recordCrashCanvas(mounted: boolean, cards = 0, backgrounds = 0, relations = 0, force = false): void { try { window.__FLOAT_CRASH_DIAG_INTERNAL_V1__?.canvas(mounted, cards, backgrounds, relations, force); } catch {} }
export function recordCrashCanvasGesture(kind: "pan" | "pinch", begin: boolean): void { try { window.__FLOAT_CRASH_DIAG_INTERNAL_V1__?.gesture(kind, begin); } catch {} }
export function crashDiagnosticsReport(): string {
    const s = readCrashDiagnostics();
    const times = (r: CrashSession | null) => r && ({ ...r, startedAtISO: new Date(r.startedAt).toISOString(), startedAtLocal: new Date(r.startedAt).toLocaleString(),
        lastRecordedAtISO: new Date(r.lastRecordedAt).toISOString(), lastRecordedAtLocal: new Date(r.lastRecordedAt).toLocaleString() });
    return JSON.stringify({ format: "float-crash-diagnostics", version: 1, exportedAtISO: new Date().toISOString(), exportedAtLocal: new Date().toLocaleString(),
        note: "仅为页面事件与阶段快照；最后记录时间不是死亡时间，系统终止原因 unknown。hidden/pagehide 不证明安全退出。",
        enabled: s.enabled, current: times(s.current), history: s.history.map(times), suspect: times(s.suspect) }, null, 2);
}
