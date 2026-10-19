"use client";
import { useRef, useState } from "react";
import { loadChatSessions, loadChatContacts } from "@/lib/chat-storage";
import { loadCharacters } from "@/lib/character-storage";
import { loadWeixinCloudSyncConfig, setWeixinSyncPausedForLocalPrune } from "@/lib/weixin-cloud-sync";
import { previewChatHistoryPrune, executeChatHistoryPrune, type ChatHistoryPrunePreview, type HistoryPruneCloudMode } from "@/lib/chat-history-prune";

export function ChatHistoryPruneDialog({ onClose }: { onClose: () => void }) {
    const [sessions] = useState(() => [...loadChatSessions()]);
    const [sessionId, setSessionId] = useState("");
    const [preset, setPreset] = useState("100");
    const [custom, setCustom] = useState("");
    const [cloudMode, setCloudMode] = useState<HistoryPruneCloudMode>("cloud-first");
    const [localOnlyAcknowledged, setLocalOnlyAcknowledged] = useState(false);
    const [syncPaused] = useState(() => loadWeixinCloudSyncConfig().explicitlyPaused === true);
    const [syncChangeBusy, setSyncChangeBusy] = useState(false);
    const [preview, setPreview] = useState<ChatHistoryPrunePreview | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const [notice, setNotice] = useState("");
    const contacts = loadChatContacts(), characters = loadCharacters();
    const label = (id: string) => {
        const session = sessions.find(s => s.id === id);
        const contact = contacts.find(c => c.id === session?.contactId);
        return session?.alias || session?.groupName || contact?.nickname || characters.find(c => c.id === (contact?.characterId || session?.contactId))?.name || "会话";
    };
    const invalidate = () => { setPreview(null); setConfirming(false); setNotice(""); setLocalOnlyAcknowledged(false); };
    // A persisted, explicit pause must be followed by a full reload so
    // in-flight background pulls in the old JS instance cannot run during prune.
    const changeSyncPause = async (paused: boolean) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setSyncChangeBusy(true);
        setNotice("");
        try {
            await setWeixinSyncPausedForLocalPrune(paused);
            window.location.reload();
        } catch (error) {
            setNotice("同步设置未确认保存，尚未允许裁剪：" + (error instanceof Error ? error.message : String(error)));
            busyRef.current = false;
            setSyncChangeBusy(false);
        }
    };
    const run = async (execute: boolean) => {
        if (busyRef.current) return;
        busyRef.current = true; setBusy(true); setNotice("");
        try {
            if (execute && preview) {
                if (cloudMode === "local-only" && !localOnlyAcknowledged) throw new Error("请先确认仅本地裁剪的风险");
                const result = await executeChatHistoryPrune(preview, {
                    cloudMode, confirmedLocalOnlyRisk: cloudMode === "local-only" && localOnlyAcknowledged,
                });
                setNotice(result.warning ? "已提交删除 " + result.deleted + " 条。" + result.warning : "已确认保存：删除 " + result.deleted + " 条消息。");
                setPreview(null); setConfirming(false); setLocalOnlyAcknowledged(false);
            } else {
                setPreview(await previewChatHistoryPrune(sessionId, Number(preset === "custom" ? custom : preset)));
            }
        } catch (error) {
            setNotice((execute ? "未确认删除成功：" : "预检未通过：") + (error instanceof Error ? error.message : String(error)));
            setPreview(null); setConfirming(false);
        } finally { busyRef.current = false; setBusy(false); }
    };
    return <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="裁剪历史" aria-busy={busy}>
        <div className="w-full max-w-md max-h-[85dvh] overflow-auto rounded-2xl p-5" style={{ backgroundColor: "#ffffff", color: "#18181b", boxShadow: "0 16px 50px rgba(0,0,0,.3)", border: "1px solid #e4e4e7" }} onKeyDown={e => { if (e.key === "Escape" && !busyRef.current) onClose(); }}>
            <h2 className="text-lg font-bold mb-3">裁剪历史</h2>
            <p className="text-sm leading-6 mb-4 text-zinc-600">按实际消息记录计数，文字、图片、语音、表情包各占一条。仅处理所选会话的线上消息；线下记录不计入。</p>
            <fieldset disabled={busy || confirming} className="flex flex-col gap-3">
                <label>指定会话<select className="mt-1 block w-full rounded-xl p-3 text-sm" style={{ backgroundColor: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1" }} value={sessionId} onChange={e => { setSessionId(e.target.value); invalidate(); }}><option value="">请选择会话</option>{sessions.map(s => <option key={s.id} value={s.id}>{label(s.id)} · {s.id}</option>)}</select></label>
                <label>保留最新<select className="mt-1 block w-full rounded-xl p-3 text-sm" style={{ backgroundColor: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1" }} value={preset} onChange={e => { setPreset(e.target.value); invalidate(); }}>{[50,100,200,500,1000].map(n => <option key={n} value={n}>{n} 条</option>)}<option value="custom">自定义</option></select></label>
                {preset === "custom" && <label>自定义条数<input className="mt-1 block w-full rounded-xl p-3 text-sm" style={{ backgroundColor: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1" }} type="number" min="1" step="1" value={custom} onChange={e => { setCustom(e.target.value); invalidate(); }} /></label>}
                <label>云端处理<select className="mt-1 block w-full rounded-xl p-3 text-sm" style={{ backgroundColor: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1" }} value={cloudMode} onChange={e => { setCloudMode(e.target.value as HistoryPruneCloudMode); invalidate(); }}>
                    <option value="cloud-first">云端和本地同步删除（默认）</option>
                    <option value="local-only">仅删除本地历史（云端保留）</option>
                </select></label>
                {cloudMode === "local-only" && <div className="rounded-xl p-3 text-xs leading-5" style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af" }}>
                    <p>{syncPaused ? "本机微信消息同步已明确暂停。" : "如果旧云助手曾部署过，即使云端轮询关闭，本机同步仍可能自动开启。"}请先退出其他 Float 页面或窗口，再通过下面的按钮明确暂停本机同步。</p>
                    <button type="button" disabled={busy || syncChangeBusy} onClick={() => void changeSyncPause(!syncPaused)} className="mt-2 rounded-lg px-3 py-2 font-semibold" style={{ backgroundColor: "#dbeafe", color: "#1d4ed8", border: "1px solid #93c5fd" }}>
                        {syncPaused ? "恢复本机微信同步并重载" : "暂停本机微信同步并重载"}
                    </button>
                    <p className="mt-2">只暂停当前客户端，不关闭已部署在 Supabase 的云助手。重载后重新选择会话、预检和确认。</p>
                </div>}
                {cloudMode === "local-only" && <label className="rounded-xl p-3 text-xs leading-5" style={{ backgroundColor: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa" }}>
                    <span>仅本地裁剪不会删除云端消息或更新旧微信运行包。重新开启同步、导入云端数据时，旧记录可能再次出现。仅在微信同步和 Bot 已停用时允许使用。</span>
                    <span className="mt-2 flex items-start gap-2"><input type="checkbox" checked={localOnlyAcknowledged} onChange={e => setLocalOnlyAcknowledged(e.target.checked)} />我理解云端仍保留历史，且已确认完整备份可恢复。</span>
                </label>}
                <button type="button" disabled={!sessionId} onClick={() => void run(false)} className="rounded-xl px-4 py-3 font-semibold" style={{ backgroundColor: sessionId ? "#2563eb" : "#94a3b8", color: "#ffffff" }}>预检</button>
            </fieldset>
            {preview && <div className="my-4 rounded-xl p-3 text-sm leading-7" style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" }} aria-live="polite"><p>{label(preview.sessionId)} · {preview.sessionId}</p><p>删除前总数：{preview.total}</p><p>预计删除：{preview.remove}</p><p>预计保留：{preview.retain}</p>
                {confirming ? <><p className="my-2">确认永久删除此会话最旧的 {preview.remove} 条消息？此操作不可撤销。{cloudMode === "local-only" ? "本次仅修改本机历史，云端旧记录仍会保留。" : ""}</p><button type="button" disabled={busy || (cloudMode === "local-only" && !localOnlyAcknowledged)} onClick={() => void run(true)} className="rounded-xl px-4 py-2 font-semibold" style={{ backgroundColor: "#b91c1c", color: "#fff" }}>确认删除</button><button type="button" disabled={busy} className="ml-3 rounded-xl px-4 py-2" style={{ backgroundColor: "#e4e4e7", color: "#18181b" }} onClick={() => setConfirming(false)}>返回</button></> : <button type="button" disabled={busy || !preview.remove || (cloudMode === "local-only" && !localOnlyAcknowledged)} onClick={() => setConfirming(true)} className="mt-2 rounded-xl px-4 py-2 font-semibold" style={{ backgroundColor: "#2563eb", color: "#fff" }}>继续裁剪</button>}
            </div>}
            {busy && <p role="status" className="my-3">正在核对或处理，请勿关闭应用或切换页面…</p>}
            {notice && <p role="status" className="my-3 rounded-lg p-3 text-sm leading-6" style={{ backgroundColor: "#fef2f2", color: "#991b1b", overflowWrap: "anywhere" }}>{notice}</p>}
            <button type="button" className="mt-4 w-full rounded-xl px-4 py-3 font-medium" style={{ backgroundColor: "#f4f4f5", color: "#27272a", border: "1px solid #d4d4d8" }} disabled={busy} onClick={onClose}>关闭</button>
        </div>
    </div>;
}
