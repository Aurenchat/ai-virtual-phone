import type { ChatMessage } from "./chat-storage";

export type MusicChatSharePayload = {
    type: "music";
    title: string;
    artist: string;
    musicTrackId?: number;
    musicCoverUrl?: string;
};

export type XiaohongshuNoteChatSharePayload = {
    type: "xiaohongshu_note";
    /** Lightweight reference, never a serialized copy of all comments/images. */
    noteId?: string;
    authorName: string;
    title: string;
    body: string;
    description?: string;
    noteType: "post" | "video";
    tags?: string[];
    imageAssetId?: string;
    coverIcon?: string;
    tone?: string;
};

export type ChatSharePayload = MusicChatSharePayload | XiaohongshuNoteChatSharePayload;

function compactShareText(value: string | undefined, fallback: string): string {
    const text = (value || "").replace(/\s+/g, " ").trim();
    return text || fallback;
}

export function formatXiaohongshuShareForPrompt(input: {
    author?: string;
    title?: string;
    body?: string;
    description?: string;
}): string {
    const author = compactShareText(input.author, "未知作者");
    const title = compactShareText(input.title, "无标题");
    const body = compactShareText(input.body, "无正文内容");
    const description = compactShareText(input.description, "");
    return `分享了一条小红书帖子，作者：${author}, 标题：${title}, 正文内容：${body}，图片/视频描述：${description || "无"}`;
}

/** New cards remain readable and small; internal IDs live only in mediaData. */
export function formatXiaohongshuShareSummary(input: Parameters<typeof formatXiaohongshuShareForPrompt>[0]): string {
    return formatXiaohongshuShareForPrompt({ author: input.author?.slice(0, 80), title: input.title?.slice(0, 200),
        body: input.body?.slice(0, 180), description: input.description?.slice(0, 120) });
}

/** Repair presentation of already-saved internal-reference cards without migrating archives. */
export function getXiaohongshuShareReadableContent(message: Pick<ChatMessage, "content" | "mediaData">): string {
    if (message.content?.trim() && !/^\[小红书帖子引用\]/.test(message.content)) return message.content;
    const data = message.mediaData;
    const format = data?.xiaohongshuNoteId ? formatXiaohongshuShareSummary : formatXiaohongshuShareForPrompt;
    return format({ author: data?.xiaohongshuAuthor, title: data?.xiaohongshuTitle,
        body: data?.xiaohongshuBody, description: data?.xiaohongshuDescription });
}
