import { CHECKPOINT_KEY, openExistingDb, transactionDone, ownsKey, storeSchema, encodeKey, decodeKey, rawSize, sha256Blob } from "./io.js";
import { createCollector, serializeValue, serializeStorageString } from "./serializer.js";
import { StoreZipWriter, CENTRAL_DIRECTORY_MAX_BYTES } from "./zip-store.js";
import { compileKvSelectors, kvSelectorRange, validateKvCursor } from "./kv-selectors.js";
export const CHAT_RESCUE_BATCH_ROWS = 1;
export const DEFAULT_RESCUE_BATCH_ROWS = 16;
export const RESCUE_RAW_BATCH_CHAR_BUDGET = 16 * 1024 * 1024;
export const RESCUE_PART_TARGET_BYTES = 96 * 1024 * 1024;
export const RESCUE_PART_HARD_MAX_BYTES = 128 * 1024 * 1024;
export const RESCUE_PREFLIGHT_STORE_TIMEOUT_MS = 30_000;
export const RESCUE_MESSAGE_COUNT_INACTIVITY_TIMEOUT_MS = 20_000;
export const RESCUE_MESSAGE_COUNT_ABSOLUTE_TIMEOUT_MS = 120_000;
export const RESCUE_MESSAGE_COUNT_PROGRESS_KEYS = 512;
const cloneMetadata = value => JSON.parse(JSON.stringify(value));
const sourceChanged = "源数据在导出过程中发生变化，请保持 Float 主应用关闭并重新导出。";
const resumeChanged = "源数据自备份开始后已发生变化，为避免生成不一致的备份，请重新开始。";
const numeric = value => Number.isSafeInteger(value) && value >= 0;
const jsonBlob = value => new Blob([JSON.stringify(value)], { type: "application/json" });
export const partFilename = (setId, number) => `float-rescue-${setId}-part-${String(number).padStart(3, "0")}.zip`;

