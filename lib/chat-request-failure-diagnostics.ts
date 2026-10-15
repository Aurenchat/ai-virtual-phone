/**
 * Float request-failure breadcrumbs, v1.1.
 * Records structure ONLY when a real provider request fails. Never stores
 * prompts, bodies, tool IDs/names/arguments, URLs, headers or response text.
 * This module cannot mutate chat or retry a request.
 */
import type { LlmRequestPayload } from "./llm-provider-adapter";

const STORE_KEY = "float:chat-request-failures:v1";
const MAX_ENTRIES = 16;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SCAN_MESSAGES = 5000;

type FailurePhase = "payload_prepare" | "fetch" | "http_status" | "response_json" | "stream_read";
type FailureKind = "http" | "abort" | "network" | "decode" | "other";
type Role = "system" | "user" | "assistant" | "tool" | "other";
export type FailureAnomalyCode =
    | "CALL_AFTER_ASSISTANT" | "CALL_AFTER_SYSTEM" | "CALL_WITHOUT_PRIOR_TURN"
    | "TOOL_RESULT_GAP" | "ORPHAN_RESULT" | "UNANSWERED_CALL";
export type FailureAnomaly = { code: FailureAnomalyCode; index: number; before: Role; current: Role; after: Role };
export type ProviderFailureRecord = {
    version: 1;
    sessionId: string; // LOCAL grouping only; omitted from formatted reports
    at: number;
    providerKind: string;
    phase: FailurePhase;
    kind: FailureKind;
    httpStatus?: number;
    elapsedMs?: number;
    bodyChars?: number;
    streaming: boolean;
    messageCount: number;
    toolCallCount: number;
    toolResultCount: number;
    anomalies: FailureAnomaly[];
    truncatedScan: boolean;
};

type CaptureOptions = {
    sessionId?: string;
    phase: FailurePhase;
    error?: unknown;
    httpStatus?: number;
    bodyChars?: number;
    elapsedMs?: number;
    streaming?: boolean;
};
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v)) ? v as Record<string, unknown> : {};
const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const roleOf = (v: unknown): Role => ["system", "user", "assistant", "tool"].includes(v as string) ? v as Role : "other";
const capped = (v: unknown, max: number): number | undefined => typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : undefined;

export function analyzeFailedProviderBody(payload: Pick<LlmRequestPayload, "providerKind" | "body">) {
    const body = obj(payload.body);
    const isGemini = payload.providerKind === "gemini";
    const raw = arr(isGemini ? body.contents : body.messages);
    const truncatedScan = raw.length > MAX_SCAN_MESSAGES;
    const rows = raw.slice(0, MAX_SCAN_MESSAGES);
    const roles: Role[] = rows.map(item => roleOf(obj(item).role === "model" ? "assistant" : obj(item).role));
    let calls = 0, results = 0;
    const problems: FailureAnomaly[] = [];
    const pending = new Map<string, number>(); // ephemeral only, never exported
    const emit = (code: FailureAnomalyCode, i: number) => {
        if (problems.length >= 8) return;
        problems.push({ code, index: i, before: roles[i - 1] ?? "other", current: roles[i] ?? "other", after: roles[i + 1] ?? "other" });
    };
    for (let i = 0; i < rows.length; i++) {
        const m = obj(rows[i]);
        const isAnthropic = payload.providerKind === "anthropic";
        const parts = arr(isGemini ? m.parts : isAnthropic ? m.content : undefined).map(obj);
        const toolCalls = isGemini ? parts.filter(p => Object.keys(obj(p.functionCall)).length > 0)
            : isAnthropic ? parts.filter(p => p.type === "tool_use") : arr(m.tool_calls);
        const toolResults = isGemini ? parts.filter(p => Object.keys(obj(p.functionResponse)).length > 0)
            : isAnthropic ? parts.filter(p => p.type === "tool_result") : m.role === "tool" ? [m] : [];
        calls += toolCalls.length;
        results += toolResults.length;
        if (toolCalls.length) {
            if (i === 0) emit("CALL_WITHOUT_PRIOR_TURN", i);
            else if (roles[i - 1] === "assistant") emit("CALL_AFTER_ASSISTANT", i);
            else if (roles[i - 1] === "system") emit("CALL_AFTER_SYSTEM", i);
        }
        if (payload.providerKind === "openai-compatible") {
            for (const call of toolCalls) {
                const id = obj(call).id;
                if (typeof id === "string") pending.set(id, i);
            }
            for (const result of toolResults) {
                const id = obj(result).tool_call_id;
                if (typeof id !== "string" || !pending.has(id)) emit("ORPHAN_RESULT", i);
                else {
                    const start = pending.get(id)!;
                    if (rows.slice(start + 1, i).some(x => obj(x).role !== "tool")) emit("TOOL_RESULT_GAP", i);
                    pending.delete(id);
                }
            }
        }
    }
    if (payload.providerKind === "openai-compatible" && pending.size) emit("UNANSWERED_CALL", rows.length - 1);
    return { messageCount: raw.length, toolCallCount: calls, toolResultCount: results, anomalies: problems, truncatedScan };
}

