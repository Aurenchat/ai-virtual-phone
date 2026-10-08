import { sha256Blob } from "./io.js";
export const BASE64_CHUNK_CHARS = 256 * 1024;
const MEDIA_DATAURL_RE = /^data:([^;,]*);base64,/i;
const MEDIA_MIN_LENGTH = 2048;
const plain = value => value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;

export function decodeDataUrl(url, mimeType, probe = () => {}) {
  const start = url.indexOf(",") + 1;
  const parts = [];
  for (let offset = start; offset < url.length; offset += BASE64_CHUNK_CHARS) {
    const chunk = url.slice(offset, offset + BASE64_CHUNK_CHARS); probe("atobChars", chunk.length);
    const binary = atob(chunk); const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    parts.push(bytes);
  }
  return new Blob(parts, { type: mimeType || "application/octet-stream" });
}
export function createCollector(probe) {
  const media = new Map();
  return { media, async add(blob) { const ref = await sha256Blob(blob, probe); if (!media.has(ref)) media.set(ref, blob); return ref; } };
}
// Same v2 marker and traversal semantics as data-management/serializers.ts.
export async function serializeValue(value, collector, probe) {
  if (value instanceof Blob) return { __aiPhoneMediaRef: true, mimeType: value.type, ref: await collector.add(value), encoding: "blob" };
  if (typeof value === "string") {
    const match = value.length >= MEDIA_MIN_LENGTH ? MEDIA_DATAURL_RE.exec(value) : null;
    if (match) return { __aiPhoneMediaRef: true, mimeType: match[1] || "", ref: await collector.add(decodeDataUrl(value, match[1], probe)), encoding: "dataurl" };
    return value;
  }
  if (Array.isArray(value)) { const result = []; for (const item of value) result.push(await serializeValue(item, collector, probe)); return result; }
  if (plain(value)) { const result = {}; for (const key of Object.keys(value)) Object.defineProperty(result, key, { value: await serializeValue(value[key], collector, probe), enumerable: true, configurable: true, writable: true }); return result; }
  return value;
}
export async function serializeStorageString(value, collector, probe) {
  if (value.length < MEDIA_MIN_LENGTH) return value;
  const direct = MEDIA_DATAURL_RE.test(value);
  if (!direct && !/"data:[^"\\]*;base64,/i.test(value)) return value;
  let parsed;
  try { parsed = direct ? value : JSON.parse(value); } catch { return value; }
  // Unlike a best-effort ordinary export, a media failure aborts rescue export.
  return JSON.stringify(await serializeValue(parsed, collector, probe));
}
