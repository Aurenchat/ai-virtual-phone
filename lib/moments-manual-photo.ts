/**
 * Native Moments manual-photo operations. Storage uses the same IndexedDB asset
 * pipeline as regular Float media; only the post's asset:// reference is saved.
 */
import type { MomentPost } from "./moments-types";
import { loadMomentPosts, updateMomentPostPersisted } from "./moments-storage";
import { getChatImageFromIndexedDB, saveChatImageToIndexedDB } from "./chat-asset-storage";

export function newMomentPhotoRevision(): string {
    return `moment_photo_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

/** An in-flight request may commit only while it still owns the photo revision. */
export function isCurrentMomentPhotoRevision(postId: string, expected: string): boolean {
    const current = loadMomentPosts().find(post => post.id === postId);
    return !!current && current.photoGenerationRevision === expected && current.photoSource !== "manual_upload";
}

const uploadingMomentPhotos = new Set<string>();

/**
 * Replace the picture of a character-authored Moment with a local image.
 * Never mutate post metadata until the new asset has persisted successfully.
 */
export async function replaceMomentPhotoFromLocalFile(postId: string, file: File): Promise<MomentPost> {
    const initial = loadMomentPosts().find(post => post.id === postId);
    if (!initial || initial.authorType !== "character") {
        throw new Error("仅能替换仍然存在的角色朋友圈配图");
    }
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
        throw new Error("请选择 JPG、PNG、WEBP、GIF 等图片文件");
    }
    if (uploadingMomentPhotos.has(postId)) throw new Error("这条朋友圈的图片正在上传中");
    uploadingMomentPhotos.add(postId);
    try {

        // The existing theme-asset save pipeline handles resizing/compression and
        // the GIF size limit. No giant base64 string enters the Moments row.
        const assetId = await saveChatImageToIndexedDB(file);
        // The shared asset saver may return an ID even when IndexedDB failed to open.
        // Verify the stored image before replacing the old reference.
        if (!assetId || !await getChatImageFromIndexedDB(assetId)) throw new Error("图片存储失败");

        const latest = loadMomentPosts().find(post => post.id === postId);
        if (!latest || latest.authorType !== "character") {
            throw new Error("朋友圈已删除，未替换图片");
        }
        const updated = await updateMomentPostPersisted(postId, {
            photoUrl: `asset://${assetId}`,
            photoDescription: undefined,
            photoGenerationPrompt: undefined,
            photoUseReferenceImage: undefined,
            photoGenerationError: undefined,
            photoGenerationStatus: "generated",
            photoCompressedAt: undefined,
            photoCleanedAt: undefined,
            photoSource: "manual_upload",
            // Invalidate every already-running AI image task for this post.
            photoGenerationRevision: newMomentPhotoRevision(),
        });
        if (!updated) throw new Error("朋友圈已删除，未替换图片");
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("moments-updated"));
        }
        return updated;
    } finally {
        uploadingMomentPhotos.delete(postId);
    }
}
