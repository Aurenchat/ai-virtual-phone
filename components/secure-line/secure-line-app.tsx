"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, MoreHorizontal, Plus, Search, ShieldCheck, X } from "lucide-react";
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
import { kvGet, kvRemove, kvSet, registerKvMigration } from "@/lib/kv-db";

const SECURE_SHELL_CSS_KEY = "secure-line-shell-custom-css-v1";
registerKvMigration(SECURE_SHELL_CSS_KEY);

// One Character/UserIdentity/chat-engine/ChatRoom. Only the outer list/picker
// and their optional CSS are Secure Line-specific.
export const SecureLineApp = memo(function SecureLineApp({ onClose }: { onClose: () => void }) {
    const [ready, setReady] = useState(false);
    const [active, setActive] = useState<ChatSession | null>(null);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [picker, setPicker] = useState(false);
    const [search, setSearch] = useState("");
    const [listSearch, setListSearch] = useState("");
    const [chatAppCSS, setChatAppCSS] = useState("");
    const [shellCSS, setShellCSS] = useState("");
    const [cssDraft, setCssDraft] = useState("");
    const [cssEditorOpen, setCssEditorOpen] = useState(false);
    const [hideTabBar, setHideTabBar] = useState(false);

    const refresh = useCallback(() => {
        setSessions(loadChatSessions().filter(s => !s.isGroup && getChatSessionChannel(s) === "secure"));
    }, []);

    useEffect(() => {
        let mounted = true;
        void hydrateChatStorage().then(() => {
            if (!mounted) return;
            setChatAppCSS(kvGet("chat-app-custom-css") || "");
            setShellCSS(kvGet(SECURE_SHELL_CSS_KEY) || "");
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
        .filter(c => !secureIds.has(c.id) && (!query || c.name.toLocaleLowerCase().includes(query) || (c.wechatID || "").toLocaleLowerCase().includes(query)))
        .slice(0, 120), [chars, secureIds, query]);
    const listQuery = listSearch.trim().toLocaleLowerCase();
    const ordered = useMemo(() => [...sessions]
        .filter(s => !listQuery || (s.alias || charById.get(s.contactId)?.name || "").toLocaleLowerCase().includes(listQuery))
        .sort((a, b) => {
            if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
            return b.updatedAt.localeCompare(a.updatedAt);
        }), [sessions, charById, listQuery]);

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

    const closePicker = () => { setPicker(false); setSearch(""); };
    const openCssEditor = () => { setCssDraft(shellCSS); setCssEditorOpen(true); };
    const applyCss = () => {
        const next = cssDraft.trim();
        if (next) kvSet(SECURE_SHELL_CSS_KEY, next);
        else kvRemove(SECURE_SHELL_CSS_KEY);
        setShellCSS(next);
        setCssEditorOpen(false);
    };
    const resetCss = () => {
        kvRemove(SECURE_SHELL_CSS_KEY);
        setShellCSS("");
        setCssDraft("");
        setCssEditorOpen(false);
    };

    if (!ready) return <div className="chat-app absolute inset-0 bg-[var(--c-page-body-bg)]" />;
    return (
        <div className="chat-app secure-line-app absolute inset-0 z-10 flex flex-col overflow-hidden bg-[var(--c-page-body-bg)]"
            data-secure-line="true" {...(active ? { "data-room-active": "" } : {})}
            {...(hideTabBar ? { "data-tabbar-hidden": "" } : {})}>
            {chatAppCSS && <SessionCustomCSS css={chatAppCSS} scope=".chat-app" />}
            {/* Apply only to the list/picker subtree: never to sibling ChatRoom. */}
            {shellCSS && <SessionCustomCSS css={shellCSS} scope=".secure-line-shell" />}
            <div className="chat-main-content secure-line-shell relative flex-1 flex flex-col overflow-hidden" {...(active ? { "data-covered-by-room": "" } : {})}>
                <header className="page-header shrink-0" data-ui="header">
                    <div className="page-header-safe-area" />
                    <div className="page-header-content" style={{ gridTemplateColumns: picker ? "40px minmax(0,1fr) 40px" : "40px minmax(0,1fr) 84px" }}>
                        <button type="button" className="page-back-btn" aria-label="返回" onClick={picker ? closePicker : onClose}>
                            <ChevronLeft size={22} />
                        </button>
                        <span className="page-title flex items-center justify-center gap-2 min-w-0 whitespace-nowrap"><ShieldCheck size={18} className="shrink-0" />{picker ? "添加 Secure 联系人" : "Secure Line"}</span>
                        <span className="page-header-right flex items-center gap-1">
                            {picker ? <button type="button" className="page-back-btn" aria-label="关闭选择" onClick={closePicker}><X size={20} /></button>
                                : <>
                                    <button type="button" className="page-back-btn" aria-label="Secure Line 外观 CSS" onClick={openCssEditor}><MoreHorizontal size={21} /></button>
                                    <button type="button" className="page-back-btn" aria-label="添加联系人" onClick={() => setPicker(true)}><Plus size={22} /></button>
                                </>}
                        </span>
                    </div>
                </header>
                <div className="page-body flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
                    {picker ? <>
                        <div className="px-5 pt-5 pb-3">
                            <h2 className="ts-28 font-bold text-[var(--c-text-title)] mb-4 mt-2">Contacts</h2>
                            <div className="chat-search-bar">
                                <Search size={18} className="text-[var(--c-icon)] shrink-0" />
                                <input className="chat-search-input ts-15 w-full min-w-0" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search characters..." aria-label="搜索角色" />
                            </div>
                            <p className="ts-12 text-[var(--c-icon)] mt-3">使用现有 Character，不会添加私人聊天好友。</p>
                        </div>
                        <div className="px-5 pt-2 flex flex-col">
                            {choices.map(c => <button key={c.id} type="button" onClick={() => addCharacter(c.id)} className="minimal-list-item text-left">
                                <div className="minimal-avatar-wrapper overflow-hidden">
                                    {c.avatar ? <img src={c.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : <ChatFallbackAvatar name={c.name} />}
                                </div>
                                <div className="flex-1 min-w-0 h-[48px] flex flex-col justify-center gap-1">
                                    <span className="ts-16 font-medium text-[var(--c-text-title)] truncate">{c.name}</span>
                                    <span className="ts-13 text-[var(--c-icon)] truncate">{c.wechatID?.trim() || "Secure Line 联系人"}</span>
                                </div>
                                <Plus size={20} className="text-[var(--c-icon-active)] shrink-0" />
                            </button>)}
                            {choices.length === 0 && <p className="py-10 text-center ts-14 text-[var(--c-icon)]">没有可添加的角色</p>}
                        </div>
                    </> : <>
                        <div className="px-5 pt-5 pb-3">
                            <h2 className="ts-28 font-bold text-[var(--c-text-title)] mb-4 mt-2">Chats</h2>
                            <div className="chat-search-bar">
                                <Search size={18} className="text-[var(--c-icon)] shrink-0" />
                                <input className="chat-search-input ts-15 w-full min-w-0" value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Search secure chats..." aria-label="搜索 Secure 会话" />
                            </div>
                            <p className="ts-12 text-[var(--c-icon)] mt-3">工作安全线路 · 独立消息记录</p>
                        </div>
                        <div className="px-5 pt-2 flex flex-col">
                            {ordered.map(s => {
                                const character = charById.get(s.contactId);
                                const last = getLastVisibleSessionMessage(s.id);
                                const preview = last ? (getChatMessagePreview(last) || last.content) : "新建安全会话";
                                return <button key={s.id} type="button" onClick={() => openSession(s)} className={`minimal-list-item text-left${s.isPinned ? " chat-pinned" : ""}`}>
                                    <div className="minimal-avatar-wrapper overflow-hidden">
                                        {character?.avatar ? <img src={character.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : <ChatFallbackAvatar name={s.alias || character?.name || "?"} />}
                                        <span className="minimal-online-dot" />
                                    </div>
                                    <div className="flex-1 min-w-0 h-[48px] flex flex-col justify-center gap-1">
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="ts-16 font-medium text-[var(--c-text-title)] truncate">{s.alias || character?.name || "Unknown"}</span>
                                            <span className="ts-12 text-[var(--c-icon)] font-medium shrink-0">{formatChatUiTime(last?.createdAt || s.updatedAt)}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="ts-13 text-[var(--c-text)] opacity-80 truncate font-normal">{preview}</span>
                                            {s.unreadCount > 0 && <span className="minimal-unread-count shrink-0">{s.unreadCount}</span>}
                                        </div>
                                    </div>
                                </button>;
                            })}
                            {ordered.length === 0 && <p className="py-12 text-center ts-14 text-[var(--c-icon)]">{listSearch ? "没有匹配的安全会话" : "暂无安全会话，点击右上角添加联系人"}</p>}
                        </div>
                    </>}
                </div>
            </div>
            {cssEditorOpen && !active && <div className="absolute inset-0 z-40 flex flex-col bg-[var(--c-page-body-bg)]" role="dialog" aria-modal="true" aria-label="Secure Line 外观 CSS 编辑">
                <header className="page-header shrink-0">
                    <div className="page-header-safe-area" />
                    <div className="page-header-content">
                        <button type="button" className="page-back-btn" onClick={() => setCssEditorOpen(false)} aria-label="返回"><ChevronLeft size={22} /></button>
                        <span className="page-title">外观 CSS</span>
                        <span className="page-header-right"><button type="button" className="page-back-btn" onClick={() => setCssEditorOpen(false)} aria-label="关闭"><X size={20} /></button></span>
                    </div>
                </header>
                <div className="page-body flex-1 overflow-auto px-5 py-5 flex flex-col gap-4">
                    <p className="ts-13 text-[var(--c-icon)]">仅作用于 Secure Line 会话列表与添加联系人页，不修改聊天气泡或 iMessage 的 session CSS。</p>
                    <textarea aria-label="Secure Line 壳层 CSS" spellCheck={false} value={cssDraft} onChange={e => setCssDraft(e.target.value)}
                        className="min-h-[240px] flex-1 resize-none rounded-xl border border-[var(--c-card-border)] bg-[var(--c-input)] p-4 font-mono ts-13 text-[var(--c-text-title)] outline-none"
                        placeholder={"/* 例：修改列表头像大小 */\n.minimal-avatar-wrapper { width: 52px; height: 52px; }"} />
                    <div className="flex gap-3 pb-3">
                        <button type="button" className="ui-btn ui-btn-ghost ui-btn-bordered-ghost flex-1" onClick={resetCss}>恢复默认</button>
                        <button type="button" className="ui-btn ui-btn-success flex-1" onClick={applyCss}>保存并应用</button>
                    </div>
                </div>
            </div>}
            {active && <div className="chat-room-layer absolute inset-0" key={active.id}>
                <ChatRoom session={active} onBack={() => { setActive(null); refresh(); }} onDeleted={() => { setActive(null); refresh(); }} />
            </div>}
        </div>
    );
});
