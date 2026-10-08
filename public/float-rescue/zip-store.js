import { crc32Blob } from "./io.js";
const encoder = new TextEncoder();
export const ZIP_MAX_BYTES = 0xffffffff;
export const CENTRAL_DIRECTORY_MAX_BYTES = 8 * 1024 * 1024;
const overhead = name => 76 + 2 * encoder.encode(name).length;
export class StoreZipWriter {
  constructor(probe) { this.probe = probe; this.parts = []; this.entries = []; this.offset = 0; this.centralBytes = 0; this.names = new Set(); }
  projected(entries) { return this.offset + this.centralBytes + 22 + entries.reduce((sum, entry) => sum + entry.blob.size + overhead(entry.name), 0); }
  async add(name, blob) {
    if (this.names.has(name)) throw Error("ZIP 文件名重复");
    const filename = encoder.encode(name);
    if (filename.length > 65535 || blob.size >= ZIP_MAX_BYTES || this.entries.length >= 65534 || this.projected([{ name, blob }]) >= ZIP_MAX_BYTES) throw Error("ZIP 超出非 ZIP64 边界");
    if (this.centralBytes + 46 + filename.length > CENTRAL_DIRECTORY_MAX_BYTES) throw Error("ZIP 目录超出低内存边界，请减小分卷大小");
    const crc = await crc32Blob(blob, this.probe); const header = new Uint8Array(30 + filename.length); const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true); view.setUint16(8, 0, true);
    view.setUint16(12, 33, true); // DOS date 1980-01-01
    view.setUint32(14, crc, true); view.setUint32(18, blob.size, true); view.setUint32(22, blob.size, true); view.setUint16(26, filename.length, true); header.set(filename, 30);
    this.entries.push({ name, filename, crc, size: blob.size, offset: this.offset }); this.names.add(name);
    this.parts.push(header, blob); this.offset += header.length + blob.size; this.centralBytes += 46 + filename.length;
  }
  finalize() {
    const directory = [];
    for (const entry of this.entries) {
      const header = new Uint8Array(46 + entry.filename.length); const view = new DataView(header.buffer);
      view.setUint32(0, 0x02014b50, true); view.setUint16(4, 20, true); view.setUint16(6, 20, true); view.setUint16(8, 0x800, true); view.setUint16(14, 33, true);
      view.setUint32(16, entry.crc, true); view.setUint32(20, entry.size, true); view.setUint32(24, entry.size, true); view.setUint16(28, entry.filename.length, true); view.setUint32(42, entry.offset, true); header.set(entry.filename, 46); directory.push(header);
    }
    const end = new Uint8Array(22); const view = new DataView(end.buffer);
    view.setUint32(0, 0x06054b50, true); view.setUint16(8, this.entries.length, true); view.setUint16(10, this.entries.length, true); view.setUint32(12, this.centralBytes, true); view.setUint32(16, this.offset, true);
    const blob = new Blob([...this.parts, ...directory, end], { type: "application/zip" });
    this.parts.length = 0; this.entries.length = 0; this.names.clear(); return blob;
  }
}

async function readRange(blob, offset, bytes) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(bytes) || offset < 0 || bytes < 0 || offset + bytes > blob.size) throw Error("ZIP 范围损坏");
  return new Uint8Array(await blob.slice(offset, offset + bytes).arrayBuffer());
}
export async function readStoreManifest(blob) {
  if (blob.size < 22 || blob.size >= ZIP_MAX_BYTES) throw Error("ZIP 大小无效");
  const tailOffset = Math.max(0, blob.size - 65557); const tail = await readRange(blob, tailOffset, blob.size - tailOffset); const tailView = new DataView(tail.buffer);
  let end = -1;
  for (let i = tail.length - 22; i >= 0; i--) if (tailView.getUint32(i, true) === 0x06054b50 && i + 22 + tailView.getUint16(i + 20, true) === tail.length) { end = i; break; }
  if (end < 0 || tailView.getUint16(end + 4, true) || tailView.getUint16(end + 6, true)) throw Error("ZIP EOCD 无效");
  const count = tailView.getUint16(end + 10, true); const directorySize = tailView.getUint32(end + 12, true); const directoryOffset = tailView.getUint32(end + 16, true);
  if (count === 65535 || count !== tailView.getUint16(end + 8, true) || directorySize > CENTRAL_DIRECTORY_MAX_BYTES || directoryOffset + directorySize !== tailOffset + end) throw Error("ZIP central directory 无效");
  const directory = await readRange(blob, directoryOffset, directorySize); const view = new DataView(directory.buffer); const decoder = new TextDecoder("utf-8", { fatal: true }); const entries = []; const names = new Set();
  let offset = 0;
  for (let index = 0; index < count; index++) {
    if (offset + 46 > directory.length || view.getUint32(offset, true) !== 0x02014b50) throw Error("ZIP directory entry 无效");
    const flags = view.getUint16(offset + 8, true); const method = view.getUint16(offset + 10, true); const crc = view.getUint32(offset + 16, true); const bytes = view.getUint32(offset + 24, true);
    const filenameBytes = view.getUint16(offset + 28, true); const extra = view.getUint16(offset + 30, true); const comment = view.getUint16(offset + 32, true); const localOffset = view.getUint32(offset + 42, true);
    if (flags !== 0x800 || method !== 0 || bytes !== view.getUint32(offset + 20, true) || offset + 46 + filenameBytes + extra + comment > directory.length || view.getUint16(offset + 34, true)) throw Error("ZIP 必须是未加密 STORE 格式");
    const name = decoder.decode(directory.subarray(offset + 46, offset + 46 + filenameBytes));
    if (names.has(name)) throw Error("ZIP 文件名重复"); names.add(name);
    const local = await readRange(blob, localOffset, 30); const localView = new DataView(local.buffer);
    if (localView.getUint32(0, true) !== 0x04034b50 || localView.getUint16(6, true) !== flags || localView.getUint16(8, true) !== 0 || localView.getUint32(14, true) !== crc || localView.getUint32(18, true) !== bytes || localView.getUint32(22, true) !== bytes) throw Error("ZIP local header 无效");
    const localNameBytes = localView.getUint16(26, true); const localExtra = localView.getUint16(28, true);
    if (decoder.decode(await readRange(blob, localOffset + 30, localNameBytes)) !== name) throw Error("ZIP local filename 不一致");
    const dataOffset = localOffset + 30 + localNameBytes + localExtra;
    if (dataOffset + bytes > directoryOffset) throw Error("ZIP 文件内容越界");
    entries.push({ name, crc, bytes, localOffset, dataOffset }); offset += 46 + filenameBytes + extra + comment;
  }
  if (offset !== directory.length) throw Error("ZIP directory 长度不一致");
  const ordered = entries.slice().sort((a, b) => a.localOffset - b.localOffset);
  for (let index = 1; index < ordered.length; index++) if (ordered[index].localOffset < ordered[index - 1].dataOffset + ordered[index - 1].bytes) throw Error("ZIP entries 重叠");
  const manifest = entries.find(entry => entry.name === "manifest.json");
  if (!manifest || manifest.bytes > 1024 * 1024) throw Error("ZIP manifest 缺失或过大");
  const content = blob.slice(manifest.dataOffset, manifest.dataOffset + manifest.bytes);
  if (await crc32Blob(content) !== manifest.crc) throw Error("manifest CRC32 不一致");
  return JSON.parse(await content.text());
}
