/**
 * Disposable, screen-sized presentation copies of chat wallpapers.
 *
 * Original ThemeAssetRecords remain authoritative. Never store a preview URL in
 * ChatSession.backgroundImage. This DB is a bounded cache, not user data: it may
 * be deleted/rebuilt without losing a wallpaper or changing backup formats.
 */
import { getChatImageFromIndexedDB } from "@/lib/chat-asset-storage";

const CACHE_DB = "AiPhoneChatWallpaperPreviewCacheDB";
const CACHE_STORE = "previews";
const CACHE_DB_VERSION = 1;
const PREVIEW_VERSION = 1;
const MAX_PREVIEWS = 12;
const MAX_EDGE_PX = 1536;
const ENCODE_QUALITY = 0.88;
const BASE64_CHUNK_CHARS = 64 * 1024; // Divisible by four.

type PreviewRow = {
    assetId: string;
    version: number;
    blob: Blob;
    createdAt: number;
    sourceStamp: string;
    digest: string;
};

export type ChatWallpaperVisual =
    | { kind: "blob"; blob: Blob }
    | { kind: "url"; url: string };

const preparing = new Map<string, Promise<ChatWallpaperVisual | null>>();
const preparingRevisions = new Map<string, string>();
const revisions = new Map<string, number>();
const invalidating = new Map<string, Promise<void>>();
const invalidationListeners = new Set<(assetId: string) => void>();
const failedUntil = new Map<string, number>();
const STAMP_PREFIX = "float_chat_wallpaper_preview_revision:";
let stampSequence = 0;

// Disposable revision metadata, separate from all original/backup records.
// A source overwrite cannot reuse an old disk row even if cache deletion fails.
function sourceStamp(assetId: string, replace = false): string | null {
    try {
        const key = STAMP_PREFIX + assetId;
        const previous = localStorage.getItem(key);
        if (previous && !replace) return previous;
        const stamp = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID() : `${Date.now()}-${++stampSequence}-${Math.random()}`;
        localStorage.setItem(key, stamp);
        return stamp;
    } catch { return null; } // No trustworthy revision metadata: bypass disk cache.
}

export function getChatWallpaperRevision(assetId: string): string {
    return `${sourceStamp(assetId) ?? "volatile"}:${revisions.get(assetId) ?? 0}`;
}

export function onChatWallpaperInvalidated(listener: (assetId: string) => void): () => void {
    invalidationListeners.add(listener);
    return () => { invalidationListeners.delete(listener); };
}

async function blobDigest(blob: Blob): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

// A single WebContent process must never decode several full-size wallpapers
// simultaneously. Serialize source reads + decode + writes on cache misses.
let preparationTail: Promise<void> = Promise.resolve();
function serializePreparation<T>(job: () => Promise<T>): Promise<T> {
    const next = preparationTail.then(job, job);
    preparationTail = next.then(() => undefined, () => undefined);
    return next;
}

export function calculateWallpaperPreviewSize(width: number, height: number, maxEdge = MAX_EDGE_PX): { width: number; height: number } {
    if (![width, height, maxEdge].every(v => Number.isFinite(v) && v > 0)) throw new RangeError("Invalid wallpaper dimensions");
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Wallpaper cache IndexedDB request failed"));
    });
}

function transactionFinished(tx: IDBTransaction): Promise<void> {
    const done = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("Wallpaper cache transaction failed"));
        tx.onabort = () => reject(tx.error || new Error("Wallpaper cache transaction aborted"));
    });
    void done.catch(() => undefined); // Request failures can abort before the caller awaits completion.
    return done;
}

async function openCache(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === "undefined") return null;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
        let settled = false;
        const request = indexedDB.open(CACHE_DB, CACHE_DB_VERSION);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(CACHE_STORE)) {
                const store = database.createObjectStore(CACHE_STORE, { keyPath: "assetId" });
                store.createIndex("createdAt", "createdAt");
            }
        };
        request.onsuccess = () => {
            if (settled) request.result.close();
            else { settled = true; resolve(request.result); }
        };
        request.onerror = () => { settled = true; reject(request.error || new Error("Cannot open wallpaper cache")); };
        request.onblocked = () => { settled = true; reject(new Error("Wallpaper cache upgrade blocked")); };
    });
    db.onversionchange = () => db.close();
    return db;
}

