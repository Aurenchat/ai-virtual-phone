/**
 * Read-only / content-free request and conversation diagnostics.
 * NEVER include message text, prompt fragments, tool arguments, API keys or IDs in reports.
 */
import type { ChatMessage } from "./chat-storage";
import type { LlmRequestMessage, LlmRequestPayload } from "./llm-provider-adapter";
import type { GenerationDiagnostic } from "./chat-generation-diagnostics";

export type AuditSeverity = "error" | "warning" | "info";
export type AuditStage = "assembled" | "wire" | "stored" | "replies";
export type AuditFinding = {
    stage: AuditStage;
    severity: AuditSeverity;
    code: string;
    index?: number;
    description: string;
    occurrences?: number;
};
export type ReplyBurst = {
    precedingUserOrdinal: number;
    visibleBubbles: number;
    uniqueReplyBatches: number;
    extraUnbatchedBubbles: number;
    containsFollowUp: boolean;
    containsNativeToolTurns: boolean;
    distinctResponseRounds: number;
};
export type RunSummary = {
    source: "chatroom" | "background" | "unknown";
    startedAt: number;
    requests: number;
    published: number;
    stage: string;
    errorStage?: string;
};
export type ChatProtocolAudit = {
    version: 1;
    createdAt: string;
    providerKind: string;
    tokenBudgets?: { shortTerm: number; longTerm: number; core: number };
    /** No message bodies or secrets are ever included. */
    storedMessageCount: number;
    storedNativeCalls: number;
    storedNativeResults: number;
    assembledMessageCount: number;
    wireMessageCount: number;
    wireFunctionCalls: number;
    wireFunctionResponses: number;
    totalFindings: number;
    findings: AuditFinding[];
    recentReplyBursts: ReplyBurst[];
    recentRuns: RunSummary[];
};

const MAX_FINDINGS = 24;
const MAX_BURSTS = 5;
const MAX_RUNS = 8;
const record = (x: unknown): Record<string, unknown> => x && typeof x === "object" && !Array.isArray(x) ? x as Record<string, unknown> : {};
const array = (x: unknown): unknown[] => Array.isArray(x) ? x : [];
const nonblank = (x: unknown): string => typeof x === "string" ? x : "";

/** Inspect structured messages BEFORE adapter normalization. */
function inspectAssembled(messages: LlmRequestMessage[], emit: (f: AuditFinding) => void): void {
    const callIndexById = new Map<string, number>();
    const resultIds = new Set<string>();
    const callIndexStack: number[] = [];
    messages.forEach((msg, i) => {
        if (msg.role === "assistant" && msg.toolCalls?.length) {
            const prev = messages[i - 1];
            if (prev?.role === "assistant") {
                emit({ stage: "assembled", severity: "warning", code: "CALL_FOLLOWS_ASSISTANT", index: i,
                    description: "工具调用紧跟另一条 assistant 消息；部分上游要求先有 user 或工具结果。" });
            }
            for (const call of msg.toolCalls) {
                if (callIndexById.has(call.id)) {
                    emit({ stage: "assembled", severity: "warning", code: "DUPLICATE_TOOL_ID", index: i,
                        description: "历史中存在重复工具调用 ID。" });
                }
                callIndexById.set(call.id, i);
                callIndexStack.push(i);
            }
        }
        if (msg.role === "tool") {
            if (!msg.toolCallId || !callIndexById.has(msg.toolCallId)) {
                emit({ stage: "assembled", severity: "warning", code: "ORPHAN_RESULT", index: i,
                    description: "工具结果找不到前面的调用；适配器可能将其改写成 user 文本。" });
            } else {
                resultIds.add(msg.toolCallId);
                const origin = callIndexById.get(msg.toolCallId)!;
                const between = messages.slice(origin + 1, i).some(m => m.role !== "tool");
                if (between) emit({ stage: "assembled", severity: "warning", code: "BROKEN_ADJACENCY", index: i,
                    description: "工具调用与结果之间插入了非工具消息，适配器将尝试重排。" });
            }
        }
    });
    let missing = 0;
    for (const id of callIndexById.keys()) if (!resultIds.has(id)) missing += 1;
    if (missing) emit({ stage: "assembled", severity: "warning", code: "MISSING_RESULT", description:
        `准备发送的消息中缺少 ${missing} 个工具结果；适配器可能生成替代结果。` });
    void callIndexStack;
}

