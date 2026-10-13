/**
 * Native Xiaohongshu -> direct-chat reference bridge.
 * A message stores only noteId and brief fallback labels; live note data stays in XHS.
 * Viewing a reference is READ-ONLY and does not create a memory/projection event.
 */
import type { ChatMessage } from "./chat-storage";
import type { XiaohongshuComment, XiaohongshuNote } from "./xiaohongshu-types";
import { loadXiaohongshuState } from "./xiaohongshu-storage";
import type { ApiConfig } from "./settings-types";
import { getXiaohongshuVisionDataUrl } from "./xiaohongshu-image-assets";
import { resolveXiaohongshuVisionImages, makeXiaohongshuVisionMessage, getXiaohongshuNoteImageIds } from "./xiaohongshu-vision";
import type { LLMMessage } from "./llm-prompt-assembler";

const MAX_COMMENT_CONTEXT = 30;

export type XhsSuggestedActions = {
  like: boolean;
  save: boolean;
  comment?: string;
  replies: Array<{ targetCommentId: string; text: string }>;
};
export type XhsShareTurnAnchor = { sessionId: string; shareMessageId: string; noteId: string; lastUserMessageId: string };
export type XhsPendingSocialAction = { shareMessageId: string; noteId: string; action: XhsSuggestedActions; turnId?: string; allowedReplyIds?: string[]; anchor?: XhsShareTurnAnchor };

export function isXhsSavedChatReply(message: ChatMessage): boolean {
  return message.role === "assistant" && !message.isRetracted
    && !["tool_call", "tool_result", "tool_notice"].includes(message.mediaType || "")
    && (!!message.content?.trim() || !!message.mediaType);
}

export function newestXhsShareMessage(history: ChatMessage[], sessionId: string): ChatMessage | null {
  // The latest card in the unanswered user turn wins. Ordinary user text may
  // follow it; only a real, non-retracted assistant reply closes that turn.
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    if (item.sessionId !== sessionId || item.isRetracted) continue;
    if (isXhsSavedChatReply(item)) return null;
    if (item.role === "user" && item.mediaType === "xiaohongshu_note_share") {
      return item.mediaData?.xiaohongshuNoteId ? item : null;
    }
  }
  return null;
}

export function getXhsShareTurnAnchor(history: ChatMessage[], sessionId: string): XhsShareTurnAnchor | undefined {
  const share = newestXhsShareMessage(history, sessionId);
  if (!share) return undefined;
  let lastUser: ChatMessage | undefined;
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    if (item.sessionId === sessionId && item.role === "user" && !item.isRetracted && item.mediaType !== "tool_result") { lastUser = item; break; }
  }
  return { sessionId, shareMessageId: share.id, noteId: share.mediaData!.xiaohongshuNoteId!, lastUserMessageId: lastUser!.id };
}

function truncate(value: unknown, limit: number): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length <= limit ? text : text.slice(0, limit) + "…";
}

export function selectCommentsForContext(note: XiaohongshuNote): XiaohongshuComment[] {
  const selected = new Map<string, XiaohongshuComment>();
  const all = new Map(note.comments.map(comment => [comment.id, comment]));
  for (const comment of note.comments.slice(-24).reverse()) {
    const chain = new Map<string, XiaohongshuComment>();
    let current: XiaohongshuComment | undefined = comment;
    const visited = new Set<string>();
    while (current && !visited.has(current.id) && chain.size <= MAX_COMMENT_CONTEXT) {
      visited.add(current.id);
      if (!selected.has(current.id)) chain.set(current.id, current);
      current = current.replyToCommentId ? all.get(current.replyToCommentId) : undefined;
    }
    if (selected.size + chain.size <= MAX_COMMENT_CONTEXT) for (const [id, item] of chain) selected.set(id, item);
  }
  return note.comments.filter(comment => selected.has(comment.id));
}

