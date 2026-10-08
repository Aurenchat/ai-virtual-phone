import { IncrementalSha256 } from "./sha256.js";
export const READ_CHUNK_BYTES = 1024 * 1024;
export const CHECKPOINT_KEY = "float_rescue_export_checkpoint_v1";
export const RESCUE_DB_OPEN_TIMEOUT_MS = 15_000;
const yieldFrame = () => new Promise(resolve => setTimeout(resolve, 0));

// Slice even before stream(): never trust a browser stream's chosen chunk size.
export async function* blobChunks(blob, probe = () => {}) {
  for (let start = 0; start < blob.size; start += READ_CHUNK_BYTES) {
    const slice = blob.slice(start, start + READ_CHUNK_BYTES);
    if (typeof slice.stream === "function") {
      const reader = slice.stream().getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          probe("readChunkBytes", value.byteLength); yield value;
        }
      } finally { reader.releaseLock(); }
    } else {
      const value = new Uint8Array(await slice.arrayBuffer());
      probe("readChunkBytes", value.byteLength); yield value;
    }
    await yieldFrame();
  }
}
export async function sha256Blob(blob, probe) {
  const hash = new IncrementalSha256();
  for await (const chunk of blobChunks(blob, probe)) hash.update(chunk);
  return hash.digestHex();
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
export async function crc32Blob(blob, probe) {
  let crc = 0xffffffff;
  for await (const chunk of blobChunks(blob, probe)) {
    for (let index = 0; index < chunk.length; index++) crc = crcTable[(crc ^ chunk[index]) & 255] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function openExistingDb(name) {
  return new Promise((resolve, reject) => {
    let request; let settled = false;
    const settle = (error, db = null) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) reject(error); else resolve(db);
    };
    const abortUpgrade = () => { try { request?.transaction?.abort(); } catch { /* It may already have ended. */ } };
    // Start before open(), covering the entire request, including upgrade waits.
    const timer = setTimeout(() => { settle(Error(`数据库读取超时：${name}`)); abortUpgrade(); }, RESCUE_DB_OPEN_TIMEOUT_MS);
    try { request = indexedDB.open(name); } catch { settle(Error(`数据库无法打开：${name}`)); return; }
    request.onupgradeneeded = event => {
      // Settle first so abort's error event cannot replace the missing-DB result.
      settle(event.oldVersion === 0 ? null : Error(`数据库需要升级，救援读取已停止：${name}`));
      abortUpgrade();
    };
    request.onerror = () => { if (!settled) { settle(Error(`数据库无法打开：${name}`)); abortUpgrade(); } };
    request.onblocked = () => { if (!settled) { settle(Error(`数据库被其它页面占用：${name}`)); abortUpgrade(); } };
    request.onsuccess = () => {
      const db = request.result;
      if (settled) { db.close(); return; }
      db.onversionchange = () => db.close(); settle(null, db);
    };
  });
}
export function transactionDone(tx) {
  return new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(Error("只读数据库事务失败")); });
}
export function requestResult(request) {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(Error("只读数据库请求失败")); });
}
export function matchesKey(key, source) {
  if (key === CHECKPOINT_KEY || typeof key !== "string") return false;
  if (source.excludeKeys?.includes(key) || source.excludePrefixes?.some(prefix => key.startsWith(prefix))) return false;
  return Boolean(source.includeAll || source.keys?.includes(key) || source.prefixes?.some(prefix => key.startsWith(prefix)));
}
// Apply ownership across the entire schema, even when a subset is selected.
export function ownsKey(schema, moduleId, sourceIndex, key, type) {
  for (const module of schema.modules) for (const source of module.sources) {
    if (source.type === type && matchesKey(key, source)) return module.id === moduleId && source.sourceIndex === sourceIndex;
  }
  return false;
}
export function storeSchema(store) {
  return { name: store.name, keyPath: store.keyPath, autoIncrement: store.autoIncrement, indexes: Array.from(store.indexNames).map(name => {
    const index = store.index(name); return { name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry };
  }) };
}

// Checkpoint keys only, never record values. Preserve native primary-key ordering.
export function encodeKey(key) {
  if (typeof key === "string") { if (key.length > 4096) throw Error("主键过长，无法安全记录救援断点"); return { t: "s", v: key }; }
  if (typeof key === "number" && Number.isFinite(key)) return { t: "n", v: key };
  if (key instanceof Date) return { t: "d", v: key.getTime() };
  if (Array.isArray(key)) return { t: "a", v: key.map(encodeKey) };
  if (key instanceof ArrayBuffer || ArrayBuffer.isView(key)) {
    const bytes = key instanceof ArrayBuffer ? new Uint8Array(key) : new Uint8Array(key.buffer, key.byteOffset, key.byteLength);
    if (bytes.length > 4096) throw Error("主键过长，无法安全记录救援断点");
    return { t: "b", v: Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("") };
  }
  throw Error("不支持的 IndexedDB 主键");
}
export function decodeKey(key) {
  if (key.t === "s" || key.t === "n") return key.v;
  if (key.t === "d") return new Date(key.v);
  if (key.t === "a") return key.v.map(decodeKey);
  if (key.t === "b") return Uint8Array.from(key.v.match(/../g) || [], hex => parseInt(hex, 16)).buffer;
  throw Error("救援断点主键损坏");
}
export function rawSize(value) {
  if (typeof value === "string") return value.length;
  if (value instanceof Blob) return value.size;
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return value.byteLength;
  if (!value || typeof value !== "object") return 16;
  let total = 0;
  for (const key of Object.keys(value)) total += key.length + rawSize(value[key]);
  return total;
}
