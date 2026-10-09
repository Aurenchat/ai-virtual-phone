// lib/llm-http.ts
// LLM 请求的统一 fetch 出口。所有走 buildProviderRequest 的调用点统一经它发请求：
//  - 普通 provider：浏览器直连（现状不变）；
//  - serverProxy 标记（OpenCode 网关）：改发本站 /api/llm-proxy，由服务端转发，
//    绕过 opencode.ai 未开放浏览器 CORS 的问题。

import type { LlmRequestPayload } from "./llm-provider-adapter";
import { protectProviderBody } from "./custom-app-protected-policy";
import { markGenerationDiagnostic } from "./chat-generation-diagnostics";

export type FetchLlmPayloadOptions = {
    signal?: AbortSignal;
    diagnosticRunId?: string;
    diagnosticStreaming?: boolean;
};

export async function fetchLlmPayload(
    payload: LlmRequestPayload,
    options: FetchLlmPayloadOptions = {},
): Promise<Response> {
    markGenerationDiagnostic(options.diagnosticRunId, "PROVIDER_PAYLOAD_BEGIN");
    const bodyText = JSON.stringify(await protectProviderBody(payload.body, payload.providerKind));
    if (payload.serverProxy) {
        const proxyBody = JSON.stringify({ url: payload.url, headers: payload.headers, body: bodyText });
        const pending = fetch("/api/llm-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: proxyBody,
            signal: options.signal,
        });
        markGenerationDiagnostic(options.diagnosticRunId, "PROVIDER_REQUEST_BEGIN", { streaming: options.diagnosticStreaming });
        return pending;
    }
    const pending = fetch(payload.url, {
        method: "POST",
        headers: payload.headers,
        body: bodyText,
        signal: options.signal,
    });
    // fetch has returned its Promise: local invocation occurred, remote receipt is unknown.
    markGenerationDiagnostic(options.diagnosticRunId, "PROVIDER_REQUEST_BEGIN", { streaming: options.diagnosticStreaming });
    return pending;
}
