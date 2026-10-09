"use client";
import { useState } from "react";
import { clearCrashDiagnostics, crashDiagnosticsReport, readCrashDiagnostics, setCrashDiagnosticsEnabled, type CrashSession } from "@/lib/crash-diagnostics";

const evidenceLabels = {
    UNOBSERVED_FOREGROUND_END: "推测：疑似前台异常中断（未观察到 pagehide）",
    PAGEHIDE_OBSERVED: "事实：观察到 pagehide；不证明安全退出",
    BACKGROUND_OR_SUSPENDED: "事实：最后记录在后台；可能暂停，无法确认终止原因",
    UNKNOWN: "无法判断：记录过旧、时钟变化或证据不足",
};
export function CrashDiagnostics() {
    const [snapshot, setSnapshot] = useState(readCrashDiagnostics);
    const [report, setReport] = useState("");
    const [status, setStatus] = useState("");
    const refresh = () => setSnapshot(readCrashDiagnostics());
    async function copy() {
        const text = crashDiagnosticsReport();
        try {
            if (!navigator.clipboard?.writeText) throw new Error("Unavailable");
            await navigator.clipboard.writeText(text);
            setStatus("已复制脱敏报告");
        } catch { setReport(text); setStatus("请从下方只读文本框选择并复制"); }
    }
    function download() {
        let url: string | undefined;
        try {
            url = URL.createObjectURL(new Blob([crashDiagnosticsReport()], { type: "application/json" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = "float-crash-diagnostics-" + Date.now() + ".json";
            document.body.appendChild(a);
            try { a.click(); } finally { a.remove(); }
            setStatus("已请求导出；请确认文件已保存");
        } catch { setReport(crashDiagnosticsReport()); setStatus("无法下载，请复制下方报告"); }
        finally { if (url) { const ownedUrl = url; window.setTimeout(() => URL.revokeObjectURL(ownedUrl), 1000); } }
    }
    return <details className="g-card" onToggle={e => { if (e.currentTarget.open) refresh(); }}>
        <summary className="menu-label cursor-pointer">闪退诊断（仅本机 · P0）</summary>
        <p className="menu-desc">仅记录页面事件、数量和生成阶段快照，不包含正文、角色名、图片、URL、错误文本或密钥。最后记录时间不是崩溃时间；系统终止原因始终 unknown，不能确认 Jetsam、OOM 或 GPU 故障。</p>
        <p className="menu-desc">无心跳；超过 30 分钟未记录或时钟回退时无法判断。每个 document 最多同步记录 8 次 JS 异常；隐藏/pagehide 不证明安全退出。禁用后保留旧记录，重新启用不补录禁用期间的生成。</p>
        <label className="menu-label"><input type="checkbox" checked={snapshot.enabled} onChange={e => { setCrashDiagnosticsEnabled(e.target.checked); refresh(); }} /> 启用本机诊断</label>
        <Session label="本次 document（事实）" value={snapshot.current} />
        <Session label="上一次 document" value={snapshot.history.at(-1) ?? null} />
        <Session label="最近异常嫌疑（独立保留，推测）" value={snapshot.suspect} />
        <details><summary className="menu-label">最近归档（{snapshot.history.length} / 8）</summary>
            {snapshot.history.map(r => <Session key={r.documentId} label="归档 document" value={r} />)}
        </details>
        <div className="flex flex-wrap gap-3 mt-2">
            <button type="button" onClick={refresh}>刷新</button>
            <button type="button" onClick={() => void copy()}>复制脱敏报告</button>
            <button type="button" onClick={download}>导出 JSON</button>
            <button type="button" onClick={() => { clearCrashDiagnostics(); setReport(""); setStatus("仅清除了本 P0 诊断记录"); refresh(); }}>清除本诊断记录</button>
        </div>
        {status && <p className="menu-desc" role="status">{status}</p>}
        {report && <textarea aria-label="脱敏报告（只读）" readOnly rows={12} value={report} onFocus={e => e.currentTarget.select()} className="w-full" />}
    </details>;
}
function Session({ label, value: r }: { label: string; value: CrashSession | null }) {
    if (!r) return <p className="menu-desc">{label}：无可用记录</p>;
    const date = (t: number) => new Date(t).toLocaleString() + " / " + new Date(t).toISOString();
    const runs = r.generationSnapshots;
    return <section className="menu-desc mt-3 break-all">
        <strong>{label}</strong>
        <p>{r.evidence ? evidenceLabels[r.evidence] : "事实：当前 document，尚未分类"}</p>
        <p>documentId：{r.documentId} · buildId：{r.buildId}</p>
        <p>开始：{date(r.startedAt)}</p><p>最后成功记录：{date(r.lastRecordedAt)}（非死亡时间）</p>
        <p>App：{r.app} · visibility：{r.visibility} · lastActivity：{r.lastActivity ?? "无"}</p>
        <p>pagehideObserved：{String(r.pagehideObserved)} · persisted：{String(r.pagehidePersisted ?? "未记录")} · BFCache 恢复：{String(r.pageshowFromBFCache ?? false)}</p>
        <p>活跃生成：{r.activeGenerationRunIds.length}（前台 {runs.filter(g => g.source === "chatroom").length} / 后台 {runs.filter(g => g.source === "background").length}；其余来源未取得）</p>
        {runs.map(g => <p key={g.runId}>runId：{g.runId} · {g.status} · {g.source ?? "unknown"} · {g.lastStage ?? "not_available"} · history/draft/published：{g.historyCount ?? "?"}/{g.draftCount ?? "?"}/{g.publishedCount ?? "?"} · completed：{String(g.completed ?? "未取得")}</p>)}
        <p>画布（事实，relations 为候选关系线数）：{r.canvas ? JSON.stringify(r.canvas) : "未记录"}</p>
        <p>JS 异常（仅类型，最多 8 次）：{r.jsErrors ? JSON.stringify(r.jsErrors) : "无记录"}</p>
        <p>观测曾关闭：{String(r.observationGap ?? false)} · systemTerminationReason：unknown</p>
    </section>;
}
