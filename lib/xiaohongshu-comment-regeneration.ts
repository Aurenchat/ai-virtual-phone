/** In-place, dependency-aware regeneration for a single native XHS comment. */
import type { XiaohongshuComment, XiaohongshuNote, XiaohongshuNotification } from "./xiaohongshu-types";
import type { XiaohongshuState } from "./xiaohongshu-types";
import { kvReadFresh, kvUpdateManyAtomic } from "./kv-db";
import { reviseXiaohongshuRegeneratedCommentProjectionEntries, type XiaohongshuProjectionEntry } from "./xiaohongshu-memory";

const STATE_KEY = "ai_phone_xiaohongshu_state_v1";
const EVENT_PREFIX = "ai_phone_xiaohongshu_events_";

function parsePublishedState(raw: string | null): XiaohongshuState {
  if (!raw) throw new Error("已发布的小红书存档不存在，已拒绝重生成");
  const state = JSON.parse(raw) as XiaohongshuState;
  if (!Array.isArray(state.notes) || !Array.isArray(state.notifications)) throw new Error("小红书存档不可读取，已拒绝重生成");
  return state;
}

export async function readXiaohongshuCommentRegenerationState(): Promise<XiaohongshuState> {
  return parsePublishedState(await kvReadFresh(STATE_KEY));
}

export type XiaohongshuCommentRegenerationPlan = {
  noteId: string;
  rootId: string;
  /** Root first; NPC descendants breadth-first, stable by original creation order. */
  comments: XiaohongshuComment[];
};

/** Only AI-authored comments can be regenerated. Preserve user/other-character replies. */
export function planXiaohongshuCommentRegeneration(
  note: XiaohongshuNote,
  commentId: string,
): XiaohongshuCommentRegenerationPlan {
  const byId = new Map(note.comments.map(comment => [comment.id, comment]));
  if (byId.size !== note.comments.length) throw new Error("评论区有重复 ID，已拒绝重生成");
  const root = byId.get(commentId);
  if (!root || root.noteId !== note.id || !["npc", "character"].includes(root.authorType)) {
    throw new Error("只允许重生成仍存在的 AI 评论");
  }
  const ancestors = new Set<string>();
  let ancestor: XiaohongshuComment | undefined = root;
  while (ancestor) {
    if (ancestors.has(ancestor.id)) throw new Error("评论回复关系存在循环，已拒绝重生成");
    ancestors.add(ancestor.id);
    ancestor = ancestor.replyToCommentId ? byId.get(ancestor.replyToCommentId) : undefined;
  }
  const children = new Map<string, XiaohongshuComment[]>();
  for (const item of note.comments) {
    if (item.noteId !== note.id) throw new Error("评论所属笔记不一致，已拒绝重生成");
    if (!item.replyToCommentId || !byId.has(item.replyToCommentId)) continue;
    const list = children.get(item.replyToCommentId) ?? [];
    list.push(item);
    children.set(item.replyToCommentId, list);
  }
  const visited = new Set([root.id]);
  const queue = [root.id];
  const selected = [root];
  // Traverse through preserved user/character replies: deeper NPC replies also depend on this thread.
  for (let i = 0; i < queue.length; i += 1) {
    for (const child of children.get(queue[i]) ?? []) {
      if (visited.has(child.id)) continue; // tolerate legacy circular references
      visited.add(child.id);
      queue.push(child.id);
      if (child.authorType === "npc") selected.push(child);
    }
  }
  return { noteId: note.id, rootId: commentId, comments: selected };
}

/** A fresh context excludes still-pending NPC texts, which would otherwise leak old answers. */
export function contextForXiaohongshuCommentRegeneration(
  note: XiaohongshuNote,
  pendingIds: ReadonlySet<string>,
): XiaohongshuNote {
  return { ...note, comments: note.comments.filter(comment => !pendingIds.has(comment.id)) };
}

/** Verify the whole target chain is still identical before committing an async result. */
export function isXiaohongshuCommentRegenerationSnapshotValid(
  current: XiaohongshuNote | undefined,
  original: XiaohongshuNote,
  plan: XiaohongshuCommentRegenerationPlan,
): boolean {
  if (!current || current.id !== original.id || plan.noteId !== original.id) return false;
  const existing = new Map(current.comments.map(comment => [comment.id, comment]));
  if (existing.size !== current.comments.length) return false;
  const originalById = new Map(original.comments.map(comment => [comment.id, comment]));
  // New descendants mean the dependency graph changed during generation.
  try {
    const currentPlan = planXiaohongshuCommentRegeneration(current, plan.rootId);
    if (currentPlan.comments.length !== plan.comments.length
      || currentPlan.comments.some((comment, index) => comment.id !== plan.comments[index].id)) return false;
  } catch { return false; }
  // Preserved intermediary/ancestor replies and votes are also part of the snapshot.
  // Reject changes to any discussion or note context used for generation.
  return JSON.stringify(current) === JSON.stringify(original)
    && plan.comments.every(comment => JSON.stringify(comment) === JSON.stringify(originalById.get(comment.id)));
}

