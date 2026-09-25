// Forked from Float (AGPL-3.0-only), baseline da067218. See BASELINE.md.
import React,{useState,type CSSProperties} from "react";
import {Heart} from "lucide-react";
import type {XiaohongshuNote,XiaohongshuComment} from "./xiaohongshu-types";
import {CheckPhoneBilingualText} from "./bilingual-component";
import {splitBilingualText,normalizeBilingualTextInput} from "./bilingual-text";
type XiaohongshuNoteCardVariant = "compact" | "regular" | "tall";

const DEFAULT_XHS_AVATARS = [
  "/xiaohongshu/avatars/default-01.png",
  "/xiaohongshu/avatars/default-02.png",
  "/xiaohongshu/avatars/default-03.png",
  "/xiaohongshu/avatars/default-04.png",
  "/xiaohongshu/avatars/default-05.png",
  "/xiaohongshu/avatars/default-06.png",
];

const XHS_MAX_IMAGE_HEIGHT_RATIO = 4 / 3;

const XHS_TEXT_IMAGE_HEIGHT_RATIO = 1.18;

const XHS_VIDEO_IMAGE_HEIGHT_RATIO = XHS_TEXT_IMAGE_HEIGHT_RATIO;

const DEFAULT_XHS_IMAGE_FRAME_STYLE: CSSProperties = { aspectRatio: `1 / ${XHS_MAX_IMAGE_HEIGHT_RATIO}` };

const TEXT_XHS_IMAGE_FRAME_STYLE: CSSProperties = { aspectRatio: `1 / ${XHS_TEXT_IMAGE_HEIGHT_RATIO}` };

const VIDEO_XHS_IMAGE_FRAME_STYLE: CSSProperties = { aspectRatio: `1 / ${XHS_VIDEO_IMAGE_HEIGHT_RATIO}` };

const ICON_XHS_IMAGE_FRAME_STYLES: Record<XiaohongshuNoteCardVariant, CSSProperties> = {
  compact: { aspectRatio: "1 / 0.9" },
  regular: { aspectRatio: `1 / ${XHS_TEXT_IMAGE_HEIGHT_RATIO}` },
  tall: { aspectRatio: `1 / ${XHS_MAX_IMAGE_HEIGHT_RATIO}` },
};
export function formatCount(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(Math.max(0, Math.round(value)));
}

