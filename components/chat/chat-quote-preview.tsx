"use client";
import { useContext, useState, useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import type { ChatMessage } from "@/lib/chat-storage";
import { readChatQuote, type ChatQuoteSnapshot } from "@/lib/chat-quote";
import { ImessagePresentation } from "./imessage-presentation";
import { isMediaStoreRef, loadMediaObjectUrl } from "@/lib/media-cache-storage";
import { chatDb } from "@/lib/chat-db";
import { liveQuery } from "dexie";
import { createChatQuote } from "@/lib/chat-quote";
import { quoteImageCaption, quoteVoiceTime, readQuoteDisplayEcho } from "./chat-quote-presentation";

/** Key-scoped, read-only source projection. Updates after image generation;
 * retains no full source/media object and never changes the saved snapshot. */
function useQuoteSource(messageId: string | undefined, sessionId: string) {
    const [state, setState] = useState<{ id?: string; sessionId: string; quote?: ChatQuoteSnapshot; imageUrl?: string; seconds?: number; estimated?: boolean }>({ sessionId });
    useEffect(() => {
        if (!messageId) return;
        const query = liveQuery(async () => {
            const source = await chatDb.messages.get(messageId);
            if (!source || source.sessionId !== sessionId || source.isRetracted) return { id: messageId, sessionId };
            const quote = createChatQuote(source), time = quoteVoiceTime(source);
            const url = quote.kind === "image" ? source.mediaData?.imageGenerationMediaRef || source.mediaUrl || "" : "";
            return { id: messageId, sessionId, quote, imageUrl: /^(?:data:image\/|blob:|https?:\/\/|media-store:\/\/)/i.test(url) ? url : undefined, ...time };
        }).subscribe({ next: setState, error: () => setState({ id: messageId, sessionId }) });
        return () => query.unsubscribe();
    }, [messageId, sessionId]);
    return state.id === messageId && state.sessionId === sessionId ? state : undefined;
}

/** Resolves only mounted quote thumbnails and revokes temporary URLs on cleanup. */
function QuoteThumbnail({ refUrl, cover = false }: { refUrl?: string; cover?: boolean }) {
    const [resolution, setResolution] = useState({ refUrl, url: "" });
    const [broken, setBroken] = useState(false);
    useEffect(() => {
        setBroken(false);
        if (!refUrl) { setResolution({ refUrl, url: "" }); return; }
        if (!isMediaStoreRef(refUrl)) { setResolution({ refUrl, url: refUrl }); return; }
        const controller = new AbortController();
        let objectUrl = "";
        setResolution({ refUrl, url: "" });
        loadMediaObjectUrl(refUrl, controller.signal).then(url => {
            if (controller.signal.aborted) { if (url) URL.revokeObjectURL(url); return; }
            objectUrl = url || "";
            setResolution({ refUrl, url: objectUrl });
        }).catch(() => { if (!controller.signal.aborted) setBroken(true); });
        return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [refUrl]);
    const resolved = resolution.refUrl === refUrl ? resolution.url : "";
    if (!resolved || broken) return cover ? <span className="fq-cover fq-cover-fallback" aria-label="封面不可用">♪</span> : <span className="fq-image-fallback">图片</span>;
    return <img className={cover ? "fq-cover" : "fq-thumb"} src={resolved} alt={cover ? "" : "引用图片"} loading="lazy" decoding="async" onError={() => setBroken(true)} />;
}

function compactTime(seconds?: number) {
    if (!seconds) return "";
    const count = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(count / 60)).padStart(2, "0")}:${String(count % 60).padStart(2, "0")}`;
}

function QuoteCard({ quote, imageUrl, estimated }: { quote: ChatQuoteSnapshot; imageUrl?: string; estimated?: boolean }) {
    if (quote.kind === "image") return imageUrl || quote.imageRef
        ? <span className="fq-image"><QuoteThumbnail refUrl={imageUrl || quote.imageRef} /></span>
        : <span className="fq-image-text"><span>{quoteImageCaption(quote.preview)}</span></span>;
    if (quote.kind === "voice") return <span className="fq-voice" aria-label={quote.summary}>
        <span className="fq-wave" aria-hidden="true">{[12,22,17,27,14,19,12,25,14,19,11,22,14,17,11].map((height, index) => <i key={index} style={{ height }} />)}</span>
        <span className="fq-duration" aria-label={estimated ? "估算时长" : "时长"}>{compactTime(quote.duration) || "--:--"}</span>
    </span>;
    if (quote.kind === "music") return <span className="fq-music">
        <QuoteThumbnail refUrl={quote.coverUrl} cover />
        <span className="fq-music-detail"><strong>{quote.preview}</strong><small>{quote.artist || "未知歌手"}</small></span>
    </span>;
    if (quote.kind === "text") {
        const echo = readQuoteDisplayEcho(quote.preview);
        return <span className="fq-text">{echo ? echo.body || "引用消息" : quote.preview}</span>;
    }
    return <span className="fq-special"><span className="fq-special-title">{quote.preview}</span><small>{quote.kind === "payment" ? "支付消息" : quote.kind === "location" ? "位置" : "消息卡片"}</small></span>;
}

// The reply uses the installed Native Day perf.6 contour (including its distinct
// incoming tail). Preview and reply share this exact code path: the SOURCE role
// selects the preview tail, the REPLY role selects the reply tail. No mini-tail
// coordinates or mirrored incoming substitutes for the outgoing geometry.
function bubbleContour(w: number, h: number, incoming: boolean, tail: boolean) {
    const n = (v: number) => Math.round(v * 1000) / 1000;
    const r = Math.min(24, h / 2, w / 2);
    const a = r < 24 ? r * .447715 : 8.4;
    const y = (v: number) => n(h + v), root = Math.min(24, w / 2);
    let d = `M${r} 0H${n(w-r)}C${n(w-a)} 0 ${n(w)} ${a} ${n(w)} ${r}V${n(h-r)}C${n(w)} ${n(h-a)} ${n(w-a)} ${n(h)} ${n(w-r)} ${n(h)}H${r}C${a} ${n(h)} 0 ${n(h-a)} 0 ${n(h-r)}V${r}C0 ${a} ${a} 0 ${r} 0Z`;
    if (!tail) return d;
    if (incoming) {
        d = `M${r} 0H${n(w-r)}C${n(w-a)} 0 ${n(w)} ${a} ${n(w)} ${r}V${n(h-r)}C${n(w)} ${n(h-a)} ${n(w-a)} ${n(h)} ${n(w-r)} ${n(h)}H${root}`;
        return d + `Q${n(root-1.2)} ${y(0)} ${n(root-2.4)} ${y(.7)}L13.2 ${y(6)}C10.5 ${y(7.6)} 7.5 ${y(8.3)} 9 ${y(5.5)}C11.7 ${y(1.7)} 12 ${y(-1.8)} 8 ${y(-5)}C2.2 ${y(-9.2)} 0 ${y(-12.5)} 0 ${n(h-r)}V${r}C0 ${a} ${a} 0 ${r} 0Z`;
    }
    const x = (v: number) => n(w - v);
    return d + `M${x(3)} ${y(-13)}C${x(3.8)} ${y(-8.8)} ${x(5.8)} ${y(-7)} ${x(8.5)} ${y(-4.8)}C${x(12.4)} ${y(-1.8)} ${x(12)} ${y(1.5)} ${x(9.3)} ${y(5.5)}C${x(7.7)} ${y(8.6)} ${x(11.1)} ${y(7.1)} ${x(13.5)} ${y(5.8)}L${x(root-2.5)} ${y(.6)}Q${x(root-1.4)} ${y(0)} ${x(root)} ${y(0)}L${x(root)} ${y(-13)}Z`;
}

/** Layout-only SVGs: no state updates, media playback, or scroll writes. */
function useQuoteGeometry(root: RefObject<HTMLDivElement | null>, enabled: boolean, replyRole: string, sourceRole?: string) {
    useLayoutEffect(() => {
        const el = root.current;
        if (!el) return;
        const preview = el.querySelector<HTMLElement>(".fq-preview")!;
        const body = el.querySelector<HTMLElement>(".fq-body")!;
        const connector = el.querySelector<SVGSVGElement>(".fq-connector");
        const outer = el.parentElement!, row = outer.closest<HTMLElement>(".chat-msg-wrapper");
        const owned = new Map<HTMLElement, Map<string, string>>();
        const set = (node: HTMLElement, name: string, value: string) => {
            if (!owned.has(node)) owned.set(node, new Map());
            const props = owned.get(node)!;
            if (!props.has(name)) props.set(name, node.style.getPropertyValue(name));
            if (node.style.getPropertyValue(name) !== value) node.style.setProperty(name, value);
        };
        const offset = (node: HTMLElement, ancestor: HTMLElement) => {
            let left = 0, top = 0;
            let p: HTMLElement | null = node;
            for (; p && p !== ancestor; p = p.offsetParent as HTMLElement | null) { left += p.offsetLeft; top += p.offsetTop; }
            if (p === ancestor) return { left, top };
            const box = node.getBoundingClientRect(), parent = ancestor.getBoundingClientRect();
            return { left: box.left - parent.left, top: box.top - parent.top };
        };
        const update = () => {
            const anchor = offset(body, outer);
            set(outer, "--fq-body-top", `${anchor.top}px`); set(outer, "--fq-body-left", `${anchor.left}px`);
            set(outer, "--fq-body-width", `${body.offsetWidth}px`);
            if (row && enabled) {
                const point = offset(body, row);
                set(row, "--fq-heart-left", `${point.left + body.offsetWidth + 6}px`);
                set(row, "--fq-heart-top", `${point.top + body.offsetHeight - 22}px`);
            }
            if (!enabled || !connector) return;
            let previewScale = 1;
            for (const [box, mini] of [[preview, true], [body, false]] as const) {
                const style = getComputedStyle(box), w = parseFloat(style.width), h = parseFloat(style.height);
                if (!w || !h) continue;
                const svg = box.querySelector<SVGSVGElement>(":scope > .fq-outline")!;
                svg.setAttribute("viewBox", `0 0 ${w} ${h + 8}`);
                svg.setAttribute("height", String(h + 8));
                // Uniformly shrink the accepted short-capsule geometry. Keeping
                // a 24px tail root on a 15px corner caused the short-text kink.
                const scale = mini ? Math.min(1, h / 42.65625) : 1;
                if (mini) previewScale = scale;
                const d = bubbleContour(w / scale, h / scale, (mini ? sourceRole : replyRole) !== "user", mini || !!el.parentElement?.hasAttribute("data-im-last"));
                svg.querySelectorAll("path").forEach(path => { path.setAttribute("d", d); path.setAttribute("transform", `scale(${scale})`); });
                if (mini) set(preview, "--fq-image-shape", `path("${d}")`);
            }
            const leftSource = sourceRole !== "user", outgoing = replyRole !== "assistant";
            const sameEdge = leftSource === outgoing;
            const x = Math.min(24 * previewScale, preview.offsetWidth / 2) - 2 * previewScale, tip = x + 28;
            const start = sameEdge ? preview.offsetHeight + 8 * previewScale + 4 : preview.offsetHeight / 2;
            const end = body.offsetTop + Math.min(22, body.offsetHeight / 2);
            const radius = Math.min(22, (end - start) / (sameEdge ? 1 : 2));
            const d = sameEdge
                ? `M${x} ${start}V${end-radius}Q${x} ${end} ${x+radius} ${end}H${tip}`
                : `M${tip} ${start}H${x+radius}Q${x} ${start} ${x} ${start+radius}V${end-radius}Q${x} ${end} ${x+radius} ${end}H${tip}`;
            connector.setAttribute("viewBox", `0 0 56 ${el.offsetHeight}`);
            connector.firstElementChild!.setAttribute("d", d);
        };
        update();
        const resize = new ResizeObserver(update);
        resize.observe(el); resize.observe(preview); resize.observe(body);
        // Group membership is owned by the existing theme bridge.
        const grouping = new MutationObserver(update);
        if (el.parentElement) grouping.observe(el.parentElement, { attributes: true, attributeFilter: ["data-im-last"] });
        return () => { resize.disconnect(); grouping.disconnect(); owned.forEach((props, node) => props.forEach((value, name) => { if (value) node.style.setProperty(name, value); else node.style.removeProperty(name); })); };
    }, [root, enabled, replyRole, sourceRole]);
}

const outline = <svg className="fq-outline" aria-hidden="true" focusable="false"><path vectorEffect="non-scaling-stroke" /></svg>;
// The theme's outgoing contour is a body plus a tail patch. Paint their shared
// fill over the edge stroke, covering internal joins without filters or a new
// outline geometry. Both paths receive the identical ordinary-bubble contour.
const previewOutline = <svg className="fq-outline" aria-hidden="true" focusable="false">
    <path className="fq-outline-edge" vectorEffect="non-scaling-stroke" />
    <path className="fq-outline-fill" />
</svg>;

/** Outer quote preview and reply body have separate DOM ownership for styling. */
export function ChatQuoteShell({ msg, children }: { msg: ChatMessage; children: ReactNode }) {
    const stored = readChatQuote(msg), echo = readQuoteDisplayEcho(msg.content);
    const needsSource = stored && (stored.kind === "image" || stored.kind === "voice" || !stored.sourceRole || !msg.mediaData?.quoteV1);
    const source = useQuoteSource(needsSource ? stored?.sourceMessageId : echo?.sourceId, msg.sessionId);
    const verifiedEcho = echo && source?.quote && (!echo.sourceRole || echo.sourceRole === source.quote.sourceRole) && echo.sourceType === source.quote.sourceType;
    const resolved = !echo || verifiedEcho ? source : undefined;
    const base: ChatQuoteSnapshot | null = stored || (echo ? verifiedEcho ? source!.quote! : { version: 1, kind: echo.sourceType === "image" ? "image" : "card", preview: echo.sourceType === "image" ? "图片" : "引用消息", summary: "引用消息" } : null);
    const quote = base ? { ...base, ...(!msg.mediaData?.quoteV1 && source?.quote && !echo ? { kind: source.quote.kind } : {}),
        sourceRole: resolved?.quote?.sourceRole || base.sourceRole, duration: base.duration || resolved?.seconds } : null;
    const { enabled } = useContext(ImessagePresentation);
    const root = useRef<HTMLDivElement>(null);
    useQuoteGeometry(root, enabled && !!quote, msg.role, quote?.sourceRole);
    if (!quote) return <div className="chat-quote-message">{children}</div>;
    return <div ref={root} className={enabled ? "fq-root fq-imessage" : "fq-root fq-native"} data-reply-role={msg.role} data-source-role={quote.sourceRole || "unknown"}>
        <div className="fq-preview" data-quote-kind={quote.kind} aria-label={`引用${quote.kind}消息`}>
            {enabled && previewOutline}
            <QuoteCard quote={quote} imageUrl={resolved?.imageUrl} estimated={!base?.duration && resolved?.estimated} />
        </div>
        {enabled && <svg className="fq-connector" aria-hidden="true" focusable="false" preserveAspectRatio="none"><path vectorEffect="non-scaling-stroke" /></svg>}
        <div className="fq-body">{enabled && outline}{children}</div>
    </div>;
}