export function applyXiaohongshuCommentRegeneration(
  note: XiaohongshuNote,
  replacements: ReadonlyMap<string, string>,
): XiaohongshuNote {
  const existing = new Set(note.comments.map(comment => comment.id));
  for (const [id, text] of replacements) {
    if (!existing.has(id) || typeof text !== "string" || !text.trim()) {
      throw new Error("重生成内容不完整，已保留原评论");
    }
  }
  return {
    ...note,
    comments: note.comments.map(comment => replacements.has(comment.id)
      ? { ...comment, text: replacements.get(comment.id)! }
      : comment),
    // No new comments, replies, votes, notifications or timestamps are created.
    updatedAt: new Date().toISOString(),
  };
}

/** Notifications have no commentId in current XHS data; only rewrite uniquely attributable text. */
export function reviseXiaohongshuCommentNotifications(
  notifications: XiaohongshuNotification[],
  before: XiaohongshuNote,
  replacements: ReadonlyMap<string, string>,
): XiaohongshuNotification[] {
  const notices = notifications.slice();
  for (const comment of before.comments) {
    const replacement = replacements.get(comment.id);
    if (!replacement || replacement === comment.text) continue;
    // Without commentId, duplicate (author, text) comments cannot be matched safely.
    if (before.comments.filter(item => item.authorName === comment.authorName && item.text === comment.text).length !== 1) continue;
    const matches: number[] = [];
    for (let i = 0; i < notifications.length; i += 1) {
      // Match against the original snapshot, never another replacement's new text.
      const notice = notifications[i];
      if (notice.type === "comment" && notice.noteId === before.id
        && notice.actorName === comment.authorName && notice.text === comment.text) matches.push(i);
    }
    if (matches.length === 1) {
      const index = matches[0];
      notices[index] = { ...notices[index], text: replacement };
    }
  }
  return notices;
}

/** One durable transaction: validate fresh state and update existing snippets with the note. */
export async function commitXiaohongshuCommentRegeneration(
  original: XiaohongshuNote,
  plan: XiaohongshuCommentRegenerationPlan,
  replacements: ReadonlyMap<string, string>,
): Promise<XiaohongshuState> {
  if (replacements.size !== plan.comments.length
    || plan.comments.some(comment => !replacements.has(comment.id))) throw new Error("重生成结果不完整");
  const revisions = new Map(plan.comments.map(before => [before.id, { before, afterText: replacements.get(before.id)! }]));
  const projectionKeys = [...new Set(plan.comments.filter(comment => comment.authorType === "character")
    .map(comment => EVENT_PREFIX + comment.authorId))];
  return kvUpdateManyAtomic([STATE_KEY, ...projectionKeys], values => {
    const latest = parsePublishedState(values.get(STATE_KEY) ?? null);
    const current = latest.notes.find(note => note.id === original.id);
    if (!isXiaohongshuCommentRegenerationSnapshotValid(current, original, plan)) {
      throw new Error("评论区在生成期间发生变化，未覆盖任何现有评论");
    }
    const updated = applyXiaohongshuCommentRegeneration(current!, replacements);
    const saved = { ...latest, notes: latest.notes.map(note => note.id === original.id ? updated : note),
      notifications: reviseXiaohongshuCommentNotifications(latest.notifications, original, replacements),
      updatedAt: new Date().toISOString() };
    const writes = new Map<string, string | null>([[STATE_KEY, JSON.stringify(saved)]]);
    for (const key of projectionKeys) {
      const raw = values.get(key);
      if (!raw) continue; // never create an event store or memory event
      let entries: XiaohongshuProjectionEntry[];
      try { entries = JSON.parse(raw); } catch { continue; }
      if (!Array.isArray(entries)) continue;
      const next = reviseXiaohongshuRegeneratedCommentProjectionEntries(entries, key, revisions);
      if (next !== entries) writes.set(key, JSON.stringify(next));
    }
    return { values: writes, result: saved };
  });
}
