"use client";

import { useEffect, useState } from "react";
import { readCurrentBootAttempt, readPreviousBootAttempt, type BootAttempt } from "@/lib/boot-diagnostics";

export function BootDiagnostics() {
    const [attempts, setAttempts] = useState<{ current: BootAttempt | null; previous: BootAttempt | null } | null>(null);
    const refresh = () => setAttempts({ current: readCurrentBootAttempt(), previous: readPreviousBootAttempt() });
    useEffect(() => { refresh(); }, []);

    return (
        <details className="g-card" onToggle={event => { if (event.currentTarget.open) refresh(); }}>
            <summary className="menu-label cursor-pointer">启动诊断（仅本机）</summary>
            <p className="menu-desc leading-relaxed">记录最近一次未完成启动的阶段，不包含聊天内容。未完成不等于崩溃，也可能是中途关闭页面。</p>
            {attempts?.previous ? <Attempt label="上一次未完成启动" attempt={attempts.previous} /> : <p className="menu-desc">没有可读取的未完成启动记录。</p>}
            {attempts?.current ? <Attempt label="本次启动" attempt={attempts.current} /> : <p className="menu-desc">诊断未启用或不可用。</p>}
            <button type="button" className="menu-label mt-2" onClick={refresh}>刷新诊断</button>
        </details>
    );
}

function Attempt({ label, attempt }: { label: string; attempt: BootAttempt }) {
    return (
        <section className="mt-3 text-xs break-words select-text" aria-label={label}>
            <strong>{label}</strong>
            <dl className="mt-1 space-y-1">
                <div><dt className="inline">构建：</dt><dd className="inline">{attempt.buildId}</dd></div>
                <div><dt className="inline">启动编号：</dt><dd className="inline">{attempt.bootAttemptId}</dd></div>
                <div><dt className="inline">开始：</dt><dd className="inline">{new Date(attempt.startedAt).toLocaleString()}</dd></div>
                <div><dt className="inline">最后阶段：</dt><dd className="inline">{attempt.lastStage}（+{attempt.lastStageAt - attempt.startedAt} ms）</dd></div>
                <div><dt className="inline">未完成分支：</dt><dd className="inline">{attempt.activeStages.join(", ") || "无"}</dd></div>
                <div><dt className="inline">已到达节点：</dt><dd className="inline">{attempt.completedStages.join(", ") || "无"}</dd></div>
                <div><dt className="inline">启动完成：</dt><dd className="inline">{attempt.ready ? "是" : "否"}</dd></div>
                <div><dt className="inline">观察到页面退出：</dt><dd className="inline">{attempt.exitObserved ? "是（不代表启动完成）" : "否"}</dd></div>
            </dl>
        </section>
    );
}