function selectedModules(schema, ids) {
  if (schema.version !== 1 || !Array.isArray(schema.modules) || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !schema.modules.some(module => module.id === id))) throw Error("数据源清单或模块选择无效");
  return schema.modules.filter(module => ids.includes(module.id));
}
function schemaForMode(schema, ids, mode) {
  if (!["chat", "full", "chat-media-safety", "remaining-non-kv"].includes(mode)) throw Error("备份模式无效");
  if (mode === "remaining-non-kv") {
    const scoped = { ...schema, modules: schema.modules.map(module => ({ ...module, label: `${module.label}（部分备份，非 KV）`, sources: module.sources.filter(source => source.type === "localStorage" || source.type === "indexeddb" && !["AiPhoneChatDB", "AiPhoneMediaCacheDB", "AiPhoneKvDB"].includes(source.dbName)) })) };
    if (selectedModules(scoped, ids).every(module => !module.sources.length)) throw Error("所选模块没有可导出的非 KV 数据源");
    return scoped;
  }
  if (mode !== "chat-media-safety") return schema;
  const chat = selectedModules(schema, ids).find(module => module.id === "chat");
  if (!chat || ids.length !== 1) throw Error("两库紧急保护备份只能选择聊天媒体范围");
  const names = ["AiPhoneChatDB", "AiPhoneMediaCacheDB"];
  const sources = chat.sources.filter(source => source.type === "indexeddb" && names.includes(source.dbName));
  if (names.some(name => sources.filter(source => source.dbName === name).length !== 1)) throw Error("两库紧急保护备份的数据源清单不完整");
  // Derive from the canonical descriptors, preserving original sourceIndex.
  // Always enumerate every real store in these two databases.
  return { ...schema, modules: [{ ...chat, critical: true, label: "聊天媒体紧急保护备份（仅两库，部分备份）", sources: sources.map(({ stores, ...source }) => source) }] };
}
function localKeys(schema, moduleId, sourceIndex) {
  const keys = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key !== null && ownsKey(schema, moduleId, sourceIndex, key, "localStorage")) keys.push(key);
  }
  return keys.sort();
}
function countMessageKeys(db, task, onProgress) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    let tx; let spec; let count = 0; let settled = false; let exhausted = false; let txComplete = false;
    let lastEvent = "TX_OPENED"; let inactivityTimer;
    const clearTimers = () => { clearTimeout(inactivityTimer); clearTimeout(absoluteTimer); };
    const detail = reason => `${reason}：${task.dbName} / ${task.store}；已扫描 ${count} 条；最后事件 ${lastEvent}`;
    const fail = error => {
      if (settled) return;
      settled = true; clearTimers(); reject(error);
      try { tx?.abort(); } catch { /* Best effort after a stalled/ended transaction. */ }
    };
    const report = event => {
      lastEvent = event;
      onProgress({ phase: "COUNT_KEYS", dbName: task.dbName, storeName: task.store, scannedCount: count, elapsedMs: Math.round(performance.now() - started), lastEvent });
    };
    const armInactivity = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => fail(Error(detail("预检超时（inactivity timeout，20 秒无进展）"))), RESCUE_MESSAGE_COUNT_INACTIVITY_TIMEOUT_MS);
    };
    const absoluteTimer = setTimeout(() => fail(Error(detail("预检超时（absolute timeout，120 秒总上限）"))), RESCUE_MESSAGE_COUNT_ABSOLUTE_TIMEOUT_MS);
    const complete = () => {
      if (settled || !exhausted || !txComplete) return;
      settled = true; clearTimers(); resolve({ count, schema: spec });
    };
    armInactivity();
    try {
      tx = db.transaction(task.store, "readonly"); const store = tx.objectStore(task.store);
      spec = storeSchema(store); report("TX_OPENED");
      tx.oncomplete = () => {
        if (settled) return;
        try { txComplete = true; report("TX_COMPLETE"); complete(); } catch (error) { fail(error); }
      };
      tx.onerror = tx.onabort = event => {
        if (settled) return;
        try { report(event.type === "abort" ? "TX_ABORT" : "TX_ERROR"); } catch { /* Preserve the database failure. */ }
        fail(Error(detail("预检读取失败")));
      };
      const request = store.openKeyCursor(); report("REQUEST_ISSUED");
      request.onerror = () => { if (!settled) fail(Error(detail("聊天消息 key 请求失败"))); };
      request.onsuccess = () => {
        if (settled) return;
        try {
          const cursor = request.result;
          if (!cursor) { exhausted = true; report("CURSOR_EXHAUSTED"); armInactivity(); complete(); return; }
          count++; lastEvent = count === 1 ? "FIRST_KEY_RECEIVED" : "KEY_PROGRESS";
          if (count === 1 || count % RESCUE_MESSAGE_COUNT_PROGRESS_KEYS === 0) report(lastEvent);
          cursor.continue(); armInactivity();
        } catch (error) { fail(error); }
      };
    } catch (error) { fail(error); }
  });
}
function countTask(db, task, schema, onProgress) {
  if (task.dbName === "AiPhoneChatDB" && task.store === "messages") return countMessageKeys(db, task, onProgress);
  return new Promise((resolve, reject) => {
    let tx; let spec; let count = 0; let settled = false; let requestComplete = false; let txComplete = false;
    const fail = error => {
      if (settled) return;
      settled = true; clearTimeout(timer); reject(error);
      try { tx?.abort(); } catch { /* It may already have ended. */ }
    };
    const complete = () => {
      if (settled || !requestComplete || !txComplete) return;
      settled = true; clearTimeout(timer); resolve({ count, schema: spec });
    };
    const timer = setTimeout(() => fail(Error(`预检超时：${task.dbName} / ${task.store}`)), RESCUE_PREFLIGHT_STORE_TIMEOUT_MS);
    try {
      tx = db.transaction(task.store, "readonly"); const store = tx.objectStore(task.store);
      spec = storeSchema(store);
      tx.oncomplete = () => { txComplete = true; complete(); };
      tx.onerror = tx.onabort = () => fail(Error(`预检读取失败：${task.dbName} / ${task.store}`));
      const selectors = task.type === "kv" ? compileKvSelectors(schema, task.moduleId, task.sourceIndex) : [];
      const scan = index => {
        if (settled) return;
        if (task.type === "kv" && selectors.length && index === selectors.length) { requestComplete = true; complete(); return; }
        if (task.type === "kv") onProgress({ phase: "COUNT_SELECTOR", dbName: task.dbName, storeName: task.store, sourceLabel: task.source.label, selectorIndex: index, selectorCount: selectors.length });
        // Even an empty selection issues a bounded metadata request, so schema
        // inspection never relies on a request-free transaction completing.
        const request = task.type === "indexeddb" ? store.count() : selectors.length ? store.openKeyCursor(kvSelectorRange(selectors[index])) : store.count(IDBKeyRange.only(CHECKPOINT_KEY));
        request.onerror = () => fail(Error(`预检读取失败：${task.dbName} / ${task.store}`));
        request.onsuccess = () => {
          if (settled) return;
          try {
            if (task.type === "indexeddb") count = request.result;
            else if (selectors.length) {
              const cursor = request.result;
              if (cursor) { if (ownsKey(schema, task.moduleId, task.sourceIndex, cursor.primaryKey, "kv")) count++; cursor.continue(); return; }
              scan(index + 1); return;
            }
            requestComplete = true; complete();
          } catch (error) { fail(error); }
        };
      };
      scan(0);
    } catch (error) { fail(error); }
  });
}
export async function preflightInventory(schema, ids, onProgress = () => {}) {
  const modules = selectedModules(schema, ids); const tasks = []; let completedStores = 0;
  // Unknown store lists expand this denominator when their database opens.
  let totalStores = modules.reduce((total, module) => total + module.sources.reduce((sum, source) => sum + (source.type === "indexeddb" ? source.stores?.length ?? 1 : 1), 0), 0);
  for (const module of modules) for (const source of module.sources) {
    const base = { moduleId: module.id, label: module.label, sourceIndex: source.sourceIndex, type: source.type, source };
    if (source.type === "localStorage") {
      onProgress({ phase: "COUNT_STORE", dbName: "localStorage", storeName: "localStorage", completedStores, totalStores });
      tasks.push({ ...base, id: `${module.id}/${source.sourceIndex}/localStorage`, exists: true, count: localKeys(schema, module.id, source.sourceIndex).length }); completedStores++; continue;
    }
    const dbName = source.type === "kv" ? "AiPhoneKvDB" : source.dbName;
    onProgress({ phase: "OPEN_DB", dbName, completedStores, totalStores });
    const db = await openExistingDb(dbName);
    if (!db) {
      if (module.critical) throw Error(`关键数据库不存在，不能开始救援备份：${dbName}`);
      totalStores -= source.type === "indexeddb" ? source.stores?.length ?? 1 : 1;
      tasks.push({ ...base, id: `${module.id}/${source.sourceIndex}/absent`, dbName, exists: false, count: 0 }); continue;
    }
    try {
      const names = source.type === "kv" ? ["entries"] : source.stores || Array.from(db.objectStoreNames).sort();
      totalStores += names.length - (source.type === "indexeddb" ? source.stores?.length ?? 1 : 1);
      if (!names.length && module.critical) throw Error(`关键数据库没有 object store：${dbName}`);
      if (!names.length) tasks.push({ ...base, id: `${module.id}/${source.sourceIndex}/empty`, dbName, exists: true, count: 0 });
      for (const name of names) {
        if (!db.objectStoreNames.contains(name)) throw Error(`数据库缺少 object store：${dbName}/${name}`);
        onProgress({ phase: "COUNT_STORE", dbName, storeName: name, completedStores, totalStores });
        const task = { ...base, id: `${module.id}/${source.sourceIndex}/${name}`, dbName, store: name, exists: true, count: 0 };
        Object.assign(task, await countTask(db, task, schema, onProgress)); tasks.push(task); completedStores++;
      }
    } finally { db.close(); }
  }
  onProgress({ phase: "COMPLETE", completedStores, totalStores });
  return tasks;
}
function sameInventory(a, b) {
  const metadata = ({ id, exists, count, schema, source, dbName }) => ({ id, exists, count, schema, source, dbName });
  return JSON.stringify(a.map(metadata)) === JSON.stringify(b.map(metadata));
}

