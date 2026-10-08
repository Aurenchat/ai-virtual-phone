/**
 * OFFLINE / FUTURE PHASE B ONLY. Never import from the application or public preview.
 * Native IndexedDB, no hydration or schema changes. Cross-database writes intentionally
 * commit media first; deterministic IDs make the orphan-media crash point retryable.
 */
export const BASE64_CHUNK_CHARS = 256 * 1024;
export const MAX_ENCODED_CHARS_PER_EPOCH = 96 * 1024 * 1024;
export const MAX_ITEMS_PER_EPOCH = 128;
export const STORAGE_SAFETY_MARGIN_BYTES = 32 * 1024 * 1024;

type Category = "image" | "audio" | "video" | "file";
type Message = { id: string; mediaUrl?: unknown; [key: string]: unknown };
type MediaEntry = { id: string; blob: Blob; mimeType: string; mediaCategory: Category; createdAt: number };
export type InlineCandidate = { id: string; encodedChars: number; estimatedPayloadBytes: number; mimeType: string; category: Category };
export type ItemStatus = "MIGRATED" | "SKIPPED" | "INVALID_DATA_URL" | "INSUFFICIENT_STORAGE" | "MEDIA_VERIFICATION_FAILED" | "CAS_CONFLICT" | "MESSAGE_VERIFICATION_FAILED" | "ERROR";
export type MigrationResult = { id: string; status: ItemStatus };
export type EpochResult = { status: "DONE" | "EPOCH_LIMIT" | "INSUFFICIENT_STORAGE" | "STOPPED_ERROR"; attemptedItems: number; encodedChars: number; results: MigrationResult[] };
export interface MigrationOptions {
  maxEncodedChars?: number;
  maxItems?: number;
  estimateStorage?: () => Promise<{ usage?: number; quota?: number }>;
  /** Awaited milestones also allow offline tests to inject process interruption. */
  onStage?: (stage: "MEDIA_COMMITTED" | "MEDIA_VERIFIED", id: string) => void | Promise<void>;
}

class MigrationError extends Error {
  constructor(readonly status: ItemStatus) { super(`LEGACY_INLINE_MIGRATION_ENGINE: ${status}`); }
}

/** Fixed-width UTF-16 encoding is injective, including unusual / unpaired-surrogate IDs. */
export function deterministicMediaId(messageId: string): string {
  let encoded = "";
  for (let index = 0; index < messageId.length; index++) encoded += messageId.charCodeAt(index).toString(16).padStart(4, "0");
  return `legacy_inline_${encoded}`;
}

function dataHeader(url: string) {
  const comma = url.indexOf(",");
  if (!url.startsWith("data:") || comma < 5 || comma > 1024) throw new MigrationError("INVALID_DATA_URL");
  const header = url.slice(5, comma);
  // Base64 only. Percent-encoded/non-base64 URLs remain untouched and are reported.
  const match = /^([a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+)(?:;[a-z0-9!#$&^_.+-]+=[a-z0-9!#$&^_.+-]+)*;base64$/i.exec(header);
  const length = url.length - comma - 1;
  if (!match || length === 0 || length % 4 !== 0) throw new MigrationError("INVALID_DATA_URL");
  const mimeType = match[1].toLowerCase();
  const category: Category = mimeType.startsWith("image/") ? "image" : mimeType.startsWith("audio/") ? "audio" : mimeType.startsWith("video/") ? "video" : "file";
  const padding = url.endsWith("==") ? 2 : url.endsWith("=") ? 1 : 0;
  return { offset: comma + 1, mimeType, category, estimatedPayloadBytes: length / 4 * 3 - padding };
}

/** Only a chunk-sized substring and binary string exist at once, never a full atob. */
export function decodeInlineMedia(url: string): Blob {
  const header = dataHeader(url);
  const parts: Uint8Array<ArrayBuffer>[] = [];
  for (let offset = header.offset; offset < url.length; offset += BASE64_CHUNK_CHARS) {
    const end = Math.min(offset + BASE64_CHUNK_CHARS, url.length);
    const chunk = url.slice(offset, end);
    if (!(end === url.length ? /^[A-Za-z0-9+/]*={0,2}$/ : /^[A-Za-z0-9+/]+$/).test(chunk)) throw new MigrationError("INVALID_DATA_URL");
    let binary: string;
    try { binary = atob(chunk); } catch { throw new MigrationError("INVALID_DATA_URL"); }
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    // Reject noncanonical padding bits instead of silently changing invalid bytes.
    if (end === url.length && btoa(binary) !== chunk) throw new MigrationError("INVALID_DATA_URL");
    parts.push(bytes);
  }
  return new Blob(parts, { type: header.mimeType });
}

async function openExisting(name: string, storeName: string): Promise<IDBDatabase> {
  if (typeof indexedDB.databases === "function" && !(await indexedDB.databases()).some(db => db.name === name)) throw new Error("DB_MISSING");
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    let stopped = false;
    request.onupgradeneeded = () => { stopped = true; request.transaction!.abort(); reject(new Error("DB_MISSING")); };
    request.onerror = () => reject(new Error(stopped ? "DB_MISSING" : "DB_OPEN_FAILED"));
    request.onblocked = () => { stopped = true; reject(new Error("DB_BLOCKED")); };
    request.onsuccess = () => {
      const db = request.result;
      if (stopped || !db.objectStoreNames.contains(storeName)) { db.close(); reject(new Error("DB_MISSING")); }
      else { db.onversionchange = () => db.close(); resolve(db); }
    };
  });
}

function read<T>(db: IDBDatabase, storeName: string, id: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(id);
    tx.oncomplete = () => resolve(request.result as T | undefined);
    tx.onabort = tx.onerror = () => reject(new Error("DB_READ_FAILED"));
  });
}