async function readPreview(assetId: string): Promise<Blob | null> {
    const stamp = sourceStamp(assetId);
    if (!stamp) return null;
    const db = await openCache();
    if (!db) return null;
    try {
        const tx = db.transaction(CACHE_STORE, "readonly");
        const row = await requestResult(tx.objectStore(CACHE_STORE).get(assetId)) as PreviewRow | undefined;
        if (!row || row.version !== PREVIEW_VERSION || !(row.blob instanceof Blob)
            || !row.blob.size || row.sourceStamp !== stamp || !row.digest) return null;
        if (await blobDigest(row.blob) !== row.digest) return null;
        return row.blob;
    } finally {
        db.close();
    }
}

async function persistPreview(assetId: string, blob: Blob, revision: string): Promise<void> {
    const sourceVersion = sourceStamp(assetId);
    if (!sourceVersion) return;
    const digest = await blobDigest(blob);
    if (getChatWallpaperRevision(assetId) !== revision) return;
    const db = await openCache();
    if (!db) return;
    try {
        const tx = db.transaction(CACHE_STORE, "readwrite");
        const complete = transactionFinished(tx);
        tx.objectStore(CACHE_STORE).put({ assetId, blob, version: PREVIEW_VERSION, createdAt: Date.now(), sourceStamp: sourceVersion, digest } satisfies PreviewRow);
        await complete;
        // A bounded cache: keep disk storage predictable without reading Blob bytes.
        const trimTx = db.transaction(CACHE_STORE, "readwrite");
        const trimComplete = transactionFinished(trimTx);
        const store = trimTx.objectStore(CACHE_STORE);
        const count = await requestResult(store.count());
        let left = Math.max(0, count - MAX_PREVIEWS);
        if (left > 0) {
            await new Promise<void>((resolve, reject) => {
                const cursorRequest = store.index("createdAt").openKeyCursor();
                cursorRequest.onerror = () => reject(cursorRequest.error || new Error("Wallpaper cache trim failed"));
                cursorRequest.onsuccess = () => {
                    const cursor = cursorRequest.result;
                    if (!cursor || left <= 0) { resolve(); return; }
                    store.delete(cursor.primaryKey);
                    left--;
                    cursor.continue();
                };
            });
        }
        await trimComplete;
    } finally {
        db.close();
    }
}

/** Forget only disposable state, including work still in flight. */
export async function invalidateChatWallpaperPreview(assetId: string): Promise<void> {
    if (!assetId.startsWith("chat_bg_")) return;
    sourceStamp(assetId, true);
    revisions.set(assetId, (revisions.get(assetId) ?? 0) + 1);
    failedUntil.delete(assetId);
    preparing.delete(assetId);
    preparingRevisions.delete(assetId);
    for (const listener of invalidationListeners) listener(assetId);
    const task = serializePreparation(async () => {
        const db = await openCache();
        if (!db) return;
        try {
            const tx = db.transaction(CACHE_STORE, "readwrite");
            const complete = transactionFinished(tx);
            tx.objectStore(CACHE_STORE).delete(assetId);
            await complete;
        } finally { db.close(); }
    });
    invalidating.set(assetId, task);
    try { await task; } finally {
        if (invalidating.get(assetId) === task) invalidating.delete(assetId);
    }
}

function mimeFromDataUrl(dataUrl: string): string | null {
    const match = /^data:([^;,]+);base64,/i.exec(dataUrl.slice(0, 120));
    return match ? match[1].toLowerCase() : null;
}

/** Parse container chunks, skipping metadata payloads without decoding pixels.
 * acTL may follow large ancillary PNG chunks; VP8X/ANIM mark animated WebP.
 * Unknown/malformed containers keep the original rather than flattening frames.
 */
