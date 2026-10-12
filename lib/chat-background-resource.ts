/**
 * Presentation-only resources for ChatRoom wallpapers.
 *
 * ChatSession.backgroundImage and the theme asset record remain untouched. The
 * latter is still the authoritative, backup-compatible data URL. We only turn
 * it into a scoped object URL for CSS painting, so a multi-megabyte base64 URL
 * is never used as an inline CSS property during normal room rendering.
 *
 * An unmounted wallpaper can be reused briefly when navigating back. Keep at
 * most ONE idle entry; active entries are always held until their owners leave.
 */
import { getChatImageFromIndexedDB } from "@/lib/chat-asset-storage";

export type ChatBackgroundLease = {
    url: string;
    release: () => void;
};

type CachedResource = {
    assetId: string;
    url: string;
    objectUrl?: boolean;
    users: number;
    idleTimer: ReturnType<typeof setTimeout> | null;
};

const IDLE_REUSE_MS = 8_000;
const BASE64_CHUNK = 64 * 1024; // Must be a multiple of four.
const resources = new Map<string, CachedResource>();
const inFlight = new Map<string, Promise<CachedResource | null>>();

/** Decode bounded pieces; do not allocate a second giant decoded binary string. */
async function base64ImageToBlob(dataUrl: string): Promise<Blob | null> {
    const comma = dataUrl.indexOf(",");
    if (comma < 5) return null;
    const header = dataUrl.slice(5, comma);
    if (!/(?:^|;)base64(?:;|$)/i.test(header)) return null;
    const mime = header.split(";")[0] || "application/octet-stream";
    const chunks: BlobPart[] = [];
    let sliceStartedAt = Date.now();
    for (let i = comma + 1; i < dataUrl.length; i += BASE64_CHUNK) {
        const decoded = atob(dataUrl.slice(i, i + BASE64_CHUNK));
        const bytes = new Uint8Array(decoded.length);
        for (let j = 0; j < decoded.length; j++) bytes[j] = decoded.charCodeAt(j);
        chunks.push(bytes);
        // Bound uninterrupted decoding work without changing any image bytes.
        if (i + BASE64_CHUNK < dataUrl.length && Date.now() - sliceStartedAt >= 8) {
            await new Promise<void>(resolve => setTimeout(resolve, 0));
            sliceStartedAt = Date.now();
        }
    }
    return new Blob(chunks, { type: mime });
}

function retire(resource: CachedResource): void {
    if (resource.users !== 0 || resources.get(resource.assetId) !== resource) return;
    if (resource.idleTimer !== null) clearTimeout(resource.idleTimer);
    resources.delete(resource.assetId);
    URL.revokeObjectURL(resource.url);
}

function trimIdle(): void {
    const idle = [...resources.values()].filter(resource => resource.users === 0);
    const hasActive = [...resources.values()].some(resource => resource.users > 0);
    // Never retain an old wallpaper next to a different active one.
    for (const resource of hasActive ? idle : idle.slice(0, -1)) retire(resource);
}

function lease(resource: CachedResource): ChatBackgroundLease {
    if (resource.idleTimer !== null) {
        clearTimeout(resource.idleTimer);
        resource.idleTimer = null;
    }
    resource.users++;
    trimIdle();
    let released = false;
    return {
        url: resource.url,
        release: () => {
            if (released) return;
            released = true;
            resource.users--;
            if (resource.users !== 0) return;
            // Map order tracks the most recently released wallpaper.
            resources.delete(resource.assetId);
            resources.set(resource.assetId, resource);
            resource.idleTimer = setTimeout(() => retire(resource), IDLE_REUSE_MS);
            trimIdle();
        },
    };
}

/**
 * For old data URLs and remote backgrounds preserve the existing path.
 * For theme asset IDs, issue only one IDB read/conversion per concurrent load.
 * On decode failure, fall back to the original data URL (same rendering as before).
 */
export async function acquireChatBackground(source: string): Promise<ChatBackgroundLease | null> {
    if (!source) return null;
    if (source.startsWith("data:") || /^https?:\/\//i.test(source)) {
        return { url: source, release: () => {} };
    }

    const cached = resources.get(source);
    if (cached) return lease(cached);

    let pending = inFlight.get(source);
    if (!pending) {
        pending = (async (): Promise<CachedResource | null> => {
            const dataUrl = await getChatImageFromIndexedDB(source);
            if (!dataUrl) return null;
            try {
                const blob = await base64ImageToBlob(dataUrl);
                if (blob && typeof URL.createObjectURL === "function") {
                    const resource: CachedResource = {
                        assetId: source,
                        url: URL.createObjectURL(blob),
                        objectUrl: true,
                        users: 0,
                        idleTimer: null,
                    };
                    return resource;
                }
            } catch { /* Preserve old, non-blob rendering as fallback. */ }
            return { assetId: source, url: dataUrl, users: 0, idleTimer: null };
        })();
        inFlight.set(source, pending);
        const clearPending = () => { if (inFlight.get(source) === pending) inFlight.delete(source); };
        void pending.then(clearPending, clearPending);
    }

    const resource = await pending;
    if (!resource) return null;
    // Publish only when the first consumer is ready to hold a reference.
    // Otherwise another asset could trim a zero-user, still-pending resource.
    if (resource.objectUrl) {
        resources.set(source, resource);
        return lease(resource);
    }
    // Legacy/failure fallback is NOT retained in the hot cache.
    return { url: resource.url, release: () => {} };
}
