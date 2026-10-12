/** Native Xiaohongshu media: light thumbnails + original bytes in one backup-visible asset record. */
import { getChatImageFromIndexedDB, saveChatImageToIndexedDB } from "./chat-asset-storage";
import { attachXiaohongshuOriginalBlob, getXiaohongshuOriginalBlob, deleteThemeAsset } from "./theme-storage";

export const XHS_THUMBNAIL_MAX_SIDE = 960;
export const XHS_VISION_MAX_SIDE = 1600;
export const XHS_VISION_MAX_BYTES = 512 * 1024;
export const XHS_MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;

export function xhsOriginalFileError(file: Blob): string | null {
  if (!file.type.startsWith("image/")) return "请选择图片文件。";
  if (file.size <= 0) return "图片文件为空。";
  if (file.size > XHS_MAX_ORIGINAL_BYTES) return "单张图片不能超过 20 MB。";
  return null;
}

function rasterToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("小红书图片编码失败")), "image/jpeg", quality);
  });
}

function loadBlobImage(blob: Blob): Promise<{ image: HTMLImageElement; release: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    let done = false;
    const release = () => { img.onload = img.onerror = null; img.src = ""; URL.revokeObjectURL(url); };
    const fail = () => { if (done) return; done = true; release(); reject(new Error("图片格式无法在当前设备上解码，请尝试 JPEG 或 PNG")); };
    img.onload = () => { if (done) return; done = true; resolve({ image: img, release }); };
    img.onerror = fail;
    img.src = url;
  });
}

/** Preserve the *entire* composition. Only resize the display thumbnail, never crop it. */
export async function makeXiaohongshuThumbnail(original: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const { image, release } = await loadBlobImage(original);
  let canvas: HTMLCanvasElement | undefined;
  try {
    const scale = Math.min(1, XHS_THUMBNAIL_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建图片缩略图");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return { blob: await rasterToBlob(canvas, 0.76), width, height };
  } finally { if (canvas) canvas.width = canvas.height = 0; release(); }
}

/** Store original Blob *with* its thumbnail record inside existing ai_phone_theme_db_v1/assets.
 * The existing backup/cloud-backup/rescue serializers already support Blob properties. */
export async function saveXiaohongshuImagePair(original: Blob, thumbnail: Blob): Promise<string> {
  const failure = xhsOriginalFileError(original);
  if (failure) throw new Error(failure);
  const id = await saveChatImageToIndexedDB(thumbnail);
  try {
    await attachXiaohongshuOriginalBlob(id, original);
    return id;
  } catch (error) {
    // A thumbnail without its original must never be presented as a successful high-res upload.
    try { await deleteThemeAsset(id); } catch { /* Report primary save failure. */ }
    throw error;
  }
}

export async function readXiaohongshuFullImage(id: string): Promise<Blob | string | null> {
  try {
    const original = await getXiaohongshuOriginalBlob(id);
    if (original) return original;
  } catch { /* A failed optional HD read can still use the existing thumbnail. */ }
  return getChatImageFromIndexedDB(id);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("图片读取失败"));
    reader.readAsDataURL(blob);
  });
}

/** Distinct budget for model input: use the original full composition but do not send 9 raw camera files. */
export async function getXiaohongshuVisionDataUrl(id: string): Promise<string | null> {
  try {
    const original = await getXiaohongshuOriginalBlob(id);
    if (!original) return getChatImageFromIndexedDB(id); // legacy note
    const { image, release } = await loadBlobImage(original);
    let canvas: HTMLCanvasElement | undefined;
    try {
      const scale = Math.min(1, XHS_VISION_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("无法为模型缩放图片");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      let quality = 0.82;
      let encoded = await rasterToBlob(canvas, quality);
      while (encoded.size > XHS_VISION_MAX_BYTES) {
        if (quality > 0.5) quality = Math.max(0.5, quality - 0.1);
        else {
          if (canvas.width <= 1 && canvas.height <= 1) throw new Error("模型图片编码体积超限");
          canvas.width = Math.max(1, Math.round(canvas.width * 0.8));
          canvas.height = Math.max(1, Math.round(canvas.height * 0.8));
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        }
        encoded = await rasterToBlob(canvas, quality);
      }
      return await blobToDataUrl(encoded);
    } finally { if (canvas) canvas.width = canvas.height = 0; release(); }
  } catch (error) {
    console.warn("[Xiaohongshu] Original image vision conversion failed; using thumbnail:", error);
    return getChatImageFromIndexedDB(id);
  }
}