function putMedia(db: IDBDatabase, entry: MediaEntry): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readwrite");
    // add, never overwrite a colliding asset. A race leaves the inline message intact.
    tx.objectStore("entries").add(entry);
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(new Error("MEDIA_WRITE_FAILED"));
  });
}

async function verifyMedia(entry: MediaEntry | undefined, id: string, original: Blob, category: Category): Promise<boolean> {
  if (!entry || entry.id !== id || entry.mimeType !== original.type || entry.mediaCategory !== category || !(entry.blob instanceof Blob) || entry.blob.size !== original.size || entry.blob.type !== original.type) return false;
  for (let offset = 0; offset < original.size; offset += BASE64_CHUNK_CHARS) {
    const [a, b] = await Promise.all([original.slice(offset, offset + BASE64_CHUNK_CHARS).arrayBuffer(), entry.blob.slice(offset, offset + BASE64_CHUNK_CHARS).arrayBuffer()]);
    const left = new Uint8Array(a); const right = new Uint8Array(b);
    for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) return false;
  }
  return true;
}

/** CAS and readback are in one transaction: failed readback rolls back the update. */
function updateMessage(db: IDBDatabase, id: string, originalUrl: string, ref: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readwrite"); const store = tx.objectStore("messages");
    let failure: ItemStatus = "ERROR";
    const get = store.get(id);
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(new MigrationError(failure));
    get.onsuccess = () => {
      try {
        const current = get.result as Message | undefined;
        if (!current || current.mediaUrl !== originalUrl) { failure = "CAS_CONFLICT"; tx.abort(); return; }
        // Use the freshest row, preserving concurrent changes to every other field.
        const write = store.put({ ...current, mediaUrl: ref });
        write.onsuccess = () => {
          try {
            const verify = store.get(id);
            verify.onsuccess = () => {
              if (verify.result?.mediaUrl !== ref) { failure = "MESSAGE_VERIFICATION_FAILED"; tx.abort(); }
            };
          } catch { tx.abort(); }
        };
      } catch { tx.abort(); }
    };
  });
}

function candidates(db: IDBDatabase): Promise<InlineCandidate[]> {
  return new Promise((resolve, reject) => {
    const items: InlineCandidate[] = [];
    const tx = db.transaction("messages", "readonly");
    const request = tx.objectStore("messages").openCursor();
    tx.oncomplete = () => resolve(items.sort((a, b) => b.encodedChars - a.encodedChars || a.id.localeCompare(b.id)));
    tx.onabort = tx.onerror = () => reject(new Error("CANDIDATE_SCAN_FAILED"));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const message = cursor.value as Message;
      if (typeof message.id === "string" && typeof message.mediaUrl === "string" && message.mediaUrl.startsWith("data:")) {
        try { const header = dataHeader(message.mediaUrl); items.push({ id: message.id, encodedChars: message.mediaUrl.length, estimatedPayloadBytes: header.estimatedPayloadBytes, mimeType: header.mimeType, category: header.category }); }
        catch { items.push({ id: message.id, encodedChars: message.mediaUrl.length, estimatedPayloadBytes: 0, mimeType: "invalid", category: "file" }); }
      }
      cursor.continue();
    };
  });
}

