"use client";
import { useContext, useState, useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import type { ChatMessage } from "@/lib/chat-storage";
import { readChatQuote, type ChatQuoteSnapshot } from "@/lib/chat-quote";
import { ImessagePresentation } from "./imessage-presentation";
import { isMediaStoreRef, loadMediaObjectUrl } from "@/lib/media-cache-storage";
import { chatDb } from "@/lib/chat-db";

function SourceThumbnail({ messageId, sessionId }: { messageId?: string; sessionId: string }) {
    const [source, setSource] = useState({ messageId, sessionId, url: "" });
    useEffect(() => {
        let active = true;
        if (messageId) void chatDb.messages.get(messageId).then(msg => {
            const url = msg?.sessionId === sessionId && !msg.isRetracted
                && (msg.mediaType === "image" || (msg.mediaType === "media_file" && msg.mediaData?.fileType === "image"))
                && /^(?:data:image\/|blob:|https?:\/\/|media-store:\/\/)/i.test(msg.mediaUrl || "") ? msg.mediaUrl! : "";
            if (active) setSource({ messageId, sessionId, url });
        }).catch(() => { if (active) setSource({ messageId, sessionId, url: "" }); });
        return () => { active = false; };
    }, [messageId, sessionId]);
    return <QuoteThumbnail refUrl={source.messageId === messageId && source.sessionId === sessionId ? source.url : undefined} />;
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
    if (!resolved || broken) return cover ? <span className="fq-cover fq-cover-fallback" aria-label="封面不可用">♪</span> : <span className="fq-image-fallback">[图片]</span>;
    return <img className={cover ? "fq-cover" : "fq-thumb"} src={resolved} alt={cover ? "" : "引用图片"} loading="lazy" decoding="async" onError={() => setBroken(true)} />;
}

function compactTime(seconds?: number) {
    if (!seconds) return "";
    const count = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(count / 60)).padStart(2, "0")}:${String(count % 60).padStart(2, "0")}`;
}

function QuoteCard({ quote, sessionId }: { quote: ChatQuoteSnapshot; sessionId: string }) {
    if (quote.kind === "image") return quote.imageRef
        ? <span className="fq-image"><QuoteThumbnail refUrl={quote.imageRef} /></span>
        : quote.imageFromSource ? <span className="fq-image"><SourceThumbnail messageId={quote.sourceMessageId} sessionId={sessionId} /></span>
        : <span className="fq-image-text">{quote.preview}</span>;
    if (quote.kind === "voice") return <span className="fq-voice" aria-label={quote.summary}>
        <span className="fq-wave" aria-hidden="true">{[12,22,17,27,14,19,12,25,14,19,11,22,14,17,11].map((height, index) => <i key={index} style={{ height }} />)}</span>
        <span className="fq-duration">{compactTime(quote.duration)}</span>
    </span>;
    if (quote.kind === "music") return <span className="fq-music">
        <QuoteThumbnail refUrl={quote.coverUrl} cover />
        <span className="fq-music-detail"><strong>{quote.preview}</strong><small>{quote.artist || "未知歌手"}</small></span>
    </span>;
    if (quote.kind === "text") return <span className="fq-text">{quote.preview}</span>;
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
        if (!enabled || !el) return;
        const preview = el.querySelector<HTMLElement>(".fq-preview")!;
        const body = el.querySelector<HTMLElement>(".fq-body")!;
        const connector = el.querySelector<SVGSVGElement>(".fq-connector")!;
        const update = () => {
            for (const [box, mini] of [[preview, true], [body, false]] as const) {
                const style = getComputedStyle(box), w = parseFloat(style.width), h = parseFloat(style.height);
                if (!w || !h) continue;
                const svg = box.querySelector<SVGSVGElement>(":scope > .fq-outline")!;
                svg.setAttribute("viewBox", `0 0 ${w} ${h + 8}`);
                svg.setAttribute("height", String(h + 8));
                const d = bubbleContour(w, h, (mini ? sourceRole : replyRole) !== "user", mini || !!el.parentElement?.hasAttribute("data-im-last"));
                svg.querySelectorAll("path").forEach(path => path.setAttribute("d", d));
            }
            const leftSource = sourceRole !== "user", outgoing = replyRole !== "assistant";
            const sameEdge = leftSource === outgoing;
            const start = sameEdge ? preview.offsetHeight + 12 : preview.offsetHeight / 2;
            const end = body.offsetTop + body.offsetHeight / 2;
            const radius = Math.min(24, (end - start) / (sameEdge ? 1 : 2));
            const d = sameEdge
                ? `M16 ${start}V${end-radius}Q16 ${end} ${16+radius} ${end}H50`
                : `M50 ${start}H${16+radius}Q16 ${start} 16 ${start+radius}V${end-radius}Q16 ${end} ${16+radius} ${end}H50`;
            connector.setAttribute("viewBox", `0 0 54 ${el.offsetHeight}`);
            connector.firstElementChild!.setAttribute("d", d);
        };
        update();
        const resize = new ResizeObserver(update);
        resize.observe(el); resize.observe(preview); resize.observe(body);
        // Group membership is owned by the existing theme bridge.
        const grouping = new MutationObserver(update);
        if (el.parentElement) grouping.observe(el.parentElement, { attributes: true, attributeFilter: ["data-im-last"] });
        return () => { resize.disconnect(); grouping.disconnect(); };
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
    const quote = readChatQuote(msg);
    const { enabled } = useContext(ImessagePresentation);
    const root = useRef<HTMLDivElement>(null);
    useQuoteGeometry(root, enabled && !!quote, msg.role, quote?.sourceRole);
    if (!quote) return <div className="chat-quote-message">{children}</div>;
    return <div ref={root} className={enabled ? "fq-root fq-imessage" : "fq-root fq-native"} data-reply-role={msg.role} data-source-role={quote.sourceRole || "unknown"}>
        <div className="fq-preview" data-quote-kind={quote.kind} aria-label={`引用${quote.kind}消息`}>
            {enabled && previewOutline}
            <QuoteCard quote={quote} sessionId={msg.sessionId} />
        </div>
        {enabled && <svg className="fq-connector" aria-hidden="true" focusable="false" preserveAspectRatio="none"><path vectorEffect="non-scaling-stroke" /></svg>}
        <div className="fq-body">{enabled && outline}{children}</div>
    </div>;
}
