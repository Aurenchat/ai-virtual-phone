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
import { getOrCreateChatWallpaperPreview, getChatWallpaperRevision, onChatWallpaperInvalidated } from "@/lib/chat-wallpaper-preview";

export type ChatBackgroundLease = {
    url: string;
    release: () => void;
};

type CachedResource = {
    assetId: string;
    revision: string;
    url: string;
    objectUrl?: boolean;
    users: number;
    idleTimer: ReturnType<typeof setTimeout> | null;
};

const IDLE_REUSE_MS = 8_000;
const BASE64_CHUNK = 64 * 1024; // Must be a multiple of four.
const resources = new Map<string, CachedResource>();
const inFlight = new Map<string, Promise<CachedResource | null>>();
const inFlightRevisions = new Map<string, string>();

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

function revokeResource(resource: CachedResource): void {
    if (!resource.objectUrl) return;
    resource.objectUrl = false;
    URL.revokeObjectURL(resource.url);
}

function retire(resource: CachedResource): void {
    if (resource.users !== 0 || resources.get(resource.assetId) !== resource) return;
    if (resource.idleTimer !== null) clearTimeout(resource.idleTimer);
    resources.delete(resource.assetId);
    revokeResource(resource);
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
            // If the authoritative source was replaced while in use, the old
            // lease must retire, not republish itself under the same asset ID.
            if (resources.get(resource.assetId) !== resource) {
                revokeResource(resource);
                return;
            }
            // Map order tracks the most recently released wallpaper.
            resources.delete(resource.assetId);
            resources.set(resource.assetId, resource);
            resource.idleTimer = setTimeout(() => retire(resource), IDLE_REUSE_MS);
            trimIdle();
        },
    };
}

/** Forget a hot resource if its authoritative theme asset was replaced. */
export function invalidateChatBackgroundResource(assetId: string): void {
    inFlight.delete(assetId);
    inFlightRevisions.delete(assetId);
    const resource = resources.get(assetId);
    if (!resource) return;
    resources.delete(assetId);
    if (resource.idleTimer !== null) clearTimeout(resource.idleTimer);
    if (resource.users === 0) revokeResource(resource);
    // Live consumers keep their old URL until releasing their leases.
}

onChatWallpaperInvalidated(invalidateChatBackgroundResource);

/**
 * For old data URLs and remote backgrounds preserve the existing path.
 * For theme asset IDs, issue only one IDB read/conversion per concurrent load.
 * A failed preview leaves chat visible; unexpected service failures retain the
 * perf.1 fallback for compatibility without changing authoritative artwork.
 */
export async function acquireChatBackground(source: string, retryOnInvalidation = true): Promise<ChatBackgroundLease | null> {
    if (!source) return null;
    if (source.startsWith("data:") || /^https?:\/\//i.test(source)) {
        return { url: source, release: () => {} };
    }

    const revision = getChatWallpaperRevision(source);
    const cached = resources.get(source);
    if (cached?.revision === revision) return lease(cached);
    if (cached) invalidateChatBackgroundResource(source);

    let pending = inFlight.get(source);
    if (inFlightRevisions.get(source) !== revision) pending = undefined;
    if (!pending) {
        pending = (async (): Promise<CachedResource | null> => {
            // Persistent derivative first: no full-size IDB source read/decode on
            // subsequent room visits, including after WebContent restarts.
            try {
                const visual = await getOrCreateChatWallpaperPreview(source);
                if (visual?.kind === "url") {
                    return { assetId: source, revision, url: visual.url, users: 0, idleTimer: null };
                }
                if (visual?.kind === "blob" && typeof URL.createObjectURL === "function") {
                    return {
                        assetId: source,
                        revision,
                        url: URL.createObjectURL(visual.blob),
                        objectUrl: true,
                        users: 0,
                        idleTimer: null,
                    };
                }
                if (!visual) return null;
            } catch { /* Preserve perf.1 behavior when preview service fails. */ }

            // Last-resort perf.1 fallback, preserving all legacy artwork.
            const dataUrl = await getChatImageFromIndexedDB(source);
            if (!dataUrl) return null;
            try {
                const blob = await base64ImageToBlob(dataUrl);
                if (blob && typeof URL.createObjectURL === "function") {
                    return {
                        assetId: source,
                        revision,
                        url: URL.createObjectURL(blob),
                        objectUrl: true,
                        users: 0,
                        idleTimer: null,
                    };
                }
            } catch { /* Display the original URL as a safe fallback. */ }
            return { assetId: source, revision, url: dataUrl, users: 0, idleTimer: null };
        })();
        inFlight.set(source, pending);
        inFlightRevisions.set(source, revision);
        const clearPending = () => {
            if (inFlight.get(source) === pending) { inFlight.delete(source); inFlightRevisions.delete(source); }
        };
        void pending.then(clearPending, clearPending);
    }

    const resource = await pending;
    if (getChatWallpaperRevision(source) !== revision || (resource && resource.revision !== revision)) {
        if (resource?.users === 0) revokeResource(resource);
        return retryOnInvalidation ? acquireChatBackground(source, false) : null;
    }
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