export function formatXhsShareNoteForChat(note: XiaohongshuNote): string {
  const comments = selectCommentsForContext(note);
  const authors = new Map(note.comments.map(comment => [comment.id, comment.authorName]));
  const lines = comments.map(comment => {
    const parent = comment.replyToCommentId ? authors.get(comment.replyToCommentId) : undefined;
    return `- [评论ID]${comment.id} [回复父ID]${comment.replyToCommentId || "无"} [作者类型]${comment.authorType} [作者ID]${comment.authorId} [${comment.authorName}${parent ? ` 回复 ${parent}` : comment.replyTo ? ` 回复 ${comment.replyTo}` : ""}] ${truncate(comment.text, 300)}`;
  });
  return [
    `[笔记ID]${note.id}`,
    `[作者]${note.authorName}`,
    `[作者类型]${note.source} [作者ID]${note.authorId}`,
    `[类型]${note.type === "video" ? "视频" : "图文"}`,
    `[标题]${note.title}`,
    `[正文]${note.body.slice(0, 8000)}${note.body.length > 8000 ? "（正文过长，后文未提供）" : ""}`,
    `[TAG]${note.tags.join("、") || "无"}`,
    `[发布于]${note.createdAt}`,
    `[点赞]${note.likeCount} [收藏]${note.saveCount} [评论数]${note.commentCount}`,
    note.imageDescription ? `[图片描述]${note.imageDescription}` : "",
    note.videoDescription ? `[视频描述]${note.videoDescription}` : "",
    `[真实图片数量]${getXiaohongshuNoteImageIds(note).length}`,
    `[评论区]目前展示${comments.length}条/实际${note.comments.length}条（保留真实评论ID及回复关系）`,
    ...(lines.length ? lines : ["暂无评论"]),
  ].filter(Boolean).join("\n");
}

const SHARE_ACTION_INSTRUCTION = [
  "<xiaohongshu_shared_note_actions>",
  "你收到一张真实小红书帖子分享卡片。你可以仅在聊天中讨论，或者自主选择点赞、收藏、发表评论、回复他人的一条/多条已有评论；没有义务互动。",
  "如果决定操作，只能对刚才给出的[笔记ID]进行操作，并只能回复该上下文列出的真实[评论ID]。",
  "在正常聊天回复的末尾，最多添加一次以下机器指令（不属于聊天文本）：",
  '<xhs_social_actions>{"like":false,"save":false,"comment":"","replies":[{"targetCommentId":"真实评论ID","text":"回复内容"}]}</xhs_social_actions>',
  "所有键都可选；不操作则完全不要输出标签。不得编造已执行的操作；执行失败也不要声称已经成功。",
  "这些只是待执行的提议，聊天落库之后系统才尝试执行；聊天中只能表达意愿，不得说已经点赞、收藏、评论或回复成功。",
  "不要因为帖子的点赞/收藏计数、之前的转发残留而认定自己此前一定看过帖子。",
  "</xiaohongshu_shared_note_actions>",
].join("\n");

/** Read only. Vision converts up to 9 images sequentially with existing XHS adapter. */
export async function buildXhsSharePromptForChat(share: ChatMessage, useVision: boolean, onTargets?: (ids: string[]) => void): Promise<LLMMessage[]> {
  const noteId = share.mediaData?.xiaohongshuNoteId;
  if (!noteId) return [];
  const note = loadXiaohongshuState().notes.find(item => item.id === noteId);
  if (!note) {
    return [{ role: "user", content: `[小红书原帖不可用]帖子 ${noteId} 已被删除或无法读取。以下只是分享时的旧摘要，不代表当前原帖：\n${truncate(share.mediaData?.xiaohongshuBody, 180)}\n${truncate(share.mediaData?.xiaohongshuDescription, 120)}\n不得猜测评论和图片。` }];
  }
  onTargets?.(selectCommentsForContext(note).map(comment => comment.id));
  const context = `[用户刚转发的小红书原帖]\n${formatXhsShareNoteForChat(note)}\n\n${SHARE_ACTION_INSTRUCTION}`;
  if (!useVision) {
    return [{ role: "user", content: context + "\n[视觉读取状态]当前会话未启用视觉，只有文字描述，勿假装亲眼看到了图片。" }];
  }
  const batch = await resolveXiaohongshuVisionImages(note, getXiaohongshuVisionDataUrl);
  return [makeXiaohongshuVisionMessage(context, batch)];
}

