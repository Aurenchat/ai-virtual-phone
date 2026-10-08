import { RescueExporter, partFilename, RESCUE_PART_HARD_MAX_BYTES } from './exporter.js';
import { ownsKey, encodeKey, decodeKey } from './io.js';
import { IncrementalSha256 } from './sha256.js';
import { KV_RESCUE_KEY_PAGE, validateRow } from './kv-reader.js';
export const KV_CHECKPOINT_KEY = 'float_kv_rescue_checkpoint_v1';
export const KV_STRING_CHUNK_CHARS = 64 * 1024;
const ZERO = '0'.repeat(64);
const validHash = value => /^[a-f0-9]{64}$/.test(value);
const unchanged = 'KV 数据自备份开始后已发生变化，救援已停止，请重新开始。原数据未修改。';
const taskId = (module, source) => `${module.id}/${source.sourceIndex}/entries`;
function kvSchema(schema) { return { ...schema, modules: schema.modules.map(module => ({ ...module, label: `${module.label}（仅 KV，部分备份）`, sources: module.sources.filter(source => source.type === 'kv') })) }; }
function ownerTask(schema, key) {
  for (const module of schema.modules) for (const source of module.sources) if (ownsKey(schema, module.id, source.sourceIndex, key, 'kv')) return taskId(module, source);
  return null;
}
const digest = text => { const hash = new IncrementalSha256(); hash.update(new TextEncoder().encode(text)); return hash.digestHex(); };
const chain = (previous, rowHash) => digest(previous + rowHash);
export async function rowFingerprint(row, probe = () => {}) {
  validateRow(row); const hash = new IncrementalSha256();
  // Hash exact UTF-16 units, including lone surrogates, with bounded buffers.
  for (const text of [row.key, row.value]) {
    hash.update(new TextEncoder().encode(String(text.length) + ':'));
    for (let start = 0; start < text.length; start += KV_STRING_CHUNK_CHARS) {
      const length = Math.min(KV_STRING_CHUNK_CHARS, text.length - start); const bytes = new Uint8Array(length * 2);
      for (let i = 0; i < length; i++) { const code = text.charCodeAt(start + i); bytes[i * 2] = code & 255; bytes[i * 2 + 1] = code >>> 8; }
      probe('kvHashChunkBytes', bytes.length); hash.update(bytes);
      if (start && start % (1024 * 1024) === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  return hash.digestHex();
}
// Preserve KV value byte-for-byte (including whitespace/escapes in nested JSON).
// Standard v2 media-string extraction reparses/reformats JSON; raw v2 strings
// are also legal. Escape only bounded slices into the ZIP's JSON Blob. No decode
// and no full JSON.stringify(value), Blob arrayBuffer, or duplicate base64.
export function kvPayloadBlob(task, records, probe = () => {}) {
  const parts = [`{"moduleId":${JSON.stringify(task.moduleId)},"sources":[{"type":"kv","records":[`];
  for (let i = 0; i < records.length; i++) {
    const row = records[i]; if (i) parts.push(',');
    let estimate = 0;
    for (let c = 0; c < row.value.length; c++) { const code = row.value.charCodeAt(c); estimate += code < 32 || code >= 0xd800 && code <= 0xdfff ? 6 : code === 34 || code === 92 ? 2 : code < 128 ? 1 : code < 2048 ? 2 : 3; }
    if (estimate > RESCUE_PART_HARD_MAX_BYTES - 64 * 1024) throw Error('单条 KV JSON 超过 128 MiB 安全上限，不能生成 COMPLETE');
    parts.push(`{"key":${JSON.stringify(row.key)},"value":"`);
    for (let start = 0; start < row.value.length; start += KV_STRING_CHUNK_CHARS) { const chunk = row.value.slice(start, start + KV_STRING_CHUNK_CHARS); probe('kvJsonChunkChars', chunk.length); parts.push(JSON.stringify(chunk).slice(1, -1)); }
    parts.push('"}');
  }
  parts.push(']}]}'); return new Blob(parts, { type: 'application/json' });
}
async function inventoryFor(schema, reader, progress = () => {}, probe) {
  const inventory = schema.modules.flatMap(module => module.sources.map(source => ({ id: taskId(module, source), moduleId: module.id, sourceIndex: source.sourceIndex, source, type: 'kv', dbName: 'AiPhoneKvDB', store: 'entries', exists: true, count: 0, fingerprint: ZERO })));
  const byId = new Map(inventory.map(task => [task.id, task])); const excluded = []; let physicalCount = 0; let fingerprint = ZERO; let last = null;
  while (true) {
    const keys = await reader.keys(last);
    if (!Array.isArray(keys) || keys.length > KV_RESCUE_KEY_PAGE) throw Error('KV 主键分页无效');
    for (const key of keys) {
      if (typeof key !== 'string' || last !== null && key <= last) throw Error('KV 主键顺序无效或重复');
      const row = await reader.row(key); if (row.key !== key) throw Error('KV row 主键不一致');
      const rowHash = await rowFingerprint(row, probe); fingerprint = chain(fingerprint, rowHash);
      const id = ownerTask(schema, key); const task = byId.get(id);
      if (task) { task.count++; task.fingerprint = chain(task.fingerprint, rowHash); }
      else {
        // Only the canonical, explicitly excluded cloud bookkeeping key is
        // accepted. Unknown/dynamic keys must belong to the cache fallback.
        if (key !== 'ai_phone_cloud_backup_state_v1') throw Error('发现未被 canonical KV source 覆盖的记录，不能生成 COMPLETE');
        excluded.push({ key, reason: 'canonical cloud-backup run state (intentionally excluded)' });
      }
      last = key; physicalCount++;
      if (physicalCount === 1 || physicalCount % 32 === 0) progress({ phase: 'KV_INVENTORY', physicalCount });
    }
    if (keys.length < KV_RESCUE_KEY_PAGE) break;
  }
  if (!physicalCount) throw Error('KV 读取返回空集，未确认完整持久化数据，不能生成 COMPLETE');
  if (inventory.reduce((sum, task) => sum + task.count, 0) + excluded.length !== physicalCount) throw Error('KV 物理记录与 source 覆盖数不一致');
  return { inventory, physicalCount, fingerprint, excluded };
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export class KvRescueExporter extends RescueExporter {
  constructor(schema, audit, reader, options = {}) {
    const ids = schema.modules.map(module => module.id); const probe = options.probe || (() => {});
    super(schema, audit.inventory, ids, reader.kind === 'persisted-dexie' ? 'kv-only' : 'kv-cache-snapshot', { ...options,
      storageSerializer: value => value,
      payloadBuilder: (task, records) => kvPayloadBlob(task, records, probe),
      batchReader: async (task, encoded, _rowCap, probe) => {
        let last = encoded === null ? null : decodeKey(encoded); let done = false; const rows = []; const hashes = [];
        // One value per batch; key metadata bounded to 32. Never materialize an
        // entire KV store or read values belonging to another source task.
        while (!rows.length && !done) {
          const keys = await reader.keys(last); done = keys.length < KV_RESCUE_KEY_PAGE;
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i]; if (typeof key !== 'string' || last !== null && key <= last) throw Error('KV 主键未前进'); last = key;
            if (ownerTask(schema, key) !== task.id) continue;
            const row = await reader.row(key); if (row.key !== key) throw Error('KV row 主键不一致'); rows.push({ key, value: row }); hashes.push(await rowFingerprint(row, probe));
            done = done && i === keys.length - 1; break;
          }
        }
        probe('batch', { task: task.id, rows: rows.length, chars: rows.reduce((sum, row) => sum + row.key.length + row.value.value.length, 0) });
        return { rows, hashes, lastKey: last === null ? null : encodeKey(last), done };
      },
      onBatchCommitted: (state, task, batch) => { for (const hash of batch.hashes) state.fingerprints[task.id] = chain(state.fingerprints[task.id], hash); },
    });
    this.reader = reader; this.audit = audit; this.state.fingerprints = Object.fromEntries(this.inventory.map(task => [task.id, ZERO]));
  }
  static async prepare(schema, reader, options = {}) {
    schema = kvSchema(schema);
    if (reader.kind === 'persisted-dexie') await reader.open();
    const audit = await inventoryFor(schema, reader, options.onProgress, options.probe);
    return new KvRescueExporter(schema, audit, reader, options);
  }
  checkpoint(state = this.state, parts = this.parts) { return { ...super.checkpoint(state, parts), state, kvAudit: this.audit, readerKind: this.reader.kind }; }
  manifest(stats, counts, number) { const result = super.manifest(stats, counts, number); result.rescueSet.readerKind = this.reader.kind; result.rescueSet.independentPersistenceVerified = this.mode === 'kv-only'; return result; }
  persist(state = this.state, parts = this.parts) { localStorage.setItem(KV_CHECKPOINT_KEY, JSON.stringify(this.checkpoint(state, parts))); }
  static readCheckpoint() { const raw = localStorage.getItem(KV_CHECKPOINT_KEY); return raw ? JSON.parse(raw) : null; }
  static restart() { localStorage.removeItem(KV_CHECKPOINT_KEY); }
  static async resume(schema, reader, options = {}) {
    const saved = this.readCheckpoint();
    if (!saved || saved.version !== 1 || saved.readerKind !== reader.kind || !['kv-only','kv-cache-snapshot'].includes(saved.mode) || saved.mode !== (reader.kind === 'persisted-dexie' ? 'kv-only' : 'kv-cache-snapshot') || saved.origin !== location.origin || !/^[a-zA-Z0-9-]{1,100}$/.test(saved.setId) || !Number.isFinite(Date.parse(saved.createdAt))) throw Error('KV 断点无效或来源不同，不能混用缓存与持久化备份');
    const result = await this.prepare(schema, reader, { ...options, partTargetBytes: saved.partTargetBytes });
    if (!same(saved.kvAudit, result.audit)) throw Error(unchanged);
    const state = saved.state;
    if (!state || !Number.isSafeInteger(state.taskIndex) || state.taskIndex < 0 || state.taskIndex > result.inventory.length || !Number.isSafeInteger(state.sequence) || state.sequence < 0 || !Array.isArray(saved.parts) || saved.parts.some((part, index) => part.partNumber !== index + 1 || part.filename !== partFilename(saved.setId, index + 1) || !Number.isSafeInteger(part.bytes) || part.bytes <= 0 || part.bytes > RESCUE_PART_HARD_MAX_BYTES || !validHash(part.sha256) || !Number.isSafeInteger(part.recordCount) || part.recordCount < 0 || !Array.isArray(part.moduleIds)) || !state.exportedCounts || !state.fingerprints || Object.keys(state.exportedCounts).length !== result.inventory.length || Object.keys(state.fingerprints).length !== result.inventory.length || result.inventory.some((task, index) => !Number.isSafeInteger(state.exportedCounts[task.id]) || state.exportedCounts[task.id] < 0 || state.exportedCounts[task.id] > task.count || !validHash(state.fingerprints[task.id]) || index < state.taskIndex && (state.exportedCounts[task.id] !== task.count || state.fingerprints[task.id] !== task.fingerprint)) || saved.parts.reduce((sum, part) => sum + part.recordCount, 0) !== Object.values(state.exportedCounts).reduce((sum, count) => sum + count, 0)) throw Error('KV 断点计数或指纹无效');
    if (state.lastKey !== null && typeof decodeKey(state.lastKey) !== 'string') throw Error('KV 断点主键无效');
    result.setId = saved.setId; result.createdAt = saved.createdAt; result.state = state; result.parts = saved.parts; return result;
  }
  async finish() {
    if (this.pending || this.generating || this.state.taskIndex < this.inventory.length) throw Error('KV 分卷尚未保存确认');
    let consistent = this.inventory.every(task => task.count === this.state.exportedCounts[task.id] && task.fingerprint === this.state.fingerprints[task.id]);
    try { consistent = consistent && same(this.audit, await inventoryFor(this.schema, this.reader)); } catch { consistent = false; }
    const cache = this.mode === 'kv-cache-snapshot';
    return { format: 'float-rescue-set', version: 1, setId: this.setId, createdAt: this.createdAt, mode: this.mode, origin: this.origin, selectedModules: this.selected, parts: this.parts, inventory: this.inventory, exportedCounts: this.state.exportedCounts, totalParts: this.parts.length, totalBytes: this.parts.reduce((sum, part) => sum + part.bytes, 0), kvAudit: this.audit, readerKind: this.reader.kind, complete: consistent && !cache, ...(cache ? { snapshotComplete: consistent, independentPersistenceVerified: false, provenance: '来源为已水合内存缓存，尚未独立证明与持久化数据库完整一致。' } : {}), ...(!consistent ? { status: 'INCOMPLETE', error: unchanged } : {}) };
  }
}