export async function runLegacyInlineMediaEpoch(options: MigrationOptions = {}): Promise<EpochResult> {
  const maxChars = Math.min(options.maxEncodedChars ?? MAX_ENCODED_CHARS_PER_EPOCH, MAX_ENCODED_CHARS_PER_EPOCH);
  const maxItems = Math.min(options.maxItems ?? MAX_ITEMS_PER_EPOCH, MAX_ITEMS_PER_EPOCH);
  if (!Number.isSafeInteger(maxChars) || maxChars <= 0 || !Number.isSafeInteger(maxItems) || maxItems <= 0) throw new Error("INVALID_EPOCH_LIMIT");
  let chat: IDBDatabase | undefined; let media: IDBDatabase | undefined;
  const result: EpochResult = { status: "DONE", attemptedItems: 0, encodedChars: 0, results: [] };
  try {
    chat = await openExisting("AiPhoneChatDB", "messages");
    media = await openExisting("AiPhoneMediaCacheDB", "entries");
    const items = await candidates(chat);
    for (const item of items) {
      if (result.attemptedItems >= maxItems) { result.status = "EPOCH_LIMIT"; break; }
      try {
        // Fresh row, not the metadata scan's copy of the media string.
        const current = await read<Message>(chat, "messages", item.id);
        if (!current || typeof current.mediaUrl !== "string" || !current.mediaUrl.startsWith("data:")) { result.results.push({ id: item.id, status: "SKIPPED" }); continue; }
        const url = current.mediaUrl;
        if (result.encodedChars + url.length > maxChars) { result.status = "EPOCH_LIMIT"; break; }
        result.attemptedItems++; result.encodedChars += url.length;
        const header = dataHeader(url);
        const estimateStorage = options.estimateStorage ?? (typeof navigator !== "undefined" && navigator.storage?.estimate ? () => navigator.storage.estimate() : undefined);
        let estimate: { usage?: number; quota?: number } | undefined;
        try { estimate = await estimateStorage?.(); } catch { /* unavailable is not insufficient */ }
        if (estimate?.quota != null && estimate.usage != null && Number.isFinite(estimate.quota) && Number.isFinite(estimate.usage) && estimate.quota - estimate.usage < header.estimatedPayloadBytes + STORAGE_SAFETY_MARGIN_BYTES) throw new MigrationError("INSUFFICIENT_STORAGE");
        const blob = decodeInlineMedia(url); const id = deterministicMediaId(item.id); const ref = `media-store://${id}`;
        const existing = await read<MediaEntry>(media, "entries", id);
        if (!existing) await putMedia(media, { id, blob, mimeType: header.mimeType, mediaCategory: header.category, createdAt: Date.now() });
        await options.onStage?.("MEDIA_COMMITTED", item.id);
        if (!(await verifyMedia(await read<MediaEntry>(media, "entries", id), id, blob, header.category))) throw new MigrationError("MEDIA_VERIFICATION_FAILED");
        await options.onStage?.("MEDIA_VERIFIED", item.id);
        await updateMessage(chat, item.id, url, ref);
        // Fresh post-commit read. A later external change is reported, never overwritten.
        if ((await read<Message>(chat, "messages", item.id))?.mediaUrl !== ref) throw new MigrationError("MESSAGE_VERIFICATION_FAILED");
        result.results.push({ id: item.id, status: "MIGRATED" });
      } catch (error) {
        result.results.push({ id: item.id, status: error instanceof MigrationError ? error.status : "ERROR" });
        // Stop on any failure; leave this and subsequent inline rows for review/retry.
        result.status = error instanceof MigrationError && error.status === "INSUFFICIENT_STORAGE" ? "INSUFFICIENT_STORAGE" : "STOPPED_ERROR";
        break;
      }
    }
    return result;
  } finally { chat?.close(); media?.close(); }
}
