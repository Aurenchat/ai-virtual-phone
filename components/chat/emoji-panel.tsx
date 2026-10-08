"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { loadStickerPacksForCharacters, resolveCustomStickerUrl, type StickerPack, type StickerItem } from "@/lib/custom-sticker-storage";
import { startChatRuntimeDiagnostic, markChatRuntimeDiagnostic } from "@/lib/chat-runtime-diagnostics";
import { BUILTIN_SCREEN_EFFECTS, loadBuiltinScreenEffectSettings } from "@/lib/chat-screen-effects";

// ── Emoji categories ─────────────────────────────

const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
    {
        name: "常用",
        emojis: [
            "😀", "😂", "🤣", "😊", "😍", "🥰", "😘", "😜", "🤔", "😏",
            "😅", "😭", "😤", "🥺", "😳", "🤗", "😴", "🤮", "👍", "👎",
            "👏", "🙏", "💪", "❤️", "💔", "🔥", "✨", "🎉", "😎", "🤡",
        ],
    },
    {
        name: "表情",
        emojis: [
            "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😉",
            "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😋", "😛",
            "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨",
            "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔",
            "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥵", "🥶",
            "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😟", "😕",
        ],
    },
    {
        name: "手势",
        emojis: [
            "👋", "🤚", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰",
            "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👍", "👎",
            "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏",
            "💪", "🫶", "🫂", "💅", "🖐️", "🫴", "🫳",
        ],
    },
    {
        name: "爱心",
        emojis: [
            "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💕",
            "💞", "💓", "💗", "💖", "💘", "💝", "💔", "❤️‍🔥", "💋", "🫀",
        ],
    },
    {
        name: "动物",
        emojis: [
            "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
            "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🦄", "🐝",
            "🦋", "🐌", "🐛", "🐞", "🐙", "🐠", "🐬", "🐳", "🦈", "🐊",
        ],
    },
    {
        name: "食物",
        emojis: [
            "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍑",
            "🍒", "🥝", "🍅", "🥑", "🍕", "🍔", "🍟", "🌭", "🍿", "🧁",
            "🍩", "🍪", "🎂", "🍰", "🍫", "🍬", "☕", "🍵", "🧋", "🍺",
        ],
    },
];

// ── Props ─────────────────────────────

interface EmojiPanelProps {
    onSelect: (emoji: string) => void;
    /** 点击「特效」栏的特效表情：以该文本为消息内容直接发送并播放全屏特效 */
    onEffectSend?: (text: string) => void;
}

