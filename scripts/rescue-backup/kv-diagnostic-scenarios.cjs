const assert = require('node:assert/strict');
// Key-only probes on disposable localhost data; no user-origin access.
module.exports = async ({ browser, baseURL, schema, check }) => {
  const context = await browser.newContext({ baseURL }); const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('/fixture');
    await page.evaluate(async () => {
      const request = indexedDB.open('AiPhoneKvDB'); request.onupgradeneeded = () => request.result.createObjectStore('entries', { keyPath: 'key' });
      const db = await new Promise(resolve => { request.onsuccess = () => resolve(request.result); }); const tx = db.transaction('entries', 'readwrite');
      tx.objectStore('entries').put({ key: 'ai_phone_chat_settings_v1', value: 'PRIVATE_CONFIGURATION' });
      for (let n = 0; n < 20; n++) tx.objectStore('entries').put({ key: 'chat-generating:PRIVATE_ID-' + String(n).padStart(2, '0'), value: 'PRIVATE_VALUE' });
      tx.objectStore('entries').put({ key: 'ai_phone_characters_v1', value: 'LARGE_PRIVATE_CARD'.repeat(100000) });
      await new Promise(resolve => { tx.oncomplete = resolve; }); db.close();
    });
    const normal = await page.evaluate(async () => {
      window.diag = await import('/float-rescue/kv-diagnostics.js'); window.diagAudit = { txs: [], reads: [], writes: 0, maxCursor: 0 };
      const nativeTx = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function(names, mode = 'readonly', ...rest) { if (mode !== 'readonly') { diagAudit.writes++; throw Error('write tx'); } const tx = nativeTx.call(this, names, mode, ...rest); diagAudit.txs.push(tx); return tx; };
      for (const method of ['put','add','delete','clear','get','getAll','openCursor']) IDBObjectStore.prototype[method] = () => { throw Error('value/write API forbidden'); };
      for (const method of ['setItem','removeItem','clear']) Storage.prototype[method] = () => { diagAudit.writes++; throw Error('diagnostic persistence forbidden'); };
      Object.defineProperty(IDBCursorWithValue.prototype, 'value', { configurable: true, get() { throw Error('cursor value forbidden'); } });
      for (const method of ['getKey','count','getAllKeys','openKeyCursor']) {
        const native = IDBObjectStore.prototype[method];
        IDBObjectStore.prototype[method] = function(range, limit) { if (!range) throw Error('unbounded key scan'); if (method === 'getAllKeys' && limit !== 8) throw Error('unbounded keys'); diagAudit.reads.push({ method, tx: diagAudit.txs.indexOf(this.transaction), limit }); return native.call(this, range, ...(limit === undefined ? [] : [limit])); };
      }
      const results = []; const progress = [];
      for (const method of diag.KV_DIAGNOSTIC_METHODS) results.push(await diag.diagnoseKvRead(method, event => progress.push(event)));
      return { results, progress, report: diag.formatKvDiagnosticReport(results), audit: { reads: diagAudit.reads, writes: diagAudit.writes, txCount: diagAudit.txs.length } };
    });
    check('all four KV diagnostics use distinct readonly transactions and exactly one key-only bounded API each', normal.audit.txCount === 4 && normal.audit.writes === 0 && normal.audit.reads.map(item => item.tx).join(',') === '0,1,2,3' && normal.audit.reads.map(item => item.method).join(',') === 'getKey,count,getAllKeys,openKeyCursor');
    check('exact getKey/count agree; bounded prefix getAllKeys/cursor stop at eight, waiting for tx complete', normal.results.every(item => item.status === 'SUCCESS' && item.requestCompleted && item.transactionCompleted) && normal.results.map(item => item.keyCount).join(',') === '1,1,8,8' && normal.results[3].lastStage === 'TX_COMPLETE' && normal.results[3].stages.some(item => item.stage === 'CURSOR_LIMIT_REACHED'));
    check('diagnostic progress/report contains metadata only; no returned private key, value, or role card', !JSON.stringify(normal).includes('PRIVATE') && normal.report.includes('TIMEOUT/ERROR') && normal.report.includes('keyCount=null') && normal.progress.some(item => item.lastStage === 'REQUEST_ISSUED'));

    const stalled = await page.evaluate(async () => {
      const nativeTimer = setTimeout; const nativeTx = IDBDatabase.prototype.transaction; const nativeOpen = indexedDB.open;
      const original = Object.fromEntries(['getKey','count','getAllKeys','openKeyCursor'].map(method => [method, IDBObjectStore.prototype[method]]));
      let aborts = 0; const results = [];
      window.setTimeout = (fn, ms, ...rest) => nativeTimer(fn, ms === 15000 ? 35 : ms, ...rest);
      try {
        for (const method of diag.KV_DIAGNOSTIC_METHODS) {
          const api = method === 'prefixCursor' ? 'openKeyCursor' : method;
          IDBObjectStore.prototype[api] = () => ({});
          results.push(await diag.diagnoseKvRead(method)); IDBObjectStore.prototype[api] = original[api];
        }
        // Request returns a key, but transaction never completes: no success.
        IDBDatabase.prototype.transaction = () => ({ objectStore: () => ({ getKey() { const request = { result: 'PRIVATE_KEY' }; nativeTimer(() => request.onsuccess(), 0); return request; } }), abort() { aborts++; this.onabort?.({ type: 'abort' }); } });
        const noTxComplete = await diag.diagnoseKvRead('getKey');
        // Native unsupported/error handling, without ever reading a value.
        IDBDatabase.prototype.transaction = () => ({ objectStore: () => ({}), abort() { aborts++; } }); const unsupported = await diag.diagnoseKvRead('getKey');
        IDBDatabase.prototype.transaction = () => ({ objectStore: () => ({ count() { const request = { error: { name: 'UnknownError', message: 'PRIVATE_MESSAGE' } }; nativeTimer(() => request.onerror(), 0); return request; } }), abort() { aborts++; } }); const error = await diag.diagnoseKvRead('count');
        IDBDatabase.prototype.transaction = nativeTx;
        let late; let closes = 0; indexedDB.open = () => (late = {});
        const pendingOpen = await diag.diagnoseKvRead('getKey'); late.result = { close() { closes++; } }; late.onsuccess();
        indexedDB.open = nativeOpen;
        // Missing key is a confirmed zero only with both successful events.
        for (const api of ['getKey','count']) IDBObjectStore.prototype[api] = function() { return original[api].call(this, IDBKeyRange.only('nonexistent-fixture')); };
        const missingKeys = [await diag.diagnoseKvRead('getKey'), await diag.diagnoseKvRead('count')];
        return { results, noTxComplete, unsupported, error, pendingOpen, closes, aborts, missingKeys };
      } finally { window.setTimeout = nativeTimer; indexedDB.open = nativeOpen; IDBDatabase.prototype.transaction = nativeTx; for (const [api, value] of Object.entries(original)) IDBObjectStore.prototype[api] = value; }
    });
    check('every pending key API times out even after tx complete; count stays unconfirmed, never false empty', stalled.results.every(item => item.status === 'TIMEOUT' && item.keyCount === null && !item.requestCompleted));
    check('request success without tx complete times out, preserves last stage/observed count and aborts', stalled.noTxComplete.status === 'TIMEOUT' && stalled.noTxComplete.requestCompleted && !stalled.noTxComplete.transactionCompleted && stalled.noTxComplete.observedKeyCount === 1 && stalled.noTxComplete.keyCount === null && stalled.noTxComplete.lastStage === 'REQUEST_SUCCESS' && stalled.aborts >= 3);
    check('unsupported/request error/open hang are explicit results; late success closes; no sensitive error message', stalled.unsupported.status === 'UNSUPPORTED' && stalled.error.status === 'ERROR' && stalled.error.errorName === 'UnknownError' && stalled.pendingOpen.status === 'TIMEOUT' && stalled.closes === 1 && !JSON.stringify(stalled).includes('PRIVATE'));
    check('confirmed missing exact keys report zero only on SUCCESS', stalled.missingKeys.every(item => item.status === 'SUCCESS' && item.keyCount === 0 && item.transactionCompleted));

    const absentContext = await browser.newContext({ baseURL });
    try {
      const absent = await absentContext.newPage(); await absent.goto('/fixture');
      const result = await absent.evaluate(async () => { const diag = await import('/float-rescue/kv-diagnostics.js'); const result = await diag.diagnoseKvRead('getKey'); return { result, names: (await indexedDB.databases()).map(item => item.name) }; });
      check('diagnostic missing DB aborts upgrade and never leaves an empty database or reports confirmed zero', result.result.status === 'DB_MISSING' && result.result.keyCount === null && result.names.length === 0);
    } finally { await absentContext.close(); }

    const uiContext = await browser.newContext({ baseURL });
    try {
      const ui = await uiContext.newPage(); ui.on('pageerror', error => errors.push(error.message)); await ui.goto('/fixture');
      await ui.evaluate(async schema => {
        const names = schema.modules.filter(module => module.critical).flatMap(module => module.sources.filter(source => source.type === 'indexeddb' && !['AiPhoneChatDB','AiPhoneMediaCacheDB'].includes(source.dbName)).map(source => source.dbName));
        names.push('AiPhoneKvDB');
        for (const name of names) { const req = indexedDB.open(name); req.onupgradeneeded = () => req.result.createObjectStore('entries', { keyPath: 'id' }); const db = await new Promise(resolve => { req.onsuccess = () => resolve(req.result); }); db.close(); }
      }, schema);
      const requests = [];
      await uiContext.route('**/*', route => { const req = route.request(); const url = new URL(req.url()); if (req.method() !== 'GET' || url.origin !== baseURL) { requests.push(req.method() + ' ' + url.pathname); return route.abort(); } return route.continue(); });
      await ui.addInitScript(() => {
        const tx = IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction = function(names, mode = 'readonly', ...rest) { if (mode !== 'readonly') throw Error('UI write'); return tx.call(this, names, mode, ...rest); };
        for (const method of ['put','add','delete','clear']) IDBObjectStore.prototype[method] = () => { throw Error('UI write'); };
        IDBObjectStore.prototype.getKey = () => ({});
        const timer = setTimeout; window.setTimeout = (fn, ms, ...rest) => timer(fn, ms === 15000 ? 3000 : ms, ...rest);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.copiedReport = text; } } });
        window.kvOpens = 0; const open = indexedDB.open; indexedDB.open = function(name, ...rest) { if (name === 'AiPhoneKvDB') kvOpens++; return open.call(this, name, ...rest); };
      });
      await ui.goto('/float-rescue-backup'); await ui.waitForFunction(() => !document.getElementById('preset-remaining').disabled);
      assert.equal(await ui.evaluate(() => kvOpens), 0);
      await ui.locator('[data-kv-method="getKey"]').click(); await ui.waitForFunction(() => /REQUEST_ISSUED|TX_COMPLETE/.test(document.getElementById('kv-status').textContent));
      await ui.locator('#preset-remaining').click(); await ui.locator('#preflight').click(); await ui.waitForFunction(() => !document.getElementById('generate').disabled);
      check('actual UI has no automatic KV probes; stalled independent diagnostic cannot block remaining preflight', /REQUEST_ISSUED|TX_COMPLETE/.test(await ui.locator('#kv-status').textContent()) && await ui.evaluate(() => kvOpens) === 1);
      await ui.waitForFunction(() => document.getElementById('kv-status').textContent.includes('TIMEOUT'));
      await ui.locator('#copy-kv-report').click();
      check('actual timeout UI/copy report says unconfirmed, includes API/stage and keyCount null', await ui.evaluate(() => copiedReport.includes('"status": "TIMEOUT"') && copiedReport.includes('"keyCount": null') && copiedReport.includes('REQUEST_ISSUED')));
      check('diagnostic/remaining UI makes no uploads or external requests', requests.length === 0);
    } finally { await uiContext.close(); }
    check('all KV diagnostic scenarios have no unhandled browser errors', errors.length === 0);
  } finally { await context.close(); }
};