/** Inspect the actual provider-specific body AFTER normalization and serialization. */
function inspectWire(request: LlmRequestPayload, emit: (f: AuditFinding) => void): {
    turnCount: number; calls: number; responses: number;
} {
    const body = request.body;
    let calls = 0;
    let responses = 0;
    if (request.providerKind === "gemini") {
        const contents = array(body.contents);
        let previousRole = "";
        let previousHadFunctionResponse = false;
        contents.forEach((raw, i) => {
            const m = record(raw);
            const role = nonblank(m.role);
            const parts = array(m.parts).map(record);
            const turnCalls = parts.filter(p => Object.keys(record(p.functionCall)).length > 0).length;
            const turnResults = parts.filter(p => Object.keys(record(p.functionResponse)).length > 0).length;
            calls += turnCalls;
            responses += turnResults;
            if (role === "tool" && turnResults) {
                emit({ stage: "wire", severity: "error", code: "GEMINI_TOOL_ROLE", index: i,
                    description: "Gemini 原生请求将 functionResponse 放在 role=tool，而标准要求 user turn；需核对实际网关协议。" });
            }
            if (turnCalls > 0 && previousRole !== "user" && !previousHadFunctionResponse && i > 0) {
                emit({ stage: "wire", severity: "warning", code: "GEMINI_CALL_TURN_ORDER", index: i,
                    description: "functionCall 所在 model turn 前不是 user 或 functionResponse turn。" });
            }
            if (turnResults > 0 && previousRole !== "model" && i > 0) {
                emit({ stage: "wire", severity: "warning", code: "GEMINI_RESPONSE_TURN_ORDER", index: i,
                    description: "functionResponse 前面不是模型工具调用 turn。" });
            }
            previousRole = role;
            previousHadFunctionResponse = turnResults > 0;
        });
        return { turnCount: contents.length, calls, responses };
    }
    if (request.providerKind === "anthropic") {
        const messages = array(body.messages);
        messages.forEach((raw, i) => {
            const msg = record(raw);
            const parts = array(msg.content).map(record);
            const turnCalls = parts.filter(p => p.type === "tool_use").length;
            const turnResponses = parts.filter(p => p.type === "tool_result").length;
            calls += turnCalls; responses += turnResponses;
            if (turnCalls && msg.role !== "assistant") emit({ stage: "wire", severity: "error", code: "ANTHROPIC_USE_ROLE", index: i,
                description: "tool_use 未处于 assistant turn。" });
            if (turnResponses && msg.role !== "user") emit({ stage: "wire", severity: "error", code: "ANTHROPIC_RESULT_ROLE", index: i,
                description: "tool_result 未处于 user turn。" });
        });
        return { turnCount: messages.length, calls, responses };
    }
    const messages = array(body.messages);
    const expected = new Map<string, number>();
    messages.forEach((raw, i) => {
        const m = record(raw);
        const toolCalls = array(m.tool_calls).map(record);
        if (toolCalls.length > 0) {
            calls += toolCalls.length;
            if (i > 0 && record(messages[i - 1]).role === "assistant") {
                emit({ stage: "wire", severity: "warning", code: "OPENAI_TOOL_CALL_AFTER_ASSISTANT", index: i,
                    description: "最终 OpenAI 兼容请求中，携带 tool_calls 的 assistant 紧跟另一条 assistant；部分 Gemini 中转可能拒绝此顺序。" });
            }
            if (m.role !== "assistant") emit({ stage: "wire", severity: "error", code: "OPENAI_CALL_ROLE", index: i,
                description: "tool_calls 未处于 assistant turn。" });
            for (const call of toolCalls) expected.set(nonblank(call.id), i);
        }
        if (m.role === "tool") {
            responses++;
            const id = nonblank(m.tool_call_id);
            if (!expected.has(id)) {
                emit({ stage: "wire", severity: "error", code: "OPENAI_ORPHAN_RESULT", index: i,
                    description: "序列化后的 tool 消息找不到先前的 tool_calls。" });
            } else {
                const start = expected.get(id)!;
                if (messages.slice(start + 1, i).some(x => {
                    const next = record(x);
                    return next.role !== "tool";
                })) emit({ stage: "wire", severity: "error", code: "OPENAI_TOOL_GAP", index: i,
                    description: "序列化请求中的工具调用与结果之间夹了非工具 turn。" });
                expected.delete(id);
            }
        }
    });
    if (expected.size) emit({ stage: "wire", severity: "error", code: "OPENAI_UNANSWERED_CALLS",
        description: `最终请求仍有 ${expected.size} 个工具调用未获得结果。` });
    return { turnCount: messages.length, calls, responses };
}

