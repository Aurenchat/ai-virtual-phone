/** Deferred native XHS actions. No chat undo ledger and no viewed/reacted lock. */
import type { XiaohongshuComment, XiaohongshuState } from "./xiaohongshu-types";
import { isXhsSavedChatReply, newestXhsShareMessage, parseXhsSocialActions, type XhsPendingSocialAction } from "./xiaohongshu-chat-share";
import { makeXiaohongshuComment, makeXiaohongshuNotification } from "./xiaohongshu-storage";
import { kvUpdateAtomic } from "./kv-db";
import { applyCharacterReaction } from "./xiaohongshu-engine";
import { resolveCharacterXiaohongshuDisplayName } from "./xiaohongshu-character-profile";
import { loadCharacters } from "./character-storage";
import { loadChatMessages } from "./chat-storage";
import { chatDb } from "./chat-db";
import { recordXiaohongshuCommentEvent, recordXiaohongshuReplyEvent } from "./xiaohongshu-memory";
import { incrementEventCounter } from "./memory-storage";
import { maybeRunSummarization } from "./memory-summarizer";

const inFlight = new Set<string>();
const committedTurns = new Set<string>();
const committedOutputs = new WeakSet<XhsPendingSocialAction>();
const STATE_KEY = "ai_phone_xiaohongshu_state_v1";