async function readBatch(task, lastKey, schema, rowCap, probe) {
  if (task.type === "localStorage") {
    const keys = localKeys(schema, task.moduleId, task.sourceIndex); const after = lastKey === null ? null : decodeKey(lastKey);
    const rows = []; let chars = 0; let last = lastKey; let done = true;
    for (const key of keys) {
      if (after !== null && key <= after) continue;
      const value = localStorage.getItem(key); if (value === null) continue;
      if (rows.length && (rows.length >= rowCap || chars + key.length + value.length > RESCUE_RAW_BATCH_CHAR_BUDGET)) { done = false; break; }
      rows.push({ key, value }); chars += key.length + value.length; last = encodeKey(key);
      if (rows.length >= rowCap || chars >= RESCUE_RAW_BATCH_CHAR_BUDGET) { done = false; break; }
    }
    probe("batch", { task: task.id, rows: rows.length, chars }); return { rows, lastKey: last, done };
  }
  const db = await openExistingDb(task.dbName);
  if (!db) throw Error(sourceChanged);
  try {
    const tx = db.transaction(task.store, "readonly"); const completed = transactionDone(tx); const store = tx.objectStore(task.store);
    const rows = []; let chars = 0; let last = lastKey; let done = false;
    if (task.type === "kv") {
      const selectors = compileKvSelectors(schema, task.moduleId, task.sourceIndex);
      last = { ...validateKvCursor(lastKey ?? { selectorIndex: 0, key: null }, selectors) };
      const scan = () => {
        if (last.selectorIndex === selectors.length) { done = true; return; }
        const selector = selectors[last.selectorIndex];
        const request = store.openKeyCursor(kvSelectorRange(selector, last.key === null ? null : decodeKey(last.key)));
        request.onsuccess = () => {
          try {
            const cursor = request.result;
            if (!cursor) { last = { selectorIndex: last.selectorIndex + 1, key: null }; scan(); return; }
            const key = cursor.primaryKey;
            probe("kvKey", { task: task.id, selectorIndex: last.selectorIndex, selectorType: selector.type });
            const advance = () => {
              last = selector.type === "exact" ? { selectorIndex: last.selectorIndex + 1, key: null } : { selectorIndex: last.selectorIndex, key: encodeKey(key) };
            };
            const proceed = () => { if (selector.type === "exact") scan(); else cursor.continue(); };
            if (!ownsKey(schema, task.moduleId, task.sourceIndex, key, "kv")) { advance(); proceed(); return; }
            // Enumerate keys first: earlier owners' values are never loaded.
            const read = store.get(key);
            read.onsuccess = () => {
              try {
                const value = read.result; const bytes = rawSize(value);
                if (rows.length && chars + bytes > RESCUE_RAW_BATCH_CHAR_BUDGET) return;
                rows.push({ key, value }); chars += bytes; advance();
                if (rows.length < rowCap && chars < RESCUE_RAW_BATCH_CHAR_BUDGET) proceed();
              } catch { tx.abort(); }
            };
          } catch { tx.abort(); }
        };
      };
      scan();
      await completed; probe("batch", { task: task.id, rows: rows.length, chars }); return { rows, lastKey: last, done };
    }
    const request = store.openCursor(lastKey === null ? undefined : IDBKeyRange.lowerBound(decodeKey(lastKey), true));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { done = true; return; }
      try {
        const value = cursor.value; const bytes = rawSize(value);
        if (rows.length && chars + bytes > RESCUE_RAW_BATCH_CHAR_BUDGET) return;
        rows.push({ key: cursor.primaryKey, value }); chars += bytes; last = encodeKey(cursor.primaryKey);
        // Do not advance cursor after the row cap, especially messages cap=1.
        if (rows.length < rowCap && chars < RESCUE_RAW_BATCH_CHAR_BUDGET) cursor.continue();
      } catch { tx.abort(); }
    };
    await completed; probe("batch", { task: task.id, rows: rows.length, chars }); return { rows, lastKey: last, done };
  } finally { db.close(); }
}

