// Disposable localhost data only; fault injection never touches the user's site.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const vm = require('node:vm');
const ts = require('typescript');
const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
let checks = 0;
function check(label, value) { assert.ok(value, label); checks++; console.log('PASS ' + label); }
async function routeModule(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(await fs.readFile(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, { exports, Response, require: name => { if (!imports[name]) throw Error('unexpected import ' + name); return imports[name]; } });
  return exports;
}
(async () => {
  const modules = await routeModule('lib/data-management/modules.ts');
  const schema = await (await routeModule('app/float-rescue-backup/schema/route.ts', { '@/lib/data-management/modules': modules })).GET().json();
  const html = await (await routeModule('app/float-rescue-backup/route.ts')).GET().text();
  const server = http.createServer(async (req, res) => {
    try {
      const name = new URL(req.url, 'http://fixture').pathname;
      if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
      if (name === '/fixture') { res.setHeader('Content-Type', 'text/html'); return res.end('<!doctype html><title>Preflight fixture</title>'); }
      if (name === '/float-rescue-backup') { res.setHeader('Content-Type', 'text/html'); return res.end(html); }
      if (name === '/float-rescue-backup/schema') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(schema)); }
      if (name === '/float-rescue-backup.js' || /^\/float-rescue\/[a-z0-9-]+\.js$/.test(name)) { res.setHeader('Content-Type', 'text/javascript'); return res.end(await fs.readFile(path.join('public', name))); }
      res.writeHead(404); res.end();
    } catch (error) { res.writeHead(500); res.end(error.message); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ baseURL: `http://127.0.0.1:${server.address().port}` });
    const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/fixture');
    await page.evaluate(async schema => {
      const open = (name, names, keyPath) => new Promise((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onupgradeneeded = () => names.forEach(name => request.result.createObjectStore(name, { keyPath }));
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      for (const source of schema.modules.find(module => module.id === 'chat').sources) {
        if (source.type === 'localStorage') continue;
        const kv = source.type === 'kv'; const name = kv ? 'AiPhoneKvDB' : source.dbName;
        const names = name === 'AiPhoneChatDB' ? ['messages','sessions','contacts'] : ['entries'];
        const db = await open(name, names, kv ? 'key' : 'id');
        const tx = db.transaction(names, 'readwrite');
        if (name === 'AiPhoneChatDB') for (let n = 0; n < 3; n++) tx.objectStore('messages').put({ id: String(n), content: 'PRIVATE_BODY', mediaUrl: 'data:image/png;base64,PRIVATE_MEDIA' });
        if (kv) tx.objectStore('entries').put({ key: 'ai_phone_chat_settings_v1', value: 'PRIVATE_CONFIGURATION' });
        await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); }); db.close();
      }
    }, schema);
    const normal = await page.evaluate(async schema => {
      window.api = await import('/float-rescue/exporter.js'); window.io = await import('/float-rescue/io.js');
      window.enumerations = 0; indexedDB.databases = () => { enumerations++; return new Promise(() => {}); };
      window.writes = 0; window.transactions = []; window.requestKinds = [];
      for (const name of ['put','add','delete','clear']) IDBObjectStore.prototype[name] = () => { writes++; throw Error('business write forbidden'); };
      indexedDB.deleteDatabase = () => { writes++; throw Error('database deletion forbidden'); };
      const nativeTx = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function(names, mode = 'readonly', ...rest) { if (mode !== 'readonly') { writes++; throw Error('write tx forbidden'); } const tx = nativeTx.call(this, names, mode, ...rest); transactions.push({ db: this.name, stores: Array.from(tx.objectStoreNames), requests: 0, tx }); return tx; };
      for (const name of ['count','openKeyCursor']) {
        const native = IDBObjectStore.prototype[name];
        IDBObjectStore.prototype[name] = function(...args) { transactions.find(entry => entry.tx === this.transaction).requests++; requestKinds.push(name); return native.apply(this, args); };
      }
      for (const name of ['get','getAll','getAllKeys','openCursor']) IDBObjectStore.prototype[name] = () => { throw Error('preflight must not read values'); };
      Object.defineProperty(IDBCursorWithValue.prototype, 'value', { get() { throw Error('message body read'); } });
      const progress = [];
      const inventory = await Promise.race([api.preflightInventory(schema, ['chat'], value => progress.push(value)), new Promise((_, reject) => setTimeout(() => reject(Error('preflight waited for enumeration')), 1500))]);
      return { inventory, progress, writes, enumerations, transactions: transactions.map(({ tx, ...entry }) => entry), requestKinds, constants: [io.RESCUE_DB_OPEN_TIMEOUT_MS, api.RESCUE_PREFLIGHT_STORE_TIMEOUT_MS] };
    }, schema);
    check('pending indexedDB.databases is never called; normal chat preflight returns correct count without message values', normal.enumerations === 0 && normal.inventory.find(task => task.store === 'messages').count === 3);
    check('schema and count/selectors share one readonly transaction per store, never schema-only', normal.transactions.length === 6 && normal.transactions.every(tx => tx.requests === (tx.db === 'AiPhoneKvDB' ? 18 : 1)) && normal.requestKinds.filter(kind => kind === 'openKeyCursor').length === 18);
    const starts = normal.progress.filter(item => item.phase === 'COUNT_STORE');
    check('progress advances through DB/store/selectors metadata only and reports completion', starts.length === 7 && starts.every((item, n) => item.completedStores === n && item.totalStores >= n + 1) && normal.progress.at(-1).phase === 'COMPLETE' && normal.progress.at(-1).completedStores === 7 && !JSON.stringify(normal.progress).includes('PRIVATE') && normal.progress.every(item => Object.keys(item).every(key => ['phase','dbName','storeName','completedStores','totalStores','sourceLabel','selectorIndex','selectorCount'].includes(key))));
    assert.deepEqual(normal.constants, [15000,30000]);
    check('production open/store timeout constants are 15s/30s; preflight performs zero business writes', normal.writes === 0);
    await require('./rescue-backup/kv-scenarios.cjs')({ browser, baseURL: `http://127.0.0.1:${server.address().port}`, schema, check });

    const missing = await page.evaluate(async () => {
      const result = await io.openExistingDb('MissingRescueFixture');
      const names = await IDBFactory.prototype.databases.call(indexedDB);
      return { missing: result === null, names: names.map(db => db.name), enumerations };
    });
    check('native missing DB upgrade oldVersion=0 aborts and leaves no empty DB without enumeration', missing.missing && !missing.names.includes('MissingRescueFixture') && missing.enumerations === 0);

    const opens = await page.evaluate(async () => {
      const nativeOpen = indexedDB.open; const nativeTimer = setTimeout; const nativeClear = clearTimeout;
      let request; let scheduled = false; let aborts = 0; let closes = 0; let active = new Set();
      window.setTimeout = (fn, ms) => { const id = nativeTimer(() => { active.delete(id); fn(); }, ms === 15000 ? 30 : ms); if (ms === 15000) { scheduled = true; active.add(id); } return id; };
      window.clearTimeout = id => { active.delete(id); nativeClear(id); };
      const errorOf = promise => promise.then(() => 'resolved', error => error.message);
      try {
        indexedDB.open = () => { if (!scheduled) throw Error('timer starts too late'); scheduled = false; request = { transaction: { abort() { aborts++; request.onerror?.(); } } }; return request; };
        const pending = io.openExistingDb('pending'); const timeout = await errorOf(pending);
        request.result = { close() { closes++; } }; request.onsuccess(); request.onerror(); request.onupgradeneeded({ oldVersion: 0 });
        const afterTimeout = { aborts, closes };
        const blockedPromise = io.openExistingDb('blocked'); request.onblocked(); const blocked = await errorOf(blockedPromise);
        request.result = { close() { closes++; } }; request.onsuccess();
        const missingPromise = io.openExistingDb('missing'); request.onupgradeneeded({ oldVersion: 0 }); const missing = await missingPromise;
        const errorPromise = io.openExistingDb('error'); request.onerror(); const error = await errorOf(errorPromise);
        const upgradePromise = io.openExistingDb('upgrade'); const upgradeRequest = request;
        const upgradeTimeout = await errorOf(upgradePromise); upgradeRequest.onupgradeneeded({ oldVersion: 0 });
        indexedDB.open = () => { throw Error('sync open error'); }; const synchronous = await errorOf(io.openExistingDb('sync'));
        return { timeout, blocked, missing: missing === null, error, upgradeTimeout, synchronous, afterTimeout, aborts, closes, remainingTimers: active.size };
      } finally { indexedDB.open = nativeOpen; window.setTimeout = nativeTimer; window.clearTimeout = nativeClear; }
    });
    check('open forever pending times out from before request creation; late success closes and late upgrade aborts', opens.timeout === '数据库读取超时：pending' && opens.afterTimeout.closes === 1 && opens.afterTimeout.aborts >= 2 && opens.upgradeTimeout === '数据库读取超时：upgrade');
    check('blocked/error/synchronous open errors settle once; missing upgrade abort error cannot replace null', opens.blocked === '数据库被其它页面占用：blocked' && opens.error === '数据库无法打开：error' && opens.synchronous === '数据库无法打开：sync' && opens.missing && opens.remainingTimers === 0);

    const stalled = await page.evaluate(async schema => {
      const nativeTimer = setTimeout; const nativeTx = IDBDatabase.prototype.transaction; const nativeCount = IDBObjectStore.prototype.count; const nativeCursor = IDBObjectStore.prototype.openKeyCursor; const nativeAbort = IDBTransaction.prototype.abort;
      let aborts = 0; const deadlines = []; const operations = [];
      window.setTimeout = (fn, ms) => { if (ms === 30000) deadlines.push(ms); return nativeTimer(fn, ms === 30000 ? 40 : ms); };
      IDBTransaction.prototype.abort = function() { aborts++; return nativeAbort.call(this); };
      const source = schema.modules.find(module => module.id === 'chat');
      try {
        // No result arrives even if WebKit signals transaction complete first.
        IDBObjectStore.prototype.count = () => ({});
        let countError; try { await api.preflightInventory(schema, ['chat'], event => operations.push(event)); } catch (error) { countError = error.message; }
        IDBObjectStore.prototype.count = nativeCount;
        IDBObjectStore.prototype.openKeyCursor = () => ({});
        let cursorError; try { await api.preflightInventory({ version: 1, modules: [{ ...source, sources: source.sources.filter(item => item.type === 'kv') }] }, ['chat']); } catch (error) { cursorError = error.message; }
        // Also simulate a genuinely pending transaction: abort emits synchronously.
        IDBDatabase.prototype.transaction = function(name) { return { objectStore: () => ({ name, keyPath: 'id', autoIncrement: false, indexNames: [], count: () => ({}) }), abort() { aborts++; this.onabort?.(); } }; };
        let transactionError; try { await api.preflightInventory(schema, ['chat']); } catch (error) { transactionError = error.message; }
        return { countError, cursorError, transactionError, aborts, deadlines, operations };
      } finally { window.setTimeout = nativeTimer; IDBDatabase.prototype.transaction = nativeTx; IDBObjectStore.prototype.count = nativeCount; IDBObjectStore.prototype.openKeyCursor = nativeCursor; IDBTransaction.prototype.abort = nativeAbort; }
    }, schema);
    check('pending count and transaction produce explicit store timeout, including complete-before-result ordering', stalled.countError === '预检超时：AiPhoneChatDB / contacts' && stalled.transactionError === stalled.countError && stalled.aborts === 3);
    check('pending KV key cursor times out and aborts; all deadlines use production 30s timer', stalled.cursorError === '预检超时：AiPhoneKvDB / entries' && stalled.deadlines.every(ms => ms === 30000));

    await page.addInitScript(() => {
      indexedDB.databases = () => { throw Error('UI enumeration forbidden'); };
      for (const name of ['put','add','delete','clear']) IDBObjectStore.prototype[name] = () => { throw Error('UI business write forbidden'); };
      const tx = IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction = function(names, mode = 'readonly', ...rest) { if (mode !== 'readonly') throw Error('UI write tx forbidden'); return tx.call(this, names, mode, ...rest); };
      const count = IDBObjectStore.prototype.count; IDBObjectStore.prototype.count = function(...args) { return this.name === 'messages' && window.stallMessages !== false ? {} : count.apply(this, args); };
      const keyCursor = IDBObjectStore.prototype.openKeyCursor; IDBObjectStore.prototype.openKeyCursor = function(...args) { return window.stallKv && this.transaction.db.name === 'AiPhoneKvDB' ? {} : keyCursor.apply(this, args); };
      const timer = setTimeout; window.setTimeout = (fn, ms, ...rest) => timer(fn, ms === 30000 ? 500 : ms, ...rest);
    });
    await page.goto('/float-rescue-backup'); await page.waitForFunction(() => !document.getElementById('preflight').disabled);
    await page.locator('#preflight').click(); await page.waitForFunction(() => document.getElementById('status').textContent.includes('AiPhoneChatDB / messages（2 / 7）'));
    check('actual standalone UI displays specific DB/store progress while request is pending', true);
    await page.waitForFunction(() => document.getElementById('status').textContent === '预检超时：AiPhoneChatDB / messages');
    check('actual UI shows timeout, unlocks preflight retry and does not enable generation', !(await page.locator('#preflight').isDisabled()) && await page.locator('#generate').isDisabled());
    await page.evaluate(() => { window.stallMessages = false; window.stallKv = true; });
    await page.locator('#preflight').click();
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('聊天设置与待处理状态') && document.getElementById('status').textContent.includes('selector 1 / 18'));
    check('actual UI displays KV source label and selector progress without values', (await page.locator('#status').textContent()).includes('AiPhoneKvDB / entries'));
    await page.waitForFunction(() => document.getElementById('status').textContent === '预检超时：AiPhoneKvDB / entries');
    check('all preflight fault simulations have no unhandled page errors', errors.length === 0);
    await context.close(); console.log(`PASS ${checks} rescue preflight browser checks`);
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
