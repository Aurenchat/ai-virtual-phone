// lib/llm-http.ts
// LLM 请求的统一 fetch 出口。所有走 buildProviderRequest 的调用点统一经它发请求：
//  - 普通 provider：浏览器直连（现状不变）；
//  - serverProxy 标记（OpenCode 网关）：改发本站 /api/llm-proxy，由服务端转发，
//    绕过 opencode.ai 未开放浏览器 CORS 的问题。

import type { LlmRequestPayload } from "./llm-provider-adapter";
import { protectProviderBody } from "./custom-app-protected-policy";
import { markGenerationDiagnostic } from "./chat-generation-diagnostics";
import { captureFailedProviderRequest, rememberProviderResponseRequest } from "./chat-request-failure-diagnostics";

export type FetchLlmPayloadOptions = {
    signal?: AbortSignal;
    diagnosticRunId?: string;
    diagnosticStreaming?: boolean;
    auditSessionId?: string;
};

export async function fetchLlmPayload(
    payload: LlmRequestPayload,
    options: FetchLlmPayloadOptions = {},
): Promise<Response> {
    markGenerationDiagnostic(options.diagnosticRunId, "PROVIDER_PAYLOAD_BEGIN");
    const begin = Date.now();
    let stage: "payload_prepare" | "fetch" = "payload_prepare";
    let bodyChars: number | undefined;
    let diagnosticPayload: Pick<LlmRequestPayload, "providerKind" | "body"> = payload;
    try {
        const preparedBody = await protectProviderBody(payload.body, payload.providerKind);
        diagnosticPayload = { providerKind: payload.providerKind, body: preparedBody };
        const bodyText = JSON.stringify(preparedBody);
        bodyChars = bodyText.length;
        stage = "fetch";
        // Keep the original request behavior; only inspect errors and non-2xx responses.
        const pending = payload.serverProxy
            ? fetch("/api/llm-proxy", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: payload.url, headers: payload.headers, body: bodyText }),
                signal: options.signal,
            })
            : fetch(payload.url, {
                method: "POST", headers: payload.headers, body: bodyText, signal: options.signal,
            });
        // fetch has returned a Promise, remote receipt is still unknown.
        markGenerationDiagnostic(options.diagnosticRunId, "PROVIDER_REQUEST_BEGIN", { streaming: options.diagnosticStreaming });
        const response = await pending;
        rememberProviderResponseRequest(response, diagnosticPayload);
        if (!response.ok) captureFailedProviderRequest(diagnosticPayload, {
            sessionId: options.auditSessionId, phase: "http_status", httpStatus: response.status,
            bodyChars, elapsedMs: Date.now() - begin, streaming: options.diagnosticStreaming,
        });
        return response;
    } catch (error) {
        captureFailedProviderRequest(diagnosticPayload, {
            sessionId: options.auditSessionId, phase: stage, error,
            bodyChars, elapsedMs: Date.now() - begin, streaming: options.diagnosticStreaming,
        });
        throw error;
    }
}