export class RescueExporter {
  constructor(schema, inventory, selected, mode, options = {}) {
    this.schema = schema; this.inventory = inventory; this.selected = selected; this.mode = mode;
    this.setId = crypto.randomUUID?.() || `${Date.now().toString(36)}-${Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => byte.toString(16).padStart(2, "0")).join("")}`;
    this.createdAt = new Date().toISOString(); this.origin = location.origin;
    this.target = Math.min(options.partTargetBytes ?? RESCUE_PART_TARGET_BYTES, RESCUE_PART_TARGET_BYTES);
    if (!Number.isSafeInteger(this.target) || this.target <= 0) throw Error("分卷大小无效");
    this.probe = options.probe || (() => {}); this.parts = []; this.pending = null; this.generating = false;
    // Isolated KV rescue supplies bounded reads and a lossless string payload.
    // Existing rescue modes use the original path unchanged.
    this.batchReader = options.batchReader; this.payloadBuilder = options.payloadBuilder;
    this.storageSerializer = options.storageSerializer || serializeStorageString; this.onBatchCommitted = options.onBatchCommitted;
    this.state = { taskIndex: 0, lastKey: null, sequence: 0, exportedCounts: Object.fromEntries(inventory.map(task => [task.id, 0])) };
  }
  static async prepare(schema, ids, mode, options) {
    schema = schemaForMode(schema, ids, mode);
    return new RescueExporter(schema, await preflightInventory(schema, ids, options?.onProgress), selectedModules(schema, ids).map(module => module.id), mode, options);
  }
  checkpoint(state = this.state, parts = this.parts) {
    // A new checkpoint entering a KV task is distinguishable from legacy null
    // or tagged-key cursors. This stores only selector position and one key.
    if (this.inventory[state.taskIndex]?.type === "kv" && state.lastKey === null) state = { ...state, lastKey: { selectorIndex: 0, key: null } };
    return { version: 1, setId: this.setId, createdAt: this.createdAt, origin: this.origin, mode: this.mode, selected: this.selected, inventory: this.inventory, state, parts, partTargetBytes: this.target };
  }
  persist(state = this.state, parts = this.parts) {
    // Failure is visible and keeps the pending part: never discard a Blob before
    // its user-confirmed continuation checkpoint is safely stored.
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(this.checkpoint(state, parts)));
  }
  static readCheckpoint() {
    try { const raw = localStorage.getItem(CHECKPOINT_KEY); return raw ? JSON.parse(raw) : null; } catch { throw Error("救援断点无法读取，请重新开始"); }
  }
  static restart() { localStorage.removeItem(CHECKPOINT_KEY); }
  static async resume(schema, options = {}) {
    const saved = RescueExporter.readCheckpoint();
    if (!saved || saved.version !== 1 || !/^[a-zA-Z0-9-]{1,100}$/.test(saved.setId) || !numeric(saved.state?.taskIndex) || !numeric(saved.state?.sequence) || !Array.isArray(saved.parts) || !saved.state.exportedCounts || !Array.isArray(saved.inventory) || !Number.isFinite(Date.parse(saved.createdAt)) || saved.origin !== location.origin) throw Error("救援断点格式无效");
    if (saved.inventory[saved.state.taskIndex]?.type === "kv" && (!saved.state.lastKey || !Object.hasOwn(saved.state.lastKey, "selectorIndex"))) throw Error("救援断点来自旧版 KV 扫描逻辑，请重新开始救援备份。Float 原数据未修改。");
    const result = await RescueExporter.prepare(schema, saved.selected, saved.mode, { ...options, partTargetBytes: saved.partTargetBytes });
    if (!sameInventory(saved.inventory, result.inventory)) throw Error(resumeChanged);
    if (saved.state.taskIndex > result.inventory.length || Object.keys(saved.state.exportedCounts).length !== result.inventory.length || saved.parts.some((part, i) => part.partNumber !== i + 1 || part.filename !== partFilename(saved.setId, i + 1) || !numeric(part.bytes) || part.bytes > RESCUE_PART_HARD_MAX_BYTES || !numeric(part.recordCount) || !Array.isArray(part.moduleIds) || !/^[a-f0-9]{64}$/.test(part.sha256)) || result.inventory.some((task, i) => !numeric(saved.state.exportedCounts[task.id]) || saved.state.exportedCounts[task.id] > task.count || i < saved.state.taskIndex && saved.state.exportedCounts[task.id] !== task.count) || saved.parts.reduce((sum, part) => sum + part.recordCount, 0) !== Object.values(saved.state.exportedCounts).reduce((sum, records) => sum + records, 0)) throw Error("救援断点计数无效");
    const task = result.inventory[saved.state.taskIndex];
    if (task?.type === "kv") validateKvCursor(saved.state.lastKey, compileKvSelectors(schema, task.moduleId, task.sourceIndex));
    else if (saved.state.lastKey !== null) encodeKey(decodeKey(saved.state.lastKey));
    result.setId = saved.setId; result.createdAt = saved.createdAt; result.state = saved.state; result.parts = saved.parts; return result;
  }
  manifest(stats, sourceCounts, number) {
    const modules = this.schema.modules.filter(module => stats.has(module.id)).map(module => ({ id: module.id, label: module.label, ...stats.get(module.id) }));
    return { format: "ai-phone-backup", version: 2, createdAt: this.createdAt, origin: this.origin, modules, totalBytes: modules.reduce((sum, module) => sum + module.bytes, 0), totalRecords: modules.reduce((sum, module) => sum + module.records, 0), rescueSet: { version: 1, setId: this.setId, partNumber: number, createdAt: this.createdAt, mode: this.mode, sourceCounts } };
  }
  async nextPart() {
    if (this.pending || this.generating) throw Error("请先保存并确认当前卷");
    this.generating = true;
    try { return await this.buildPart(); } finally { this.generating = false; }
  }
  async buildPart() {
    const writer = new StoreZipWriter(this.probe); const refs = new Set(); const stats = new Map(); const counts = {}; const next = cloneMetadata(this.state);
    const number = this.parts.length + 1; let oversized = false; let singleOversizedMedia = false; let forcedRows = null;
    while (next.taskIndex < this.inventory.length) {
      const task = this.inventory[next.taskIndex];
      if (!task.exists || !task.store && task.type !== "localStorage") { next.taskIndex++; next.lastKey = null; continue; }
      const rowCap = forcedRows || (task.dbName === "AiPhoneChatDB" && task.store === "messages" ? CHAT_RESCUE_BATCH_ROWS : DEFAULT_RESCUE_BATCH_ROWS);
      const batch = this.batchReader ? await this.batchReader(task, next.lastKey, rowCap, this.probe) : await readBatch(task, next.lastKey, this.schema, rowCap, this.probe);
      const recordCount = batch.rows.length;
      if (!recordCount && task.count !== 0) { if (!batch.done) throw Error("读取未前进，救援备份已停止"); next.taskIndex++; next.lastKey = null; continue; }
      const collector = createCollector(this.probe); const records = [];
      // Drain raw references one row at a time after the readonly transaction ends.
      while (batch.rows.length) {
        const raw = batch.rows.shift();
        records.push(task.type === "indexeddb" ? { key: await serializeValue(raw.key, collector, this.probe), value: await serializeValue(raw.value, collector, this.probe) } : { key: raw.key, value: await this.storageSerializer(task.type === "kv" ? raw.value.value : raw.value, collector, this.probe) });
      }
      const source = task.type === "indexeddb" ? { type: "indexeddb", dbName: task.dbName, stores: [{ ...task.schema, records }] } : { type: task.type, records };
      const payloadBlob = this.payloadBuilder ? await this.payloadBuilder(task, records) : jsonBlob({ moduleId: task.moduleId, sources: [source] }); records.length = 0;
      const filename = `modules/${task.moduleId}/${String(task.sourceIndex).padStart(3, "0")}-${String(next.sequence + 1).padStart(6, "0")}.json`;
      const media = [...collector.media.entries()].filter(([ref]) => !refs.has(ref)).map(([ref, blob]) => ({ name: `media/${ref}.bin`, blob, ref }));
      const previous = stats.get(task.moduleId) || { records: 0, bytes: 0 };
      const proposedStats = new Map(stats); proposedStats.set(task.moduleId, { records: previous.records + recordCount, bytes: previous.bytes + payloadBlob.size + media.reduce((sum, entry) => sum + entry.blob.size, 0) });
      const proposedCounts = { ...counts, [task.id]: (counts[task.id] || 0) + recordCount };
      const manifestBlob = jsonBlob(this.manifest(proposedStats, proposedCounts, number));
      const projected = writer.projected([...media, { name: filename, blob: payloadBlob }, { name: "manifest.json", blob: manifestBlob }]);
      const projectedDirectory = writer.centralBytes + [...media.map(entry => entry.name), filename, "manifest.json"].reduce((sum, name) => sum + 46 + new TextEncoder().encode(name).length, 0);
      if (writer.entries.length && (projected > this.target || projectedDirectory > CENTRAL_DIRECTORY_MAX_BYTES || writer.entries.length + media.length + 2 >= 65535)) {
        // Discard lookahead and reread it only AFTER the saved part is confirmed.
        collector.media.clear(); break;
      }
      if (projected > this.target && recordCount > 1) { collector.media.clear(); forcedRows = 1; continue; }
      if (projected > RESCUE_PART_HARD_MAX_BYTES) {
        collector.media.clear();
        if (recordCount > 1) { forcedRows = 1; continue; }
        throw Error("单条记录或媒体超过 128 MiB 分卷硬上限，不能生成完整救援备份");
      }
      oversized = projected > this.target;
      singleOversizedMedia = oversized && media.some(entry => entry.blob.size > this.target);
      for (const entry of media) { await writer.add(entry.name, entry.blob); refs.add(entry.ref); }
      await writer.add(filename, payloadBlob); collector.media.clear();
      stats.set(task.moduleId, proposedStats.get(task.moduleId)); Object.assign(counts, proposedCounts);
      next.exportedCounts[task.id] += recordCount; next.sequence++; next.lastKey = batch.lastKey; forcedRows = null;
      this.onBatchCommitted?.(next, task, batch);
      if (batch.done || task.count === 0) { next.taskIndex++; next.lastKey = null; }
      if (oversized) break;
    }
    if (!writer.entries.length) { this.state = next; return null; }
    const manifest = this.manifest(stats, counts, number); await writer.add("manifest.json", jsonBlob(manifest));
    const blob = writer.finalize(); this.probe("writerReleased", writer.parts.length);
    if (blob.size > RESCUE_PART_HARD_MAX_BYTES) throw Error("分卷超过硬上限");
    const metadata = { partNumber: number, filename: partFilename(this.setId, number), bytes: blob.size, sha256: await sha256Blob(blob, this.probe), moduleIds: manifest.modules.map(module => module.id), recordCount: manifest.totalRecords };
    this.pending = { blob, metadata, manifest, endState: next, oversized, singleOversizedMedia, saveSucceeded: false }; this.probe("pendingParts", 1); return this.pending;
  }
  confirmSaved() {
    if (!this.pending?.saveSucceeded) throw Error("请先保存当前卷，再明确确认继续");
    const state = this.pending.endState; const parts = [...this.parts, this.pending.metadata];
    this.persist(state, parts); this.state = state; this.parts = parts;
    this.pending.blob = null; this.pending = null; this.probe("pendingParts", 0);
  }
  async finish() {
    if (this.pending || this.generating || this.state.taskIndex < this.inventory.length) throw Error("所有分卷尚未保存");
    let complete = this.inventory.every(task => task.count === this.state.exportedCounts[task.id]);
    try { complete = complete && sameInventory(this.inventory, await preflightInventory(this.schema, this.selected)); } catch { complete = false; }
    return { format: "float-rescue-set", version: 1, setId: this.setId, createdAt: this.createdAt, mode: this.mode, origin: this.origin, selectedModules: this.selected, parts: this.parts, inventory: this.inventory, exportedCounts: this.state.exportedCounts, totalParts: this.parts.length, totalBytes: this.parts.reduce((sum, part) => sum + part.bytes, 0), complete, ...(!complete ? { error: sourceChanged, status: "INCOMPLETE" } : {}) };
  }
}