export function EmojiPanel({ onSelect, onEffectSend }: EmojiPanelProps) {
    const [emojiCategory, setEmojiCategory] = useState(0);
    // 特效栏只显示启用中的内置特效；面板挂载时读取一次即可
    const [enabledEffects] = useState(() => {
        if (!onEffectSend) return [];
        const settings = loadBuiltinScreenEffectSettings();
        return BUILTIN_SCREEN_EFFECTS.filter(effect => settings[effect.type].enabled);
    });
    const effectCategoryIndex = EMOJI_CATEGORIES.length;
    const showEffectTab = enabledEffects.length > 0;

    return (
        <div className="h-[220px] flex flex-col">
            <div className="flex gap-0.5 px-2 py-1 overflow-x-auto shrink-0 hide-scrollbar">
                {showEffectTab && (
                    <button
                        onClick={() => setEmojiCategory(effectCategoryIndex)}
                        className="emoji-category-pill"
                        {...(emojiCategory === effectCategoryIndex ? { "data-active": "" } : {})}
                    >特效</button>
                )}
                {EMOJI_CATEGORIES.map((cat, i) => (
                    <button
                        key={i}
                        onClick={() => setEmojiCategory(i)}
                        className="emoji-category-pill"
                        {...(emojiCategory === i ? { "data-active": "" } : {})}
                    >{cat.name}</button>
                ))}
            </div>
            {emojiCategory === effectCategoryIndex && showEffectTab ? (
                <div className="flex-1 overflow-auto px-2 py-1 grid grid-cols-4 gap-1.5 content-start hide-scrollbar">
                    {enabledEffects.map(effect => (
                        <button
                            key={effect.type}
                            onClick={() => onEffectSend?.(effect.icon)}
                            className="emoji-effect-tile"
                            title={effect.name}
                        >
                            <span className="emoji-effect-tile-icon">{effect.icon}</span>
                            <span className="emoji-effect-tile-name">{effect.name}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex-1 overflow-auto px-2 py-1 grid grid-cols-8 gap-0.5 content-start hide-scrollbar">
                    {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, i) => (
                        <button
                            key={i}
                            onClick={() => onSelect(emoji)}
                            className="border-none bg-transparent ts-18 cursor-pointer p-0.5 rounded-lg flex items-center justify-center aspect-square"
                        >{emoji}</button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Sticker Panel ─────────────────────────────

const STICKER_PANEL_RESOLVE_CONCURRENCY = 2;
const STICKER_PANEL_CACHE_MAX_ENTRIES = 24;
// Approximate string budget, not heap bytes.
const STICKER_PANEL_CACHE_MAX_CHARS = 6 * 1024 * 1024;

function createPanelStickerResolver(onFirstRead: () => void) {
    const cache = new Map<string, string>();
    const pending = new Map<string, { promise: Promise<string | null>; needed: Array<() => boolean> }>();
    const queue: Array<() => void> = [];
    let chars = 0;
    let active = 0;
    let alive = true;
    let firstRead = false;
    const get = (id: string) => {
        const url = cache.get(id);
        if (url) { cache.delete(id); cache.set(id, url); }
        return url;
    };
    const put = (id: string, url: string) => {
        const old = cache.get(id);
        if (old) { chars -= old.length; cache.delete(id); }
        if (!alive || url.length > STICKER_PANEL_CACHE_MAX_CHARS) return;
        cache.set(id, url);
        chars += url.length;
        while (cache.size > STICKER_PANEL_CACHE_MAX_ENTRIES || chars > STICKER_PANEL_CACHE_MAX_CHARS) {
            const oldest = cache.keys().next().value!;
            chars -= cache.get(oldest)!.length;
            cache.delete(oldest);
        }
    };
    const drain = () => {
        while (active < STICKER_PANEL_RESOLVE_CONCURRENCY && queue.length) queue.shift()!();
    };
    return {
        get,
        resolve(id: string, needed: () => boolean): Promise<string | null> {
            const cached = get(id);
            if (cached) return Promise.resolve(cached);
            const existing = pending.get(id);
            if (existing) { existing.needed.push(needed); return existing.promise; }
            let finish!: (url: string | null) => void;
            const promise = new Promise<string | null>(resolve => { finish = resolve; });
            const job = { promise, needed: [needed] };
            pending.set(id, job);
            queue.push(() => {
                if (!alive || !job.needed.some(check => check())) {
                    pending.delete(id);
                    finish(null);
                    return;
                }
                active++;
                if (!firstRead) { firstRead = true; onFirstRead(); }
                Promise.resolve().then(() => resolveCustomStickerUrl(id)).then(url => {
                    if (url) put(id, url);
                    finish(url);
                }, () => finish(null)).finally(() => {
                    active--;
                    pending.delete(id);
                    drain();
                });
            });
            drain();
            return promise;
        },
        activate() { alive = true; },
        dispose() { alive = false; cache.clear(); chars = 0; drain(); },
    };
}

type TileObserver = { observe(node: Element, notify: (near: boolean) => void): () => void };
function StickerPanelTile({ sticker, resolver, observer, onSend }: {
    sticker: StickerItem; resolver: ReturnType<typeof createPanelStickerResolver>; observer: TileObserver;
    onSend: (name: string, url?: string) => void;
}) {
    const [near, setNear] = useState(false);
    const [resolved, setResolved] = useState<string | null>(null);
    const needed = useRef(false);
    const detach = useRef<(() => void) | undefined>(undefined);
    const tileRef = useCallback((node: HTMLButtonElement | null) => {
        detach.current?.();
        detach.current = node ? observer.observe(node, setNear) : undefined;
    }, [observer]);
    useEffect(() => {
        needed.current = near;
        if (!near || sticker.externalUrl || !sticker.assetId) { setResolved(null); return; }
        let cancelled = false;
        void resolver.resolve(sticker.assetId, () => needed.current).then(url => {
            if (!cancelled) setResolved(url);
        });
        return () => { cancelled = true; needed.current = false; };
    }, [near, sticker.assetId, sticker.externalUrl, resolver]);
    const url = sticker.externalUrl || resolved || undefined;
    return (
        <button ref={tileRef} onClick={() => onSend(sticker.name, url)} title={sticker.name}
            className="border-none bg-transparent cursor-pointer p-1 rounded-lg flex flex-col items-center justify-start gap-0.5 min-h-[62px] min-w-0 overflow-hidden">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
                {url ? <img src={url} alt={sticker.name} className="w-9 h-9 object-contain" />
                    : <span className="ts-9 text-[var(--c-text)] max-w-full truncate">{sticker.name}</span>}
            </div>
            <span className="ts-9 leading-tight text-[var(--c-text)] opacity-75 w-full text-center truncate">{sticker.name}</span>
        </button>
    );
}

interface StickerPanelProps {
    onSend: (name: string, stickerUrl?: string) => void;
    characterId?: string;
    characterIds?: string[];
    sessionId?: string;
}

export function StickerPanel({ onSend, characterId, characterIds, sessionId = "" }: StickerPanelProps) {
    const [stickerPacks, setStickerPacks] = useState<StickerPack[]>([]);
    const [activePackId, setActivePackId] = useState<string | null>(null);
    const operationId = useRef<string | undefined>(undefined);
    const [resolver] = useState(() => createPanelStickerResolver(() => {
        markChatRuntimeDiagnostic(operationId.current, "STICKER_RESOLVE_BEGIN");
    }));
    const gridRef = useRef<HTMLDivElement>(null);
    const intersectionRef = useRef<IntersectionObserver | null>(null);
    const [observer] = useState(() => {
        const tiles = new Map<Element, (near: boolean) => void>();
        return { tiles, observe(node: Element, notify: (near: boolean) => void) {
            tiles.set(node, notify);
            intersectionRef.current?.observe(node);
            return () => { intersectionRef.current?.unobserve(node); tiles.delete(node); };
        } };
    });

    useEffect(() => {
        const ids = characterIds && characterIds.length > 0 ? characterIds : characterId ? [characterId] : [];
        if (ids.length === 0) {
            setStickerPacks([]);
            setActivePackId(null);
            return;
        }
        const packs = loadStickerPacksForCharacters(ids).filter(pack => pack.stickers.length > 0);
        setStickerPacks(packs);
        setActivePackId(prev => (prev && packs.some(pack => pack.id === prev) ? prev : packs[0]?.id ?? null));
    }, [characterId, characterIds]);

    const activePack = stickerPacks.find(pack => pack.id === activePackId) ?? stickerPacks[0] ?? null;
    useEffect(() => {
        resolver.activate();
        operationId.current = startChatRuntimeDiagnostic(sessionId, "STICKER_PANEL", "STICKER_PANEL_OPEN");
        return () => {
            resolver.dispose();
            markChatRuntimeDiagnostic(operationId.current, "STICKER_PANEL_CLOSED", true);
        };
    }, [resolver, sessionId]);
    const lastPack = useRef<string | null>(null);
    useEffect(() => {
        if (!activePack) return;
        if (lastPack.current !== activePack.id) {
            markChatRuntimeDiagnostic(operationId.current, lastPack.current ? "STICKER_PACK_CHANGED" : "STICKER_PANEL_OPEN", false,
                { packCount: stickerPacks.length, activePackStickerCount: activePack.stickers.length });
            lastPack.current = activePack.id;
        }
        if (gridRef.current) gridRef.current.scrollTop = 0;
        const intersection = new IntersectionObserver(entries => {
            for (const entry of entries) observer.tiles.get(entry.target)?.(entry.isIntersecting);
        }, { root: gridRef.current, rootMargin: "100px", threshold: 0 });
        intersectionRef.current = intersection;
        observer.tiles.forEach((_notify, node) => intersection.observe(node));
        return () => { intersection.disconnect(); intersectionRef.current = null; };
        // Equivalent member metadata refreshes must not reset scrolling or write breadcrumbs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePack?.id, activePack?.stickers.length, stickerPacks.length, observer]);

    return (
        <div className="h-[220px] flex flex-col">
            {stickerPacks.length > 0 && (
                <div className="flex gap-0.5 px-2 py-1 overflow-x-auto shrink-0 hide-scrollbar">
                    {stickerPacks.map(pack => (
                        <button
                            key={pack.id}
                            onClick={() => setActivePackId(pack.id)}
                            className="emoji-category-pill"
                            {...(activePack?.id === pack.id ? { "data-active": "" } : {})}
                        >
                            {pack.name}
                        </button>
                    ))}
                </div>
            )}
            <div ref={gridRef} className="flex-1 overflow-auto p-2 grid grid-cols-5 gap-1 content-start hide-scrollbar">
                {!activePack && (
                    <div className="col-span-5 flex items-center justify-center text-[var(--c-text-muted)] ts-12 py-8">
                        暂无表情包，请在角色设置里上传或绑定。
                    </div>
                )}
                {activePack?.stickers.map(sticker => <StickerPanelTile key={`${activePack.id}:${sticker.id}`}
                    sticker={sticker} resolver={resolver} observer={observer} onSend={onSend} />)}
            </div>
        </div>
    );
}