// Keep only a weak reference while the response is being consumed. This is not
// persisted, and avoids scanning or serializing successful requests for diagnostics.
const responseRequests = new WeakMap<object, Pick<LlmRequestPayload, "providerKind" | "body">>();
export function rememberProviderResponseRequest(response: object, payload: Pick<LlmRequestPayload, "providerKind" | "body">): void {
    try { responseRequests.set(response, payload); } catch { /* diagnostics cannot affect requests */ }
}
export function captureFailedProviderResponse(response: object, fallback: Pick<LlmRequestPayload, "providerKind" | "body">, options: CaptureOptions): void {
    captureFailedProviderRequest(responseRequests.get(response) ?? fallback, options);
}

function read(): ProviderFailureRecord[] {
    try {
        if (typeof window === "undefined" || !window.localStorage) return [];
        const raw = window.localStorage.getItem(STORE_KEY);
        if (!raw || raw.length > 24000) return [];
        const value: unknown = JSON.parse(raw);
        if (!Array.isArray(value)) return [];
        const now = Date.now();
        return value.filter((x): x is ProviderFailureRecord => x?.version === 1 && typeof x?.sessionId === "string"
            && typeof x.at === "number" && x.at <= now && now - x.at < MAX_AGE_MS);
    } catch { return []; }
}

export function captureFailedProviderRequest(payload: Pick<LlmRequestPayload, "providerKind" | "body">, options: CaptureOptions): void {
    try {
        if (!options.sessionId || typeof window === "undefined" || !window.localStorage) return;
        const a = analyzeFailedProviderBody(payload);
        const name = obj(options.error).name;
        const kind: FailureKind = options.phase === "http_status" ? "http" : name === "AbortError" ? "abort"
            : options.phase === "response_json" || options.phase === "stream_read" ? "decode"
            : name === "TypeError" ? "network" : "other";
        const item: ProviderFailureRecord = {
            version: 1, sessionId: options.sessionId, at: Date.now(), providerKind: String(payload.providerKind).slice(0, 30),
            phase: options.phase, kind,
            ...(capped(options.httpStatus, 599) !== undefined ? { httpStatus: capped(options.httpStatus, 599) } : {}),
            ...(capped(options.bodyChars, 20000000) !== undefined ? { bodyChars: capped(options.bodyChars, 20000000) } : {}),
            ...(capped(options.elapsedMs, 600000) !== undefined ? { elapsedMs: capped(options.elapsedMs, 600000) } : {}),
            streaming: options.streaming === true,
            ...a,
        };
        const history = read();
        history.push(item);
        window.localStorage.setItem(STORE_KEY, JSON.stringify(history.slice(-MAX_ENTRIES)));
    } catch { /* diagnostics must NEVER impact the reply */ }
}

export function readFailedProviderRequests(sessionId: string): ProviderFailureRecord[] {
    return read().filter(x => x.sessionId === sessionId).slice(-8).reverse();
}
export function formatFailedProviderRequestReport(sessionId: string): string {
    const entries = readFailedProviderRequests(sessionId);
    if (!entries.length) return "实际失败请求诊断：暂无记录（安装此版本后新发生的失败才会记录）。";
    const lines = ["实际失败请求诊断（脱敏、仅当前会话；不包含正文或请求 ID）："];
    for (const [i, r] of entries.entries()) {
        lines.push(`${i + 1}. ${new Date(r.at).toISOString()} ${r.providerKind} ${r.phase} / ${r.kind}`
            + `${r.httpStatus ? ` HTTP ${r.httpStatus}` : ""} 消息=${r.messageCount} 工具=${r.toolCallCount}/${r.toolResultCount}`
            + `${r.bodyChars === undefined ? "" : ` 请求字符≈${r.bodyChars}`}`
            + `${r.elapsedMs === undefined ? "" : ` 耗时=${r.elapsedMs}ms`}`
            + `${r.streaming ? " 流式" : " 非流式"}`);
        for (const anomaly of r.anomalies) {
            lines.push(`   [${anomaly.code} #${anomaly.index}] ${anomaly.before} → ${anomaly.current} → ${anomaly.after}`);
        }
        if (r.truncatedScan) lines.push("   消息结构扫描超过 5000 条，仅检查前 5000 条。");
        if (!r.anomalies.length) lines.push("   未发现内置规则能识别的结构异常；不等于上游格式一定合法。");
    }
    lines.push("仅记录真实失败的请求；不能看到中转服务器转化后的 Gemini 消息结构。");
    return lines.join("\n");
}