function inspectStored(history: ChatMessage[], emit: (f: AuditFinding) => void): { calls: number; results: number } {
    let calls = 0;
    let results = 0;
    const ids = new Set<string>();
    const answered = new Set<string>();
    for (const m of history) {
        for (const c of m.nativeToolCalls ?? []) { calls++; ids.add(c.id); }
        if (m.nativeToolResult) { results++; answered.add(m.nativeToolResult.toolCallId); }
    }
    let missing = 0; let orphan = 0;
    for (const id of ids) if (!answered.has(id)) missing++;
    for (const id of answered) if (!ids.has(id)) orphan++;
    if (missing) emit({ stage: "stored", severity: "warning", code: "STORED_MISSING_RESULT",
        description: `完整存档中有 ${missing} 个工具调用缺少结果（可能是中途取消）。` });
    if (orphan) emit({ stage: "stored", severity: "warning", code: "STORED_ORPHAN_RESULT",
        description: `完整存档中有 ${orphan} 个孤立的原生工具结果。` });
    return { calls, results };
}

function recentReplyBursts(history: ChatMessage[], emit: (f: AuditFinding) => void): ReplyBurst[] {
    // Inspect only a bounded tail. A long session need not duplicate its entire content.
    const tail = history.slice(-400);
    const groups: ReplyBurst[] = [];
    let afterUser: ChatMessage[] = [];
    let userOrdinal = 0;
    const flush = () => {
        const visible = afterUser.filter(m => m.role === "assistant" && m.mediaType !== "tool_call"
            && !m.nativeToolCalls?.length && Boolean(m.content?.trim()));
        if (!visible.length) { afterUser = []; return; }
        const batches = new Set(visible.map(m => m.responseBatchId).filter((id): id is string => Boolean(id)));
        const unbatched = visible.filter(m => !m.responseBatchId).length;
        const roundIds = new Set(visible.map(m => m.responseRoundId).filter((id): id is string => Boolean(id)));
        const containsFollowUp = visible.some(m => (m.followUpIndex ?? 0) > 0);
        const containsNativeToolTurns = afterUser.some(m => Boolean(m.nativeToolCalls?.length));
        const group: ReplyBurst = {
            precedingUserOrdinal: userOrdinal,
            visibleBubbles: visible.length,
            uniqueReplyBatches: batches.size,
            extraUnbatchedBubbles: unbatched,
            containsFollowUp,
            containsNativeToolTurns,
            distinctResponseRounds: roundIds.size,
        };
        groups.push(group);
        if (batches.size > 1 && !containsFollowUp && !containsNativeToolTurns) {
            emit({ stage: "replies", severity: "info", code: "MULTIPLE_BATCHES_SINCE_USER",
                description: "最近某个用户回合后出现多个回复批次；需与后台生成运行记录对照，不能仅凭此认定重复。" });
        }
        afterUser = [];
    };
    for (const m of tail) {
        if (m.role === "user" && m.mediaType !== "tool_result") { flush(); userOrdinal++; }
        else afterUser.push(m);
    }
    flush();
    return groups.slice(-MAX_BURSTS);
}