async function mustPreserveRaster(blob: Blob, mime: string): Promise<boolean> {
    if (!["image/png", "image/webp", "image/jpeg"].includes(mime)) return false;
    const bytes = async (start: number, count: number) => new Uint8Array(await blob.slice(start, start + count).arrayBuffer());
    const text = (value: Uint8Array, start = 0, end = value.length) => String.fromCharCode(...value.subarray(start, end));
    const header = await bytes(0, 12);
    // Canvas encoding may discard/clamp an embedded color profile. Preserve
    // profile-tagged originals rather than silently changing their colors.
    if (mime === "image/jpeg") {
        if (header[0] !== 0xff || header[1] !== 0xd8) return true;
        let offset = 2;
        for (let markers = 0; markers < 4096 && offset + 4 <= blob.size; markers++) {
            const marker = await bytes(offset, 4);
            if (marker[0] !== 0xff) return true;
            if (marker[1] === 0xda || marker[1] === 0xd9) return false;
            if (marker[1] === 0xff) { offset++; continue; }
            const length = new DataView(marker.buffer).getUint16(2);
            if (length < 2 || offset + length + 2 > blob.size) return true;
            if (marker[1] === 0xe2 && text(await bytes(offset + 4, 12)) === "ICC_PROFILE\0") return true;
            offset += length + 2;
        }
        return true;
    }
    if (mime === "image/png") {
        if (text(header, 0, 8) !== "\x89PNG\r\n\x1a\n") return true;
        let offset = 8;
        for (let chunks = 0; chunks < 4096 && offset + 12 <= blob.size; chunks++) {
            const chunk = await bytes(offset, 8);
            const length = new DataView(chunk.buffer).getUint32(0);
            const name = text(chunk, 4);
            if (offset + length + 12 > blob.size) return true;
            if (name === "acTL" || name === "iCCP") return true;
            if (name === "IDAT") return false;
            offset += length + 12;
        }
        return true;
    }
    if (text(header, 0, 4) !== "RIFF" || text(header, 8) !== "WEBP") return true;
    let offset = 12;
    for (let chunks = 0; chunks < 4096 && offset + 8 <= blob.size; chunks++) {
        const chunk = await bytes(offset, 9);
        const length = new DataView(chunk.buffer).getUint32(4, true);
        if (offset + length + 8 > blob.size) return true;
        const name = text(chunk, 0, 4);
        if (name === "ICCP" || name === "ANIM" || name === "ANMF" || (name === "VP8X" && (chunk[8] & 0x22) !== 0)) return true;
        offset += 8 + length + (length % 2);
    }
    return offset !== blob.size;
}

/** Chunked base64 parsing bounds temporary allocations and yields to the UI. */
async function dataUrlToBlob(dataUrl: string, mime: string): Promise<Blob> {
    const comma = dataUrl.indexOf(",");
    if (comma < 0) throw new Error("Invalid wallpaper data URL");
    const parts: BlobPart[] = [];
    let lastYield = performance.now();
    for (let i = comma + 1; i < dataUrl.length; i += BASE64_CHUNK_CHARS) {
        const raw = atob(dataUrl.slice(i, i + BASE64_CHUNK_CHARS));
        const bytes = new Uint8Array(raw.length);
        for (let j = 0; j < raw.length; j++) bytes[j] = raw.charCodeAt(j);
        parts.push(bytes);
        if (i + BASE64_CHUNK_CHARS < dataUrl.length && performance.now() - lastYield > 8) {
            await new Promise<void>(resolve => setTimeout(resolve, 0));
            lastYield = performance.now();
        }
    }
    return new Blob(parts, { type: mime });
}

function encodeCanvas(canvas: HTMLCanvasElement, mime: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) reject(new Error("Wallpaper preview encoding unsupported"));
            else resolve(blob);
        }, mime, mime === "image/png" ? undefined : ENCODE_QUALITY);
    });
}

