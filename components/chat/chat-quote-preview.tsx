"use client";
import { useContext, useState, useEffect, type ReactNode } from "react";
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

/** Outer quote preview and reply body have separate DOM ownership for styling. */
export function ChatQuoteShell({ msg, children }: { msg: ChatMessage; children: ReactNode }) {
    const quote = readChatQuote(msg);
    const { enabled } = useContext(ImessagePresentation);
    if (!quote) return <div className="chat-quote-message">{children}</div>;
    return <div className={enabled ? "fq-root fq-imessage" : "fq-root fq-native"} data-reply-role={msg.role} data-source-role={quote.sourceRole || "unknown"}>
        <div className="fq-preview" aria-label={`引用${quote.kind}消息`}>
            <QuoteCard quote={quote} sessionId={msg.sessionId} />
        </div>
        <div className="fq-connector" aria-hidden="true" />
        <div className="fq-body">{children}</div>
    </div>;
}