export async function commitXhsShareActions(input: {
  sessionId: string; characterId: string; responseMessageId: string;
  pending: XhsPendingSocialAction; isActive?: () => boolean;
}): Promise<{ applied: boolean; reason?: string; duplicate?: boolean }> {
  const { sessionId, characterId, pending, responseMessageId } = input;
  const turnKey = sessionId + ":" + (pending.turnId || responseMessageId);
  if (!responseMessageId || committedOutputs.has(pending) || committedTurns.has(turnKey) || inFlight.has(turnKey)) {
    return { applied: false, reason: "本轮操作已处理或缺少已保存的回复ID", duplicate: true };
  }
  inFlight.add(turnKey);
  const active = () => input.isActive?.() !== false;
  const anchor = pending.anchor || { sessionId, shareMessageId: pending.shareMessageId, noteId: pending.noteId, lastUserMessageId: pending.shareMessageId };
  const cachedSourceLive = () => {
    const messages = loadChatMessages(sessionId);
    const responseIndex = messages.findIndex(msg => msg.id === responseMessageId && isXhsSavedChatReply(msg));
    if (responseIndex < 0 || anchor.sessionId !== sessionId || anchor.shareMessageId !== pending.shareMessageId || anchor.noteId !== pending.noteId) return false;
    const source = newestXhsShareMessage(messages.slice(0, responseIndex), sessionId);
    let latestUser: (typeof messages)[number] | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "user" && !msg.isRetracted && msg.mediaType !== "tool_result") { latestUser = msg; break; }
    }
    return latestUser?.id === anchor.lastUserMessageId && source?.id === anchor.shareMessageId
      && source.mediaData?.xiaohongshuNoteId === anchor.noteId;
  };
  try {
    if (!active() || !cachedSourceLive()) return { applied: false, reason: "本轮已取消或分享/回复已删除" };
    const [share, response, lastUser] = await chatDb.messages.bulkGet([pending.shareMessageId, responseMessageId, anchor.lastUserMessageId]);
    const session = await chatDb.sessions.get(sessionId);
    if (!active() || !cachedSourceLive() || !session || session.isGroup || session.contactId !== characterId
      || !share || share.sessionId !== sessionId || share.role !== "user" || share.isRetracted
      || share.mediaType !== "xiaohongshu_note_share" || share.mediaData?.xiaohongshuNoteId !== pending.noteId
      || !lastUser || lastUser.sessionId !== sessionId || lastUser.role !== "user" || lastUser.isRetracted
      || !response || response.sessionId !== sessionId || !isXhsSavedChatReply(response)
      || (response.senderCharacterId && response.senderCharacterId !== characterId)
      ) {
      return { applied: false, reason: "分享引用、聊天角色或有效回复的落库校验失败" };
    }
    const character = loadCharacters().find(item => item.id === characterId);
    if (!character) return { applied: false, reason: "角色不存在" };
    const action = parseXhsSocialActions("<xhs_social_actions>" + JSON.stringify(pending.action) + "</xhs_social_actions>").actions;
    if (!action) return { applied: false, reason: "无有效的小红书操作" };
    const allowed = new Set(pending.allowedReplyIds || []);
    const actorName = resolveCharacterXiaohongshuDisplayName(character);
    if (typeof window !== "undefined") {
      const request = new CustomEvent("xiaohongshu-before-share-commit", { cancelable: true });
      window.dispatchEvent(request);
      if (request.defaultPrevented) return { applied: false, reason: "小红书正在生成内容，请完成后再重试互动" };
    }
    const committed = await kvUpdateAtomic(STATE_KEY, raw => {
      if (!active() || !cachedSourceLive()) throw new Error("本轮已取消或分享/回复已删除");
      if (!raw) throw new Error("原生小红书存档不可用");
      const state = JSON.parse(raw) as XiaohongshuState;
      const note = state.notes.find(item => item.id === pending.noteId);
      if (!note) throw new Error("原帖已删除");
      const targets = action.replies.map(reply => allowed.has(reply.targetCommentId)
        ? note.comments.find(c => c.id === reply.targetCommentId && c.noteId === note.id) : undefined);
      if (targets.some(target => !target || (target.authorType === "character" && target.authorId === characterId))) {
        throw new Error("回复目标未提供给模型、已删除或不属于当前帖子");
      }
      const applied = applyCharacterReaction(note, character, {
        comment: action.comment || "", liked: action.like, saved: action.save, followedAuthor: false,
      });
      let updated = applied.note;
      const replies: Array<{ comment: XiaohongshuComment; target: XiaohongshuComment }> = [];
      const notifications = [...applied.notifications];
      for (let i = 0; i < action.replies.length; i++) {
        const target = targets[i]!;
        const comment = makeXiaohongshuComment({
          noteId: note.id, authorType: "character", authorId: character.id, authorName: actorName,
          text: action.replies[i].text, replyTo: target.authorName, replyToCommentId: target.id, unread: note.source === "user",
        });
        replies.push({comment,target});
        updated = {...updated,comments:[...updated.comments,comment],commentCount:updated.commentCount+1};
        if (note.source === "user") notifications.push(makeXiaohongshuNotification({
          type:"comment",noteId:note.id,actorName,text:comment.text,thumbnailText:note.title,unread:true,
        }));
      }
      const next = {...state,notes:state.notes.map(item=>item.id===note.id?updated:item),
        notifications:[...notifications,...state.notifications],updatedAt:new Date().toISOString()};
      return {value:JSON.stringify(next),result:{note,mainComment:applied.mainComment,replies}};
    });
    committedTurns.add(turnKey);
    committedOutputs.add(pending);
    if (committedTurns.size > 512) committedTurns.delete(committedTurns.values().next().value!);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("xiaohongshu-updated",{detail:{socialOnly:true,noteId:pending.noteId}}));
    if (action.comment && committed.mainComment.text) recordXiaohongshuCommentEvent({
      characterId,characterName:character.name,note:committed.note,comment:committed.mainComment,liked:action.like,saved:action.save,
    });
    for (const reply of committed.replies) recordXiaohongshuReplyEvent({
      characterId,characterName:character.name,note:committed.note,comment:reply.comment,targetComment:reply.target,
    });
    if ((action.comment && committed.mainComment.text) || committed.replies.length) {
      incrementEventCounter(characterId);
      void maybeRunSummarization(characterId,character.name).catch(err=>console.warn("[XHS share] Native summary check failed",err));
    }
    return {applied:true};
  } catch (error) {
    return {applied:committedTurns.has(turnKey),reason:error instanceof Error?error.message:String(error)};
  } finally { inFlight.delete(turnKey); }
}
