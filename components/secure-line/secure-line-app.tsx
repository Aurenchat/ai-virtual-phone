"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, Plus, Search, ShieldCheck, X } from "lucide-react";
import { ChatRoom } from "@/components/chat/chat-room";
import { ChatFallbackAvatar } from "@/components/chat/chat-fallback-avatar";
import { SessionCustomCSS } from "@/components/ui/session-custom-css";
import { loadCharacters } from "@/lib/character-storage";
import {
    CHAT_SESSION_DATA_UPDATED_EVENT,
    createOrGetSession,
    getChatMessagePreview,
    getChatSessionChannel,
    getLastVisibleSessionMessage,
    hydrateChatStorage,
    loadChatSessions,
    saveChatSessions,
    type ChatSession,
} from "@/lib/chat-storage";
import { formatChatUiTime } from "@/lib/chat-time";
import { kvGet } from "@/lib/kv-db";

// Secure Line is an alternate native chat entry, NOT a Custom App/persona.
// It intentionally uses the ordinary ChatRoom and app-wide chat CSS scheme.
export const SecureLineApp = memo(function SecureLineApp({ onClose }: { onClose: () => void }) {
    const [ready, setReady] = useState(false);
    const [active, setActive] = useState<ChatSession | null>(null);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [picker, setPicker] = useState(false);
    const [search, setSearch] = useState("");
    const [chatAppCSS, setChatAppCSS] = useState("");
    const [hideTabBar, setHideTabBar] = useState(false);

    const refresh = useCallback(() => {
        setSessions(loadChatSessions().filter(s => !s.isGroup && getChatSessionChannel(s) === "secure"));
    }, []);

    useEffect(() => {
        let mounted = true;
        void hydrateChatStorage().then(() => {
            if (!mounted) return;
            setChatAppCSS(kvGet("chat-app-custom-css") || "");
            refresh();
            setReady(true);
        });
        const onData = () => { if (mounted) refresh(); };
        const onCSS = () => { if (mounted) setChatAppCSS(kvGet("chat-app-custom-css") || ""); };
        const onHide = (event: Event) => setHideTabBar(Boolean((event as CustomEvent<boolean>).detail));
        window.addEventListener(CHAT_SESSION_DATA_UPDATED_EVENT, onData);
        window.addEventListener("chat-messages-updated", onData);
        window.addEventListener("chat-app-css-updated", onCSS);
        window.addEventListener("chat-hide-tabbar", onHide);
        return () => {
            mounted = false;
            window.removeEventListener(CHAT_SESSION_DATA_UPDATED_EVENT, onData);
            window.removeEventListener("chat-messages-updated", onData);
            window.removeEventListener("chat-app-css-updated", onCSS);
            window.removeEventListener("chat-hide-tabbar", onHide);
        };
    }, [refresh]);

    const chars = useMemo(() => loadCharacters(), [picker, ready]);
    const charById = useMemo(() => new Map(chars.map(c => [c.id, c])), [chars]);
    const secureIds = useMemo(() => new Set(sessions.map(s => s.contactId)), [sessions]);
    const query = search.trim().toLocaleLowerCase();
    const choices = useMemo(() => chars
        .filter(c => !secureIds.has(c.id) && (!query || c.name.toLocaleLowerCase().includes(query)))
        .slice(0, 120), [chars, secureIds, query]);
    const ordered = useMemo(() => [...sessions].sort((a, b) => {
        if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
    }), [sessions]);

    const openSession = (session: ChatSession) => {
        if (getChatSessionChannel(session) !== "secure") return;
        if (session.unreadCount > 0) {
            const all = loadChatSessions();
            const index = all.findIndex(s => s.id === session.id);
            if (index >= 0) {
                all[index] = { ...all[index], unreadCount: 0 };
                saveChatSessions(all);
                session = all[index];
            }
        }
        setPicker(false);
        setActive(session);
    };

    const addCharacter = (characterId: string) => {
        // No addChatContact, no private session, no additional Character.
        if (!charById.has(characterId)) return;
        openSession(createOrGetSession(characterId, "secure"));
        refresh();
    };

    if (!ready) return <div className="chat-app absolute inset-0 bg-[var(--c-page-body-bg)]" />;
    return (
        <div className="chat-app secure-line-app absolute inset-0 z-10 flex flex-col overflow-hidden bg-[var(--c-page-body-bg)]"
            data-secure-line="true" {...(active ? { "data-room-active": "" } : {})}
            {...(hideTabBar ? { "data-tabbar-hidden": "" } : {})}>
            {chatAppCSS && <SessionCustomCSS css={chatAppCSS} scope=".chat-app" />}
            <div className="chat-main-content relative flex-1 flex flex-col overflow-hidden" {...(active ? { "data-covered-by-room": "" } : {})}>
                <header className="page-header shrink-0" data-ui="header">
                    <div className="page-header-safe-area" />
                    <div className="page-header-content">
                        <button type="button" className="page-back-btn" aria-label="返回" onClick={picker ? () => { setPicker(false); setSearch(""); } : onClose}>
                            <ChevronLeft size={22} />
                        </button>
                        <span className="page-title flex items-center gap-2"><ShieldCheck size={18} />{picker ? "添加 Secure 联系人" : "Secure Line"}</span>
                        <span className="page-header-right">
                            {picker ? <button type="button" className="page-back-btn" aria-label="关闭选择" onClick={() => { setPicker(false); setSearch(""); }}><X size={20} /></button>
                                : <button type="button" className="page-back-btn" aria-label="添加联系人" onClick={() => setPicker(true)}><Plus size={22} /></button>}
                        </span>
                    </div>
                </header>
                <div className="page-body flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
                    {picker ? <>
                        <div className="mx-4 my-3 flex items-center gap-2 rounded-xl bg-[var(--c-card-bg)] px-3 py-2">
                            <Search size={17} />
                            <input className="w-full min-w-0 bg-transparent outline-none" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索现有角色" aria-label="搜索角色" />
                        </div>
                        <p className="px-5 pb-2 text-xs opacity-60">使用现有 Character，不会添加私人聊天好友。</p>
                        {choices.map(c => <button key={c.id} onClick={() => addCharacter(c.id)} className="minimal-list-item flex w-full items-center gap-3 px-5 text-left">
                            <div className="minimal-avatar-wrapper">{c.avatar ? <img src={c.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : <ChatFallbackAvatar />}</div>
                            <span className="flex-1 truncate">{c.name}</span><Plus size={18} />
                        </button>)}
                        {choices.length === 0 && <p className="px-5 py-8 text-center text-sm opacity-60">没有可添加的角色</p>}
                    </> : <>
                        <p className="px-5 py-3 text-xs opacity-60">工作安全线路 · 独立消息记录</p>
                        {ordered.map(s => {
                            const character = charById.get(s.contactId);
                            const last = getLastVisibleSessionMessage(s.id);
                            const preview = last ? (getChatMessagePreview(last) || last.content) : "新建安全会话";
                            return <button key={s.id} onClick={() => openSession(s)} className="minimal-list-item flex w-full items-center gap-3 px-5 text-left">
                                <div className="minimal-avatar-wrapper shrink-0">{character?.avatar ? <img src={character.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : <ChatFallbackAvatar />}</div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between gap-3"><span className="truncate font-medium">{s.alias || character?.name || "Unknown"}</span><span className="shrink-0 text-xs opacity-60">{formatChatUiTime(last?.createdAt || s.updatedAt)}</span></div>
                                    <div className="mt-1 flex justify-between gap-3"><span className="truncate text-sm opacity-65">{preview}</span>{s.unreadCount > 0 && <span className="shrink-0 rounded-full bg-[var(--c-icon-blue)] px-2 text-xs text-white">{s.unreadCount}</span>}</div>
                                </div>
                            </button>;
                        })}
                        {ordered.length === 0 && <p className="px-5 py-12 text-center text-sm opacity-60">暂无安全会话，点击右上角添加联系人</p>}
                    </>}
                </div>
            </div>
            {active && <div className="chat-room-layer absolute inset-0" key={active.id}>
                <ChatRoom session={active} onBack={() => { setActive(null); refresh(); }} onDeleted={() => { setActive(null); refresh(); }} />
            </div>}
        </div>
    );
});
