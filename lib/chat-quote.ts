/** Compact and backward-compatible cross-theme chat quote representation. */
import type { ChatMessage } from "./chat-storage";
import { splitBilingualText } from "./bilingual-text";

export type QuoteKind = "text" | "image" | "voice" | "music" | "payment" | "location" | "card";
export type ChatQuoteSnapshot = {
    version: 1;
    sourceMessageId?: string;
    sourceRole?: ChatMessage["role"];
    sourceType?: string;
    kind: QuoteKind;
    preview: string;
    summary: string;
    /** A reference, not image bytes. Never persist a base64/data/blob URL here. */
    imageRef?: string;
    /** Legacy inline images are looked up by source ID; bytes are never copied. */
    imageFromSource?: boolean;
    imageIndex?: number;
    imageId?: string;
    coverUrl?: string;
    artist?: string;
    duration?: number;
};

const MAX_SUMMARY = 2000;
const MAX_CARD = 280;
const truncate = (text: string, limit: number) => text.length > limit ? text.slice(0, limit) + "…" : text;
const clean = (text: unknown) => typeof text === "string" ? text.replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim() : "";
// Public card labels can contain a plugin's serialized payload on old hosts.
// Never copy those bytes into another record, preview or model context.
const publicText = (value: unknown, prose = false) => {
    const text = clean(value);
    if (/(?:^|[\s"'(=])(?:data:[^,\s]*[,;]|blob:|media-store:\/\/)/i.test(text) || (!prose && /[A-Za-z0-9+/]{256,}={0,2}/.test(text))) return "";
    if (!prose && /^[{[]/.test(text)) {
        try { JSON.parse(text); return ""; } catch { /* ordinary bracketed prose */ }
    }
    return text;
};
const plain = (text: string) => splitBilingualText(text)?.original || text;
const validRef = (ref: unknown) => {
    if (typeof ref !== "string" || ref.length > 1800 || ref.startsWith("data:") || ref.startsWith("blob:")) return undefined;
    return /^(?:media-store:\/\/|https?:\/\/)/i.test(ref) ? ref : undefined;
};
const safeTitle = (text: unknown, fallback: string, limit = MAX_CARD) => truncate(publicText(text) || fallback, limit);

export function createChatQuote(source: ChatMessage, selection?: { imageId?: string; imageIndex?: number; imageRef?: string }): ChatQuoteSnapshot {
    const d = source.mediaData;
    const type = source.mediaType || "text";
    const base: ChatQuoteSnapshot = { version: 1, sourceMessageId: source.id, sourceRole: source.role, sourceType: type, kind: "text", preview: "", summary: "" };
    if (type === "image" || (type === "media_file" && d?.fileType === "image") || selection?.imageRef || selection?.imageId || selection?.imageIndex !== undefined) {
        const description = publicText(d?.label) || publicText(source.content) || publicText(d?.imageGenerationPrompt);
        const selectedIndex = selection?.imageIndex;
        const selectedId = selection?.imageId;
        return { ...base, kind: "image", preview: description ? truncate(description, MAX_CARD) : "[图片]",
            summary: description ? `[引用图片] ${truncate(description, MAX_SUMMARY)}` : "[引用图片]",
            imageRef: validRef(selection ? selection.imageRef : source.mediaUrl || d?.imageGenerationMediaRef),
            ...(!selection && source.mediaUrl && !validRef(source.mediaUrl) && /^(?:data:image\/|blob:)/i.test(source.mediaUrl) ? { imageFromSource: true } : {}),
            ...(Number.isInteger(selectedIndex) && selectedIndex! >= 0 ? { imageIndex: selectedIndex } : {}),
            ...(selectedId ? { imageId: safeTitle(selectedId, "", 150) } : {}) };
    }
    if (type === "audio" || (type === "media_file" && d?.fileType === "audio")) {
        const transcript = plain(publicText(d?.label) || publicText(d?.synthesizedFromText) || publicText(source.content));
        const duration = d?.voiceDuration || d?.fileDuration;
        return { ...base, kind: "voice", preview: "[语音]", summary: `[引用语音] ${truncate(transcript || "转写不可用", MAX_SUMMARY)}`,
            ...(typeof duration === "number" && Number.isFinite(duration) && duration > 0 ? { duration } : {}) };
    }
    if (type === "music" || type === "music_share") {
        const title = safeTitle(d?.musicTitle || source.content, "未知歌曲", 160);
        const artist = safeTitle(d?.musicArtist, "", 120);
        return { ...base, kind: "music", preview: title, artist,
            summary: `[引用音乐] ${truncate(title + (artist ? ` — ${artist}` : ""), MAX_SUMMARY)}`,
            coverUrl: validRef(d?.musicCoverUrl) };
    }
    if (["transfer", "red_packet", "payment_request", "accept_transfer", "decline_transfer", "accept_red_packet", "decline_red_packet"].includes(type)) {
        const title = type === "red_packet" ? "红包" : type === "transfer" ? "转账" : type === "payment_request" ? "代付请求" : "支付消息";
        const label = [typeof d?.amount === "number" && Number.isFinite(d.amount) ? String(d.amount) : "", publicText(d?.currency), publicText(d?.label), publicText(d?.status)].filter(Boolean).join(" ");
        return { ...base, kind: "payment", preview: title, summary: `[引用${title}] ${truncate(label || publicText(source.content) || title, MAX_SUMMARY)}` };
    }
    if (type === "location") {
        const label = safeTitle(d?.label || source.content, "位置");
        return { ...base, kind: "location", preview: label, summary: `[引用位置] ${label}` };
    }
    if (type && type !== "text" && type !== "quote") {
        // Allowlisted public labels only; never stringify plugin-owned objects.
        const label = safeTitle(d?.appCardTitle || d?.appCardSummary || d?.musicTitle || d?.fileName || d?.label, "[消息卡片]");
        const details = type === "app_card" ? publicText(d?.appCardSummary) : "";
        return { ...base, kind: "card", preview: label,
            summary: `[引用卡片] ${truncate(label + (details && details !== label ? ` — ${details}` : ""), MAX_SUMMARY)}` };
    }
    const original = plain(publicText(source.content, true));
    return { ...base, kind: "text", preview: original || "[消息]", summary: truncate(original || "[消息]", MAX_SUMMARY) };
}

/** Match model-authored legacy [引用:…] without inventing source IDs when ambiguous. */
export function resolveLegacyChatQuote(preview: string, history: readonly ChatMessage[]): ChatQuoteSnapshot | null {
    const query = publicText(preview);
    if (!query) return null;
    const found: ChatMessage[] = [];
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.isRetracted || msg.mediaType === "quote" || msg.role === "system" || msg.role === "tool") continue;
        const normalized = createChatQuote(msg);
        const keys = [plain(publicText(msg.content)), plain(publicText(msg.mediaData?.label)), normalized.preview, normalized.summary].filter(Boolean);
        if (keys.some(key => key === query || key.startsWith(query) && query.length >= 8)) found.push(msg);
        if (found.length > 1) return null;
    }
    return found.length === 1 ? createChatQuote(found[0]) : null;
}

/** Old records remain readable; never infer media types from UI text alone. */
export function readChatQuote(msg: ChatMessage): ChatQuoteSnapshot | null {
    if (msg.mediaType !== "quote") return null;
    const stored = msg.mediaData?.quoteV1;
    if (stored?.version === 1 && typeof stored.preview === "string" && typeof stored.summary === "string") {
        return { ...stored, kind: ["text", "image", "voice", "music", "payment", "location", "card"].includes(stored.kind) ? stored.kind : "card",
            preview: plain(publicText(stored.preview, stored.kind === "text")) || "[消息]", summary: truncate(publicText(stored.summary, stored.kind === "text") || "[消息]", MAX_SUMMARY),
            imageRef: validRef(stored.imageRef), coverUrl: validRef(stored.coverUrl), artist: safeTitle(stored.artist, "", 120) };
    }
    const preview = plain(publicText(msg.mediaData?.quotePreview)) || (msg.mediaData?.quotePreview ? "[消息]" : "");
    return preview ? { version: 1, kind: "text", sourceMessageId: msg.mediaData?.quoteMessageId, sourceRole: msg.mediaData?.quoteRole, preview, summary: preview } : null;
}

export function formatChatQuoteForPrompt(msg: ChatMessage, replyContent = msg.content): string {
    const q = readChatQuote(msg);
    const content = clean(replyContent);
    if (!q) return content ? `[引用消息：内容不可用]\n${content}` : "[引用消息：内容不可用]";
    const who = q.sourceRole === "user" ? "用户" : q.sourceRole === "assistant" ? "角色" : "消息";
    const identifier = q.sourceMessageId ? ` id=${q.sourceMessageId}` : "";
    const kind = q.sourceType || q.kind;
    return `[引用${who}的${kind}消息${identifier}：${truncate(q.summary, MAX_SUMMARY)}]${content ? `\n${content}` : ""}`;
}
