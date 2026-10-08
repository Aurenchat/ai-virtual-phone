// No import of kv-db, hydrate, migrations, or the Float runtime.
export const KV_RESCUE_TIMEOUT_MS = 15_000;
export const KV_RESCUE_KEY_PAGE = 32;
export const KV_RESCUE_ROW_CAP = 1;
export const KV_RESCUE_MAX_VALUE_CHARS = 32 * 1024 * 1024;
export const KV_DATABASE_NAME = 'AiPhoneKvDB';
export const KV_NATIVE_VERSION = 10; // Dexie version(1) -> native version 10.
const safeName = error => /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error?.name || '') ? error.name : 'Error';
export function validateRow(row) {
  if (!row || typeof row.key !== 'string' || row.key.length > 4096 || typeof row.value !== 'string') throw Error('KV 记录类型不符合已核对的 schema，救援已停止');
  if (row.value.length > KV_RESCUE_MAX_VALUE_CHARS) throw Error('单条 KV value 超过 32 Mi 字符安全上限，已停止；原数据未修改，不能标为 COMPLETE');
  return row;
}
export class DexieKvReader {
  constructor(onProgress = () => {}) {
    this.kind = 'persisted-dexie'; this.onProgress = onProgress; this.events = []; this.closed = false; this.step = 'OPEN_DB'; this.lastStage = 'OPEN_DB'; this.started = performance.now(); this.missing = false;
    const progress = stage => this.stage(stage);
    // Dynamic schema discovery avoids Dexie's schema-repair/version-bump path.
    // Intercept upgrade events BEFORE Dexie's default missing-DB cleanup, which
    // otherwise calls deleteDatabase(). Never allow creation, upgrade or delete.
    const guardedIDB = {
      cmp: indexedDB.cmp.bind(indexedDB),
      open: (name, version) => {
        if (name !== KV_DATABASE_NAME || version !== undefined) throw Error('KV 救援禁止版本升级');
        const request = indexedDB.open(name);
        progress('OPEN_REQUEST_ISSUED');
        return new Proxy(request, {
          get: (target, property) => { const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value; },
          set: (target, property, handler) => {
            if (property === 'onupgradeneeded') target.onupgradeneeded = event => { this.missing = event.oldVersion === 0; progress('UPGRADE_ABORTED'); try { target.transaction.abort(); } catch {} target.result.close(); };
            else if (property === 'onsuccess') target.onsuccess = event => { if (this.closed) target.result.close(); else { progress('OPEN_SUCCESS'); handler(event); } };
            else if (property === 'onerror' || property === 'onblocked') target[property] = event => { if (!this.closed) progress(property === 'onblocked' ? 'OPEN_BLOCKED' : 'OPEN_ERROR'); handler(event); };
            else target[property] = handler;
            return true;
          },
        });
      },
      deleteDatabase: () => { throw Error('KV 救援禁止删除数据库'); },
    };
    if (!window.Dexie) throw Error('项目 Dexie 未加载，已停止');
    this.db = new window.Dexie(KV_DATABASE_NAME, { indexedDB: guardedIDB, IDBKeyRange, allowEmptyDB: false });
    this.db.use({ stack: 'dbcore', name: 'kv-rescue-observer', create: down => ({ ...down,
      transaction: (stores, mode, ...rest) => {
        if (mode !== 'readonly' || stores.some(name => name !== 'entries')) throw Error('KV 救援只允许 entries 只读事务');
        const tx = down.transaction(stores, mode, ...rest); this.activeTx = tx; progress('TX_OPENED');
        for (const event of ['complete','error','abort']) tx.addEventListener(event, () => { if (!this.closed) progress('TX_' + event.toUpperCase()); }, { once: true }); return tx;
      },
      table: name => {
        if (name !== 'entries') throw Error('KV 救援只允许 entries');
        const table = down.table(name); const observed = { ...table };
        for (const api of ['get','getMany','query','openCursor','count']) observed[api] = request => {
          progress('REQUEST_ISSUED');
          return table[api](request).then(value => { if (!this.closed) progress('REQUEST_SUCCESS'); return value; }, error => { if (!this.closed) progress('REQUEST_ERROR'); throw error; });
        };
        observed.mutate = () => { throw Error('KV 救援禁止写入'); }; return observed;
      },
    }) });
  }
  stage(lastStage) {
    this.lastStage = lastStage;
    const event = { step: this.step, lastStage, elapsedMs: Math.round(performance.now() - this.started) };
    this.events = [...this.events.slice(-39), event]; try { this.onProgress(event); } catch {}
  }
  async operation(step, callback) {
    if (this.closed) throw Error('KV 读取已关闭');
    this.step = step; this.stage('STEP_BEGIN'); let timer;
    try {
      return await Promise.race([Promise.resolve().then(callback), new Promise((_, reject) => { timer = setTimeout(() => { const last = this.lastStage; this.close(); const error = Error(`KV 读取超时：${step} / ${last}；结果未确认，不代表数据库为空`); error.name = 'TimeoutError'; reject(error); }, KV_RESCUE_TIMEOUT_MS); })]);
    } finally { clearTimeout(timer); }
  }
  async open() {
    // Dexie's Safari readiness helper calls the global databases() repeatedly.
    // Disable enumeration only in this isolated document while opening; use the
    // guarded factory above, with a total deadline and no name-list database.
    const descriptor = Object.getOwnPropertyDescriptor(indexedDB, 'databases');
    try {
      Object.defineProperty(indexedDB, 'databases', { configurable: true, value: undefined });
      await this.operation('OPEN_DB', () => this.db.open());
    } finally {
      if (descriptor) Object.defineProperty(indexedDB, 'databases', descriptor); else delete indexedDB.databases;
    }
    const native = this.db.backendDB();
    if (native.version !== KV_NATIVE_VERSION || native.objectStoreNames.length !== 1 || !native.objectStoreNames.contains('entries')) { this.close(); throw Error('KV 数据库版本/store 与 version(1) entries:key 不一致；不升级，已停止'); }
    const schema = this.db.table('entries').schema;
    if (schema.primKey.keyPath !== 'key' || schema.primKey.auto || schema.indexes.length) { this.close(); throw Error('KV 主键/schema 不一致；不修复，已停止'); }
    this.stage('SCHEMA_VERIFIED'); return this;
  }
  keys(after = null, limit = KV_RESCUE_KEY_PAGE) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > KV_RESCUE_KEY_PAGE) throw Error('KV key page 必须有界');
    return this.operation('READ_KEYS', () => this.db.transaction('r', 'entries', () => {
      const table = this.db.table('entries'); return (after === null ? table.orderBy('key') : table.where('key').above(after)).limit(limit).primaryKeys();
    }));
  }
  row(key) { return this.operation('READ_ROW', () => this.db.transaction('r', 'entries', async () => validateRow(await this.db.table('entries').get(key)))); }
  sampleKey() { return this.operation('READ_SAMPLE_KEY', () => this.db.transaction('r', 'entries', () => this.db.table('entries').where('key').equals('ai_phone_chat_settings_v1').limit(1).primaryKeys())); }
  async diagnose() {
    try {
      await this.open();
      const keys = await this.sampleKey(); this.stage('BOUNDED_KEY_DONE');
      if (keys.length) { const row = await this.row(keys[0]); this.stage('BOUNDED_ROW_DONE'); return this.report('SUCCESS', { keyCount: 1, rowCount: 1, valueChars: row.value.length }); }
      return this.report('EMPTY_UNCONFIRMED', { keyCount: 0, rowCount: 0 });
    } catch (error) { return this.report(this.missing ? 'DB_MISSING' : error.name === 'TimeoutError' ? 'TIMEOUT' : 'ERROR', { errorName: safeName(error) }); }
    finally { this.close(); }
  }
  report(status, metadata = {}) { return { version: 1, source: this.kind, status, dexieVersion: window.Dexie.semVer, nativeVersionExpected: KV_NATIVE_VERSION, step: this.step, lastStage: this.lastStage, elapsedMs: Math.round(performance.now() - this.started), events: this.events, ...metadata }; }
  close() { this.closed = true; try { this.activeTx?.abort(); } catch {} this.db.close(); }
}

// This reader accepts only primitive strings handed over from an already
// hydrated app. It never opens a database or performs hydration/migration.
export class CacheKvReader {
  constructor(entries) {
    this.kind = 'hydrated-cache-unverified'; this.values = new Map();
    for (const row of entries) { validateRow(row); if (this.values.has(row.key)) throw Error('缓存快照含重复 key'); this.values.set(row.key, row.value); }
    if (!this.values.size) throw Error('水合缓存为空，不能生成完成标记');
    this.ordered = [...this.values.keys()].sort();
  }
  async keys(after = null, limit = KV_RESCUE_KEY_PAGE) { let low = 0; let high = this.ordered.length; if (after !== null) while (low < high) { const middle = (low + high) >>> 1; if (this.ordered[middle] <= after) low = middle + 1; else high = middle; } return this.ordered.slice(low, low + limit); }
  async row(key) { return validateRow({ key, value: this.values.get(key) }); }
  close() { this.values.clear(); this.ordered.length = 0; }
}