export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}小时前`;
  return `${Math.round(diffMinutes / 1440)}天前`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickDefaultAvatar(seed: string): string {
  return DEFAULT_XHS_AVATARS[hashString(seed || "npc") % DEFAULT_XHS_AVATARS.length];
}

export function XhsAvatar({ className, src, name }: { className: string; src?: string | null; name: string }) {
  const isDefaultAvatar = Boolean(src?.startsWith("/xiaohongshu/avatars/"));
  return (
    <div className={`${className}${isDefaultAvatar ? " xhs-default-avatar" : ""}`}>
      {src ? <img src={src} alt="" /> : <span>{(name || "?").slice(0, 1)}</span>}
    </div>
  );
}

function XhsDislikeIcon() {
  return (
    <svg className="xhs-comment-dislike-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M8.3 9.7h1.9" />
      <path d="M13.8 9.7h1.9" />
      <path d="M8.9 15.5c1.7-.85 4.5-.85 6.2 0" />
    </svg>
  );
}

function getImageFrameStyle(width?: number, height?: number): CSSProperties {
  if (!width || !height || width <= 0 || height <= 0) return DEFAULT_XHS_IMAGE_FRAME_STYLE;
  const heightRatio = Math.min(height / width, XHS_MAX_IMAGE_HEIGHT_RATIO);
  return { aspectRatio: `1 / ${heightRatio.toFixed(4)}` };
}

function getXhsPlainText(text: string): string {
  const normalized = normalizeBilingualTextInput(text);
  return splitBilingualText(normalized)?.original ?? normalized;
}

function getNoteCardVariant(note: Pick<XiaohongshuNote, "body" | "title">): XiaohongshuNoteCardVariant {
  const textLength = getXhsPlainText(note.body).length + getXhsPlainText(note.title).length;
  if (textLength > 95) return "tall";
  if (textLength > 54) return "regular";
  return "compact";
}

function getIconImageFrameStyle(note: Pick<XiaohongshuNote, "body" | "title">): CSSProperties {
  return ICON_XHS_IMAGE_FRAME_STYLES[getNoteCardVariant(note)];
}

function NoteDetailSlider({
  note,
  imageIds,
  imageMap,
}: {
  note: XiaohongshuNote;
  imageIds: string[];
  imageMap: Record<string, string>;
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  return (
    <div className="xhs-note-slider-container" style={getImageFrameStyle(note.imageWidth, note.imageHeight)}>
      <div
        className="xhs-note-slider-track"
        onScroll={(e) => {
          const el = e.currentTarget;
          const index = Math.round(el.scrollLeft / (el.clientWidth || 1));
          setActiveSlide(index);
        }}
      >
        {imageIds.map((id, idx) => (
          <div key={id || idx} className="xhs-note-slider-item">
            {imageMap[id] ? (
              <img src={imageMap[id]} alt={`Slide ${idx + 1}`} className="xhs-note-real-image" />
            ) : (
              <div className="cp-xhs-cover cp-xhs-cover--ivory" style={{ width: "100%", height: "100%" }} />
            )}
          </div>
        ))}
      </div>
      <div className="xhs-note-slider-indicator">
        {activeSlide + 1} / {imageIds.length}
      </div>
      <div className="xhs-note-slider-dots">
        {imageIds.map((_, idx) => (
          <span key={idx} className={`xhs-slider-dot ${idx === activeSlide ? "is-active" : ""}`} />
        ))}
      </div>
    </div>
  );
}

export function NoteImage({
  note,
  imageMap,
  hideTextImageDescription = false,
  collapseBilingualTranslation,
  isDetail,
}: {
  note: XiaohongshuNote;
  imageMap: Record<string, string>;
  hideTextImageDescription?: boolean;
  collapseBilingualTranslation: boolean;
  isDetail?: boolean;
}) {
  const imageIds = (note.imageAssetIds && note.imageAssetIds.length > 0)
    ? note.imageAssetIds
    : (note.imageAssetId ? [note.imageAssetId] : []);
  if (note.type === "video") {
    return (
      <div className={`cp-xhs-cover cp-xhs-cover--video cp-xhs-cover--${note.tone}`} style={VIDEO_XHS_IMAGE_FRAME_STYLE}>
        {note.imageAssetId && imageMap[note.imageAssetId] ? (
          <img src={imageMap[note.imageAssetId]} alt="" className="xhs-video-real-image" />
        ) : (
          <span>
            {note.videoDescription || note.imageDescription ? (
              <CheckPhoneBilingualText
                text={note.videoDescription || note.imageDescription || ""}
                tone="light"
                collapseBilingualTranslation={collapseBilingualTranslation}
              />
            ) : note.coverIcon}
          </span>
        )}
      </div>
    );
  }
  if (imageIds.length > 0 && imageIds.some(id => Boolean(imageMap[id]))) {
    if (isDetail && imageIds.length > 1) {
      return <NoteDetailSlider note={note} imageIds={imageIds} imageMap={imageMap} />;
    }
    const firstImgId = imageIds.find(id => Boolean(imageMap[id])) || imageIds[0];
    return (
      <div className="xhs-note-real-image-frame" style={getImageFrameStyle(note.imageWidth, note.imageHeight)}>
        <img src={imageMap[firstImgId]} alt="" className="xhs-note-real-image" />
        {!isDetail && imageIds.length > 1 ? (
          <div className="xhs-waterfall-multi-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="14" height="14" rx="2" />
              <path d="M7 21h12a2 2 0 0 0 2-2V7" />
            </svg>
          </div>
        ) : null}
      </div>
    );
  }
  if (note.imageDescription?.trim() && !hideTextImageDescription) {
    return (
      <div className={`cp-xhs-cover cp-xhs-cover--${note.tone} xhs-note-text-image`} style={TEXT_XHS_IMAGE_FRAME_STYLE}>
        <span>
          <CheckPhoneBilingualText
            text={note.imageDescription}
            tone="xiaohongshu"
            collapseBilingualTranslation={collapseBilingualTranslation}
          />
        </span>
      </div>
    );
  }
  return (
    <div className={`cp-xhs-cover cp-xhs-cover--${note.tone}`} style={getIconImageFrameStyle(note)}>
      <span className="cp-xhs-cover-icon">{note.coverIcon}</span>
    </div>
  );
}

export function NoteCard({
  note,
  imageMap,
  avatarSrc,
  onOpen,
  hideTextImageDescription,
  collapseBilingualTranslation,
}: {
  note: XiaohongshuNote;
  imageMap: Record<string, string>;
  avatarSrc: string;
  onOpen: () => void;
  hideTextImageDescription?: boolean;
  collapseBilingualTranslation: boolean;
}) {
  const variant = getNoteCardVariant(note);
  return (
    <button type="button" className={`cp-xhs-note-card cp-xhs-note-card--${variant}`} onClick={onOpen}>
      <NoteImage
        note={note}
        imageMap={imageMap}
        hideTextImageDescription={hideTextImageDescription}
        collapseBilingualTranslation={collapseBilingualTranslation}
      />
      <div className="cp-xhs-note-body">
        <strong>
          <CheckPhoneBilingualText
            text={note.title}
            tone="xiaohongshu"
            collapseBilingualTranslation={collapseBilingualTranslation}
          />
        </strong>
        <p>
          <CheckPhoneBilingualText
            text={note.body}
            tone="xiaohongshu"
            collapseBilingualTranslation={collapseBilingualTranslation}
          />
        </p>
        <div className="cp-xhs-note-foot">
          <div className="cp-xhs-note-author">
            <XhsAvatar className="cp-xhs-note-author-avatar" src={avatarSrc} name={note.authorName} />
            <span>{note.authorName}</span>
          </div>
          <em className={note.liked ? "is-liked" : ""}>
            <Heart size={12} strokeWidth={2.4} fill={note.liked ? "currentColor" : "none"} />
            {formatCount(note.likeCount)}
          </em>
        </div>
      </div>
    </button>
  );
}

function orderCommentsForDisplay(comments: XiaohongshuComment[]): XiaohongshuComment[] {
  const byId = new Map(comments.map(comment => [comment.id, comment]));
  const indexById = new Map(comments.map((comment, index) => [comment.id, index]));
  const childrenByParent = new Map<string, XiaohongshuComment[]>();
  const childIds = new Set<string>();

  function wouldCreateCycle(commentId: string, parentId: string) {
    const seen = new Set<string>([commentId]);
    let currentId = parentId;
    while (currentId) {
      if (seen.has(currentId)) return true;
      seen.add(currentId);
      currentId = byId.get(currentId)?.replyToCommentId || "";
    }
    return false;
  }

  comments.forEach((comment) => {
    const parentId = comment.replyToCommentId;
    if (!parentId || !byId.has(parentId) || wouldCreateCycle(comment.id, parentId)) return;
    childIds.add(comment.id);
    const children = childrenByParent.get(parentId) ?? [];
    children.push(comment);
    childrenByParent.set(parentId, children);
  });

  // 小红书式二级平铺：每条顶级评论下，把它的全部后代（回复、回复的回复…）
  // 平铺成一层，统一按添加顺序排——避免线程式 DFS 里"回复的回复"插队到
  // 更早的同级回复前面。
  const ordered: XiaohongshuComment[] = [];
  const visited = new Set<string>();

  function collectDescendants(id: string, acc: XiaohongshuComment[]) {
    for (const child of childrenByParent.get(id) ?? []) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      acc.push(child);
      collectDescendants(child.id, acc);
    }
  }

  for (const comment of comments) {
    if (childIds.has(comment.id) || visited.has(comment.id)) continue;
    visited.add(comment.id);
    ordered.push(comment);
    const descendants: XiaohongshuComment[] = [];
    collectDescendants(comment.id, descendants);
    descendants.sort((a, b) => (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0));
    ordered.push(...descendants);
  }

  // 兜底：循环引用等漏网的评论追加在末尾
  for (const comment of comments) {
    if (!visited.has(comment.id)) {
      visited.add(comment.id);
      ordered.push(comment);
    }
  }
  return ordered;
}

export function CommentList({
  comments,
  getAvatar,
  onReply,
  onDeleteComment,
  onVoteComment,
  collapseBilingualTranslation,
}: {
  comments: XiaohongshuComment[];
  getAvatar: (comment: XiaohongshuComment) => string;
  onReply: (comment: XiaohongshuComment) => void;
  onDeleteComment: (comment: XiaohongshuComment) => void;
  onVoteComment: (comment: XiaohongshuComment, vote: "like" | "dislike") => void;
  collapseBilingualTranslation: boolean;
}) {
  if (comments.length === 0) return <div className="cp-xhs-mini-empty">还没有评论</div>;
  const orderedComments = orderCommentsForDisplay(comments);
  return (
    <>
      {orderedComments.map((comment) => {
        const parentComment = comment.replyToCommentId
          ? comments.find(item => item.id === comment.replyToCommentId)
          : null;
        const targetName = parentComment?.authorName ?? (!comment.replyToCommentId ? comment.replyTo : undefined);
        const depth = parentComment || (!comment.replyToCommentId && comment.replyTo) ? 1 : 0;
        return (
          <div key={comment.id} className={`cp-xhs-comment-card cp-xhs-comment-card--depth-${depth}`}>
            <XhsAvatar className="cp-xhs-comment-avatar" src={getAvatar(comment)} name={comment.authorName} />
            <div className="cp-xhs-comment-content">
              <strong>
                {comment.authorName}
                {targetName ? <><span className="cp-xhs-comment-reply-label">回复</span>{targetName}</> : null}
              </strong>
              <p>
                <CheckPhoneBilingualText
                  text={comment.text}
                  tone="xiaohongshu"
                  variant="inline"
                  collapseBilingualTranslation={collapseBilingualTranslation}
                />
              </p>
              <div className="xhs-comment-actions">
                <div className="xhs-comment-text-actions">
                  <time className="xhs-comment-time" dateTime={comment.createdAt}>{formatTime(comment.createdAt)}</time>
                  <button type="button" onClick={() => onReply(comment)}>回复</button>
                  <button type="button" onClick={() => onDeleteComment(comment)}>删除</button>
                </div>
                <div className="xhs-comment-vote-actions">
                  <button
                    type="button"
                    className={`xhs-comment-vote-btn ${comment.liked ? "is-active" : ""}`}
                    onClick={() => onVoteComment(comment, "like")}
                    aria-label="点赞评论"
                  >
                    <Heart size={20} strokeWidth={2.15} fill={comment.liked ? "currentColor" : "none"} />
                    {comment.likeCount > 0 ? <span>{formatCount(comment.likeCount)}</span> : null}
                  </button>
                  <button
                    type="button"
                    className={`xhs-comment-vote-btn ${comment.disliked ? "is-active is-disliked" : ""}`}
                    onClick={() => onVoteComment(comment, "dislike")}
                    aria-label="点踩评论"
                  >
                    <XhsDislikeIcon />
                    {comment.dislikeCount > 0 ? <span>{formatCount(comment.dislikeCount)}</span> : null}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}