/** Decode once, scale without cropping and close temporary GPU resources. */
async function downsampleWallpaper(original: Blob, mime: string): Promise<Blob> {
    // Wallpaper conversion is deliberately not attempted for animated / vector media.
    // createImageBitmap is used on WKWebView when supported; the fallback still
    // preserves appearance, but does temporarily decode the original once.
    let bitmap: ImageBitmap | null = null;
    let image: HTMLImageElement | null = null;
    let temporaryUrl = "";
    let canvas: HTMLCanvasElement | null = null;
    try {
        if (typeof createImageBitmap === "function") {
            try { bitmap = await createImageBitmap(original, { imageOrientation: "from-image" }); }
            catch (error) {
                // Unsupported options can use Image; allocation/decode errors do
                // not immediately start another full-size decoding attempt.
                if (!(error instanceof TypeError) && (error as DOMException)?.name !== "NotSupportedError") throw error;
            }
        }
        if (!bitmap) {
            temporaryUrl = URL.createObjectURL(original);
            image = new Image();
            image.src = temporaryUrl;
            await image.decode();
        }
        const naturalWidth = bitmap?.width ?? image?.naturalWidth ?? 0;
        const naturalHeight = bitmap?.height ?? image?.naturalHeight ?? 0;
        const size = calculateWallpaperPreviewSize(naturalWidth, naturalHeight);
        if (size.width === naturalWidth && size.height === naturalHeight) return original;
        canvas = document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) throw new Error("Wallpaper preview canvas unavailable");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage((bitmap ?? image)!, 0, 0, size.width, size.height);
        // Preserve PNG alpha/losslessness. JPEG/WebP use WebP when supported.
        const outputMime = mime === "image/png" ? "image/png" : "image/webp";
        const encoded = await encodeCanvas(canvas, outputMime);
        if (encoded.type !== outputMime) {
            if (mime === "image/png") throw new Error("PNG preview encoding unsupported");
            return await encodeCanvas(canvas, mime === "image/webp" ? "image/png" : "image/jpeg");
        }
        return encoded;
    } finally {
        bitmap?.close();
        if (image) image.removeAttribute("src");
        if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
        if (canvas) { canvas.width = 0; canvas.height = 0; }
    }
}

async function createOrLoad(assetId: string, revision: string): Promise<ChatWallpaperVisual | null> {
    await invalidating.get(assetId)?.catch(() => undefined);
    if (getChatWallpaperRevision(assetId) !== revision) return null;
    try {
        const cached = await readPreview(assetId);
        if (cached && getChatWallpaperRevision(assetId) === revision) return { kind: "blob", blob: cached };
    } catch { /* Cache failure does not remove the authoritative original. */ }
    if ((failedUntil.get(assetId) ?? 0) > Date.now()) return null;

    return serializePreparation(async () => {
        if (getChatWallpaperRevision(assetId) !== revision) return null;
        let dataUrl: string | null;
        try { dataUrl = await getChatImageFromIndexedDB(assetId); }
        catch { failedUntil.set(assetId, Date.now() + 30_000); return null; }
        if (!dataUrl || getChatWallpaperRevision(assetId) !== revision) return null;
        const mime = mimeFromDataUrl(dataUrl);
        if (!mime) return { kind: "url", url: dataUrl };
        try {
            const original = await dataUrlToBlob(dataUrl, mime);
            const preserve = !["image/png", "image/jpeg", "image/webp"].includes(mime)
                || await mustPreserveRaster(original, mime);
            // Animated/vector originals remain byte-identical temporary Blobs.
            const preview = preserve ? original : await downsampleWallpaper(original, mime);
            if (getChatWallpaperRevision(assetId) !== revision) return null;
            try { await persistPreview(assetId, preview, revision); } catch { /* ephemeral preview still works */ }
            return { kind: "blob", blob: preview };
        } catch {
            // Do not immediately decode the original again after an allocation /
            // decode failure. Chat stays visible; the original is never altered.
            if (getChatWallpaperRevision(assetId) === revision) failedUntil.set(assetId, Date.now() + 30_000);
            if (failedUntil.size > MAX_PREVIEWS) failedUntil.delete(failedUntil.keys().next().value!);
            return null;
        }
    });
}

/** Concurrency-safe; no bulk processing or scanning other wallpapers. */
export function getOrCreateChatWallpaperPreview(assetId: string): Promise<ChatWallpaperVisual | null> {
    const revision = getChatWallpaperRevision(assetId);
    const pending = preparing.get(assetId);
    if (pending && preparingRevisions.get(assetId) === revision) return pending;
    const task = createOrLoad(assetId, revision);
    preparing.set(assetId, task);
    preparingRevisions.set(assetId, revision);
    void task.finally(() => {
        if (preparing.get(assetId) === task) { preparing.delete(assetId); preparingRevisions.delete(assetId); }
    }).catch(() => undefined);
    return task;
}