export function analyzeChatProtocol(params: {
    request: LlmRequestPayload;
    assembledMessages: LlmRequestMessage[];
    history: ChatMessage[];
    recentRuns?: GenerationDiagnostic[];
    tokenBudgets?: { shortTerm: number; longTerm: number; core: number };
}): ChatProtocolAudit {
    const { request, assembledMessages, history } = params;
    const findings: AuditFinding[] = [];
    let totalFindings = 0;
    const emit = (finding: AuditFinding) => {
        totalFindings++;
        const existing = findings.find(f => f.stage === finding.stage && f.code === finding.code);
        if (existing) {
            existing.occurrences = (existing.occurrences ?? 1) + 1;
            return;
        }
        if (findings.length < MAX_FINDINGS) findings.push({ ...finding, occurrences: 1 });
    };
    const stored = inspectStored(history, emit);
    inspectAssembled(assembledMessages, emit);
    const wire = inspectWire(request, emit);
    const bursts = recentReplyBursts(history, emit);
    const recentRuns = (params.recentRuns ?? [])
        .filter(r => r && r.sessionId === history[0]?.sessionId)
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, MAX_RUNS)
        .map(r => ({
            source: r.source ?? "unknown" as const,
            startedAt: r.startedAt,
            requests: r.providerRequestCount ?? 0,
            published: r.publishedCount ?? 0,
            stage: r.lastStage,
            ...(r.errorStage ? { errorStage: r.errorStage } : {}),
        }));
    return {
        version: 1,
        createdAt: new Date().toISOString(),
        providerKind: request.providerKind,
        ...(params.tokenBudgets ? { tokenBudgets: params.tokenBudgets } : {}),
        storedMessageCount: history.length,
        storedNativeCalls: stored.calls,
        storedNativeResults: stored.results,
        assembledMessageCount: assembledMessages.length,
        wireMessageCount: wire.turnCount,
        wireFunctionCalls: wire.calls,
        wireFunctionResponses: wire.responses,
        totalFindings,
        findings,
        recentReplyBursts: bursts,
        recentRuns,
    };
}

export function formatChatProtocolAudit(report: ChatProtocolAudit): string {
    const lines = [
        "Float 聊天工具协议只读诊断 v1",
        `时间：${report.createdAt}`,
        `API 协议：${report.providerKind}`,
        ...(report.tokenBudgets ? [`预算（短期/长期/核心）：${report.tokenBudgets.shortTerm}/${report.tokenBudgets.longTerm}/${report.tokenBudgets.core}`] : []),
        `存档消息：${report.storedMessageCount}；存档原生调用/结果：${report.storedNativeCalls}/${report.storedNativeResults}`,
        `请求组装消息：${report.assembledMessageCount}；实际上游消息：${report.wireMessageCount}`,
        `请求中的工具调用/响应：${report.wireFunctionCalls}/${report.wireFunctionResponses}`,
        `结构检查发现：${report.totalFindings} 项（最多显示 ${MAX_FINDINGS} 类异常）`,
        ...report.findings.map(f => `[${f.severity}/${f.stage}/${f.code}${f.index === undefined ? "" : ` #${f.index}`}${(f.occurrences ?? 1) > 1 ? ` ×${f.occurrences}` : ""}] ${f.description}`),
        "最近回复段（按最近用户消息间隔聚合；多气泡不一定是多次生成）：",
        ...report.recentReplyBursts.map((b, i) =>
            `  ${i + 1}. 气泡 ${b.visibleBubbles}，batch ${b.uniqueReplyBatches}，无 batch ${b.extraUnbatchedBubbles}，round ${b.distinctResponseRounds}，追发=${b.containsFollowUp}，工具续轮=${b.containsNativeToolTurns}`),
        "近期该会话生成运行（请求数 >1 不等于重复触发，可能是工具续轮）：",
        ...report.recentRuns.map((r, i) =>
            `  ${i + 1}. ${r.source} ${new Date(r.startedAt).toISOString()} 请求=${r.requests} 发布=${r.published} 阶段=${r.stage}${r.errorStage ? ` 错误阶段=${r.errorStage}` : ""}`),
        "注意：报告不包含聊天正文、Prompt、工具参数、会话 ID 或 API 密钥。\n诊断不修改设置与存档；异常警告需要结合真实失败请求确认。",
    ];
    return lines.join("\n");
}
