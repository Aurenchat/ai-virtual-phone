"use client";

import { useEffect, useState } from "react";
import { readGenerationDiagnostics, type GenerationDiagnostic } from "@/lib/chat-generation-diagnostics";
import { readChatRuntimeDiagnostics, type ChatRuntimeDiagnostic } from "@/lib/chat-runtime-diagnostics";

export function ChatRuntimeDiagnostics() {
    const [generation, setGeneration] = useState<ReturnType<typeof readGenerationDiagnostics> | null>(null);
    const [runtime, setRuntime] = useState<ReturnType<typeof readChatRuntimeDiagnostics> | null>(null);
    const refresh = () => { setGeneration(readGenerationDiagnostics()); setRuntime(readChatRuntimeDiagnostics()); };
    useEffect(() => { refresh(); }, []);
    return (
        <details className="g-card" onToggle={event => { if (event.currentTarget.open) refresh(); }}>
            <summary className="menu-label cursor-pointer">聊天运行诊断（仅本机）</summary>
            <p className="menu-desc leading-relaxed">仅记录运行阶段和数量，不包含聊天正文、提示词、图片内容或 API 密钥。未完成不一定代表应用崩溃，也可能是页面被关闭或进程退出。</p>
            <p className="menu-desc">旧记录 API_BEGIN 仅表示进入生成引擎。PROVIDER_REQUEST_BEGIN 表示已准备请求并调用本机 fetch，不证明服务器收到请求。预算不等于实际注入 token 数。</p>
            <p className="menu-desc">publishedCount 表示消息写入函数已返回，不确认 IndexedDB 事务提交。并发记录最多保留 8 个；未完成记录是新生成开始时的快照，独立 run 记录可继续更新。</p>
            <Record label="最近一次未完成 AI 生成" record={generation?.previous} />
            <Record label="当前/最近 AI 生成" record={generation?.current} />
            {generation?.runs.filter(r => r.runId !== generation.current?.runId).map(r =>
                <Record key={r.runId} label={`并发/最近生成（${r.source === "background" ? "后台" : "聊天室"}）`} record={r} />)}
            <Record label="最近一次未完成 Chat runtime operation" record={runtime?.previous} />
            <Record label="当前/最近 runtime operation" record={runtime?.current} />
            <button type="button" className="menu-label mt-2" onClick={refresh}>刷新诊断</button>
        </details>
    );
}

function Record({ label, record }: { label: string; record?: GenerationDiagnostic | ChatRuntimeDiagnostic | null }) {
    if (!record) return <section aria-label={label} className="mt-3 menu-desc">{label}：无记录。</section>;
    const fields: Array<[string, string | number]> = [
        ["Session ID", record.sessionId],
        ["编号", "runId" in record ? record.runId : record.operationId],
        ["开始", new Date(record.startedAt).toLocaleString()],
        ["阶段", `${"lastStage" in record ? record.lastStage : `${record.operation} / ${record.stage}`}（+${record.lastStageAt - record.startedAt} ms）`],
        ["completed", String(record.completed)],
    ];
    if ("runId" in record) {
        fields.push(["isGroup", String(record.isGroup)], ["historyCount", record.historyCount], ["rawLength", record.rawLength],
            ["draftCount", record.draftCount], ["publishedCount", record.publishedCount], ["errorName", record.errorName || "无"]);
        if (record.source) fields.push(["source", record.source]);
        if (record.errorStage) fields.push(["errorStage", record.errorStage]);
        for (const key of ["shortTermBudget", "longTermBudget", "coreMemoryBudget", "survivingHistoryCount", "survivingRecentItemCount",
            "longTermSelectedCount", "coreMemorySelectedCount", "llmMessageCount", "requestTokenEstimate", "providerRequestCount",
            "dispatchedCount", "publishItemIndex", "providerRequestStarted", "streaming", "visionPrepEnabled", "longTermRetrievalFailed", "coreMemoryRetrievalFailed"] as const) {
            if (record[key] !== undefined) fields.push([key, String(record[key])]);
        }
        for (const [stage, ms] of Object.entries(record.stageTimes || {})) fields.push([`${stage} 首次`, `+${ms} ms`]);
    } else {
        for (const [key, value] of Object.entries(record.metadata || {})) fields.push([key, String(value)]);
    }
    return <section className="mt-3 text-xs break-words select-text" aria-label={label}>
        <strong>{label}</strong>
        <dl className="mt-1 space-y-1">{fields.map(([key, value]) => <div key={key}><dt className="inline">{key}：</dt><dd className="inline">{value}</dd></div>)}</dl>
    </section>;
}