export function parseXhsSocialActions(text: string): { visibleText: string; actions: XhsSuggestedActions | null } {
  const regex = /<\s*xhs_social_actions\s*>([\s\S]*?)<\/\s*xhs_social_actions\s*>/i;
  const match = regex.exec(text);
  // Strip even malformed directives, never expose control JSON in chat bubbles.
  const visibleText = text.replace(/<\s*xhs_social_actions\b[^>]*>[\s\S]*?<\/\s*xhs_social_actions\s*>/gi, "")
    .replace(/<\s*xhs[_a-z]*[\s\S]*$/gi, "").trim();
  if (!match || match[1].length > 4096 || (text.match(/<\s*xhs_social_actions\b/gi) || []).length !== 1) return { visibleText, actions: null };
  try {
    const parsed = JSON.parse(match[1]);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return { visibleText, actions: null };
    if (Object.keys(parsed).some(key => !["like", "save", "comment", "replies"].includes(key))
      || (parsed.like !== undefined && typeof parsed.like !== "boolean")
      || (parsed.save !== undefined && typeof parsed.save !== "boolean")
      || (parsed.comment !== undefined && typeof parsed.comment !== "string")
      || (parsed.replies !== undefined && (!Array.isArray(parsed.replies) || parsed.replies.length > 3
        || parsed.replies.some((r: unknown) => !r || typeof r !== "object" || Array.isArray(r)
          || Object.keys(r).some(key => !["targetCommentId", "text"].includes(key))
          || typeof (r as Record<string, unknown>).targetCommentId !== "string" || typeof (r as Record<string, unknown>).text !== "string"
          || !(r as Record<string, string>).targetCommentId.trim() || !(r as Record<string, string>).text.trim())))) return { visibleText, actions: null };
    const comment = typeof parsed.comment === "string" ? parsed.comment.trim().slice(0, 600) : "";
    const replies = Array.isArray(parsed.replies) ? parsed.replies.slice(0, 3)
      .filter((value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value))
      .map((value: Record<string, unknown>) => ({
        targetCommentId: typeof value.targetCommentId === "string" ? value.targetCommentId.slice(0, 180) : "",
        text: typeof value.text === "string" ? value.text.trim().slice(0, 600) : "",
      })).filter((reply: { targetCommentId: string; text: string }) => !!reply.targetCommentId && !!reply.text) : [];
    const actions: XhsSuggestedActions = { like: parsed.like === true, save: parsed.save === true, comment: comment || undefined, replies };
    return { visibleText, actions: actions.like || actions.save || actions.comment || actions.replies.length ? actions : null };
  } catch {
    return { visibleText, actions: null };
  }
}

/** Incremental UI must not leak tool-control JSON while streaming. */
export function createXhsStreamSanitizer(onDelta?: (delta: string) => void | Promise<void>) {
  let tail = "";
  let muted = false;
  const onChunk = (delta: string) => {
    if (muted || !onDelta) return;
    tail += delta;
    const start = tail.search(/<\s*xhs_social_actions\b/i);
    if (start >= 0) {
      if (start) void onDelta(tail.slice(0, start));
      muted = true;
      tail = "";
      return;
    }
    // Retain enough bytes for the full tag when split across stream chunks.
    if (tail.length > 52) {
      void onDelta(tail.slice(0, -52));
      tail = tail.slice(-52);
    }
  };
  onChunk.flush = () => {
    if (!muted && tail) void onDelta?.(tail.replace(/<\s*xhs[_a-z]*[\s\S]*$/i, ""));
    tail = ""; muted = false;
  };
  return onChunk;
}

const textOnlyApis = new Set<string>();
const apiKey = (api: ApiConfig) => `${api.provider}|${api.baseUrl}|${api.defaultModel}`;
export function canUseXhsShareVision(api: ApiConfig): boolean {
  return api.enableImageRecognition === true && !textOnlyApis.has(apiKey(api));
}
export function retryXhsShareWithoutVision(api: ApiConfig, messages: Array<{ content: string | import("./llm-prompt-assembler").LLMContentPart[] }>, error: unknown): boolean {
  const reason = error instanceof Error ? error.message : String(error);
  if (/api error\s+(413|415)|request_too_large|image.{0,30}(?:format|size|media type)/i.test(reason)) return false;
  if (!/only supports text|text[- ]only|(?:does(?:n't| not) support|not support)\s+(?:images?|vision|multimodal)|(?:vision|multimodal).*unsupported|不支持(?:图片|图像|视觉|多模态)/i.test(reason)) return false;
  let changed = false;
  for (const message of messages) {
    if (!Array.isArray(message.content) || !message.content.some(part => part.type === "text" && part.text.includes("[用户刚转发的小红书原帖]"))) continue;
    if (!message.content.some(part => part.type === "image_url")) continue;
    message.content = message.content.filter(part => part.type === "text" && !/^\[(?:笔记图片|图片识别说明|图片读取状态)/.test(part.text))
      .map(part => part.type === "text" ? part.text : "").join("\n") + "\n[视觉读取状态]当前 API 不支持视觉；图片未提供，请只依据文字，不得声称看过图片。";
    changed = true;
  }
  if (changed) {
    textOnlyApis.add(apiKey(api));
    if (textOnlyApis.size > 64) textOnlyApis.delete(textOnlyApis.values().next().value!);
  }
  return changed;
}
