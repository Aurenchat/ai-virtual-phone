/**
 * Native Xiaohongshu note vision adapter.
 * Only the per-note reply/reaction flows use this helper. Feed activity remains text-only.
 * No changes to persisted note shapes or image assets are needed.
 */
import type { LLMContentPart, LLMMessage } from "./llm-prompt-assembler";

export const XIAOHONGSHU_MAX_VISION_IMAGES = 9;

export type XiaohongshuVisionNote = {
  imageAssetId?: string;
  imageAssetIds?: string[];
};

export type XiaohongshuVisionImage = {
  /** 1-based original position within the note. */
  position: number;
  url: string;
};

export type XiaohongshuVisionBatch = {
  images: XiaohongshuVisionImage[];
  total: number;
  skippedByLimit: number;
  unavailablePositions: number[];
};

/** Prefer the multi-image field, while preserving legacy single-image notes. */
export function getXiaohongshuNoteImageIds(note: XiaohongshuVisionNote): string[] {
  const ids = Array.isArray(note.imageAssetIds)
    ? note.imageAssetIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];
  return ids.length ? ids : (note.imageAssetId ? [note.imageAssetId] : []);
}

/**
 * Load at most nine images, sequentially to avoid simultaneous IDB/base64 work
 * on memory-constrained iOS WebKit. One broken asset must not hide later photos.
 */
export async function resolveXiaohongshuVisionImages(
  note: XiaohongshuVisionNote,
  loadImage: (assetId: string) => Promise<string | null>,
): Promise<XiaohongshuVisionBatch> {
  const ids = getXiaohongshuNoteImageIds(note);
  const total = ids.length;
  const images: XiaohongshuVisionImage[] = [];
  const unavailablePositions: number[] = [];
  const count = Math.min(total, XIAOHONGSHU_MAX_VISION_IMAGES);
  for (let index = 0; index < count; index += 1) {
    let url: string | null = null;
    try {
      url = await loadImage(ids[index]);
    } catch {
      // Missing / corrupt image in IndexedDB; continue with remaining positions.
    }
    if (url) {
      images.push({ position: index + 1, url });
    } else {
      unavailablePositions.push(index + 1);
    }
  }
  const batch = { images, total, skippedByLimit: total - count, unavailablePositions };
  if (unavailablePositions.length || batch.skippedByLimit) {
    console.warn("[Xiaohongshu] Some note images were not supplied to vision", {
      total,
      loaded: images.length,
      unavailablePositions,
      skippedByLimit: batch.skippedByLimit,
    });
  }
  return batch;
}

/**
 * Keep each label immediately before its image_url so the model can reason
 * across the whole carousel, not misattribute later images to the cover.
 */
export function makeXiaohongshuVisionMessage(
  text: string,
  batch?: XiaohongshuVisionBatch | null,
): LLMMessage {
  const debugMeta = { marker: "xiaohongshu_context" };
  if (!batch?.images.length) {
    const notice = batch?.total
      ? "\n\n[图片读取状态]本轮未能读取真实图片，不要猜测图片的具体内容。"
      : "";
    return { role: "user", content: `${text}${notice}`, _debugMeta: debugMeta };
  }

  const parts: LLMContentPart[] = [
    { type: "text", text },
    {
      type: "text",
      text: "[图片识别说明]以下是真实笔记配图，按原始顺序排列。请结合所有实际可见的图片，而不只是封面；不要臆测未提供的图片。",
    },
  ];
  for (const image of batch.images) {
    parts.push({ type: "text", text: `[笔记图片 ${image.position}/${batch.total}]` });
    parts.push({ type: "image_url", image_url: { url: image.url, detail: "low" } });
  }
  if (batch.unavailablePositions.length) {
    parts.push({
      type: "text",
      text: `[图片读取状态]第 ${batch.unavailablePositions.join("、")} 张未能读取；请勿推测这些图片的内容。`,
    });
  }
  if (batch.skippedByLimit) {
    parts.push({
      type: "text",
      text: `[图片读取状态]本轮最多识别 ${XIAOHONGSHU_MAX_VISION_IMAGES} 张；另外 ${batch.skippedByLimit} 张未送入模型，请勿推测。`,
    });
  }
  return { role: "user", content: parts, _debugMeta: debugMeta };
}
