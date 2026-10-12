import { saveChatImageToIndexedDB } from "./chat-asset-storage";
import { syncChatGeneratedImagePromptText, updateChatMessage, type ChatMessage } from "./chat-storage";
import { generatedImageFilename, generateImageFromConfiguredApi } from "./image-generation-service";
import { updateMomentPost } from "./moments-storage";
import type { MomentPost } from "./moments-types";
import { loadMomentPosts } from "./moments-storage";
import { isCurrentMomentPhotoRevision, newMomentPhotoRevision } from "./moments-manual-photo";

function errorToMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function dispatchChatMessagesUpdated(sessionId: string, message: ChatMessage): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("chat-messages-updated", {
        detail: { sessionId, message },
    }));
}

function dispatchMomentsUpdated(): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("moments-updated"));
}

export function createPendingChatGeneratedImageData(
    mediaData: ChatMessage["mediaData"] | undefined,
    description?: string,
): ChatMessage["mediaData"] {
    const label = (description || mediaData?.label || "").trim();
    return {
        ...mediaData,
        label,
        imageGenerationStatus: "pending",
        imageGenerationError: undefined,
    };
}

export function isPendingChatGeneratedImageMessage(message: Pick<ChatMessage, "mediaType" | "mediaData">): boolean {
    return message.mediaType === "image" && message.mediaData?.imageGenerationStatus === "pending";
}

export async function generateAndApplyChatGeneratedImage(
    message: ChatMessage,
    characterId?: string,
    options?: { signal?: AbortSignal; description?: string; useReferenceImage?: boolean },
): Promise<ChatMessage> {
    const previousDescription = message.mediaData?.label?.trim() || "";
    const description = (options?.description ?? previousDescription).trim();
    if (!description) throw new Error("缺少图片描述，无法重新生成");

    const effectiveUseReference = options?.useReferenceImage !== undefined
        ? options.useReferenceImage
        : (message.mediaData?.useReferenceImage === true);

    if (
        (previousDescription && previousDescription !== description) ||
        (options?.useReferenceImage !== undefined && options.useReferenceImage !== (message.mediaData?.useReferenceImage === true))
    ) {
        syncChatGeneratedImagePromptText(message.id, previousDescription, description, options?.useReferenceImage);
    }

    // 重试路径：先落库为 pending 并广播，气泡立刻切到"生成中"态（首次生图本来就是 pending，无需重写）。
    // 之后无论成功/失败都会再写一次状态，不会卡在 pending。
    if (message.mediaData?.imageGenerationStatus !== "pending") {
        const marked = updateChatMessage(message.id, {
            mediaData: {
                ...message.mediaData,
                label: description,
                useReferenceImage: effectiveUseReference,
                imageGenerationStatus: "pending",
                imageGenerationError: undefined,
            },
        });
        if (marked) dispatchChatMessagesUpdated(marked.sessionId, marked);
    }

    try {
        const generated = await generateImageFromConfiguredApi({
            description,
            characterId,
            useReferenceImage: effectiveUseReference,
            signal: options?.signal,
        });
        if (!generated) throw new Error("生图配置未启用或不完整");

        const fileName = generatedImageFilename(description, generated.mimeType);
        const previousData = message.mediaData ?? {};
        const nextData: ChatMessage["mediaData"] = {
            ...previousData,
            label: description,
            fileType: "image",
            fileName,
            useReferenceImage: effectiveUseReference,
            imageGenerationMediaRef: generated.mediaRef,
            imageGenerationPrompt: generated.prompt,
            imageGenerationUsedReference: generated.usedReferenceImage,
            imageGenerationStatus: "generated",
            imageGenerationError: undefined,
        };
        const updated = updateChatMessage(message.id, {
            content: fileName,
            mediaType: "media_file",
            mediaUrl: generated.dataUrl,
            mediaData: nextData,
        });
        if (!updated) throw new Error("原消息不存在，无法替换图片");
        dispatchChatMessagesUpdated(updated.sessionId, updated);
        return updated;
    } catch (error) {
        const failed = updateChatMessage(message.id, {
            mediaData: {
                ...message.mediaData,
                label: description,
                useReferenceImage: effectiveUseReference,
                imageGenerationStatus: "failed",
                imageGenerationError: errorToMessage(error),
            },
        });
        if (failed) dispatchChatMessagesUpdated(failed.sessionId, failed);
        throw error;
    }
}

export async function retryChatGeneratedImage(
    message: ChatMessage,
    characterId?: string,
    nextDescription?: string,
    useReferenceImage?: boolean,
): Promise<ChatMessage> {
    return generateAndApplyChatGeneratedImage(message, characterId, {
        description: nextDescription,
        useReferenceImage,
    });
}

export async function retryMomentGeneratedPhoto(
    post: MomentPost,
    nextDescription?: string,
    useReferenceImage?: boolean,
): Promise<MomentPost> {
    const current = loadMomentPosts().find(item => item.id === post.id);
    if (!current) throw new Error("原朋友圈不存在，无法生成图片");
    const description = (nextDescription ?? (current.photoSource === "manual_upload" ? undefined : current.photoDescription))?.trim();
    if (!description) throw new Error("缺少图片描述，无法重新生成");

    const effectiveUseReference = useReferenceImage !== undefined
        ? useReferenceImage
        : (current.photoUseReferenceImage === true);

    // Claim a unique image revision. An older generation or a manual upload
    // invalidates this claim, so its late completion cannot overwrite the post.
    const revision = newMomentPhotoRevision();
    const pending = updateMomentPost(post.id, {
        photoDescription: description,
        photoGenerationPrompt: undefined,
        photoUseReferenceImage: effectiveUseReference,
        photoSource: "ai_generated",
        photoGenerationRevision: revision,
        photoGenerationStatus: "pending",
        photoGenerationError: undefined,
    });
    if (!pending) throw new Error("原朋友圈不存在，无法生成图片");
    dispatchMomentsUpdated();

    try {
        const generated = await generateImageFromConfiguredApi({
            description,
            characterId: post.authorType === "character" ? post.authorId : undefined,
            useReferenceImage: effectiveUseReference,
        });
        if (!generated) throw new Error("生图配置未启用或不完整");

        const assetId = await saveChatImageToIndexedDB(generated.blob);
        if (!assetId) throw new Error("图片存储失败");
        if (!isCurrentMomentPhotoRevision(post.id, revision)) {
            const latest = loadMomentPosts().find(item => item.id === post.id);
            if (latest) return latest;
            throw new Error("原朋友圈已删除");
        }
        const updated = updateMomentPost(post.id, {
            photoUrl: `asset://${assetId}`,
            photoDescription: description,
            photoUseReferenceImage: effectiveUseReference,
            photoGenerationStatus: "generated",
            photoGenerationPrompt: generated.prompt,
            photoGenerationError: undefined,
        });
        if (!updated) throw new Error("原朋友圈不存在，无法替换图片");
        dispatchMomentsUpdated();
        return updated;
    } catch (error) {
        if (!isCurrentMomentPhotoRevision(post.id, revision)) {
            const latest = loadMomentPosts().find(item => item.id === post.id);
            if (latest) return latest; // A manual replacement or newer request won.
            throw error;
        }
        updateMomentPost(post.id, {
            photoDescription: description,
            photoUseReferenceImage: effectiveUseReference,
            photoGenerationStatus: "failed",
            photoGenerationError: errorToMessage(error),
        });
        dispatchMomentsUpdated();
        throw error;
    }
}
