import type { ChatMessage } from "@/lib/chat-storage";
import { splitBilingualText } from "@/lib/bilingual-text";

/** Recognize only the exact history envelope echoed at the START of a reply.
 * This is a display adapter, never the model parser or a persistence migration. */
export function readQuoteDisplayEcho(content: string) {
    const head = /^\[引用(用户|角色|消息)的([a-z_]+)消息(?:\s*id\s*=\s*([\w-]{1,160}))?\s*[：:]\s*/.exec(content);
    if (!head) return null;
    let depth = 1, end = -1;
    for (let i = head[0].length; i < Math.min(content.length, 6000); i++) {
        if (content[i] === "[") depth++;
        if (content[i] === "]" && --depth === 0) { end = i; break; }
    }
    if (end < 0) return null;
    return { sourceId: head[3], sourceRole: head[1] === "用户" ? "user" : head[1] === "角色" ? "assistant" : undefined,
        sourceType: head[2], preview: content.slice(head[0].length, end).trim(), body: content.slice(end + 1).trim() };
}

/** Same text-only estimate as the existing voice bar; never opens an audio URL. */
export function quoteVoiceTime(source?: ChatMessage, recorded?: number) {
    const seconds = recorded || source?.mediaData?.voiceDuration || source?.mediaData?.fileDuration;
    if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) return { seconds, estimated: false };
    const label = source?.mediaData?.label || source?.mediaData?.synthesizedFromText || "";
    const text = splitBilingualText(label)?.original || label;
    return text ? { seconds: Math.max(2, Math.ceil(text.length / 4)), estimated: true } : { seconds: undefined, estimated: false };
}

export function quoteImageCaption(text: string) {
    const label = text.trim().replace(/^\[引用图片\]\s*/, "");
    if (!label || /^\[?图片\]?$/.test(label) || /(?:消息\s+id=|data:|base64|media-store:|blob:)/i.test(label)
        || /^[{[]/.test(label) || /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(label) || /[A-Za-z0-9+/]{128,}/.test(label)) return "图片";
    return label.slice(0, 120);
}
