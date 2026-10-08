const assert = require('node:assert/strict');
// Native key cursors plus deterministic event/watchdog faults on localhost only.
module.exports = async ({ browser, baseURL, schema, check }) => {
  const context = await browser.newContext({ baseURL }); const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('/fixture');
    await page.evaluate(async () => {
      for (const name of ['AiPhoneChatDB','AiPhoneMediaCacheDB']) {
        const request = indexedDB.open(name);
        request.onupgradeneeded = () => (name === 'AiPhoneChatDB' ? ['contacts','messages','sessions'] : ['entries']).forEach(name => request.result.createObjectStore(name, { keyPath: 'id' }));
        const db = await new Promise(resolve => { request.onsuccess = () => resolve(request.result); });
        if (name === 'AiPhoneChatDB') {
          const tx = db.transaction('messages', 'readwrite'); const store = tx.objectStore('messages');
          for (let i = 0; i < 17500; i++) store.put({ id: `PRIVATE_ID_${String(i).padStart(5,'0')}`, sessionId: 'PRIVATE_SESSION', content: 'PRIVATE_BODY', mediaUrl: i === 0 ? 'data:image/png;base64,' + 'AAAA'.repeat(3300000) : undefined, rawResponseText: 'PRIVATE_RAW' });
          await new Promise(resolve => { tx.oncomplete = resolve; });
        }
        db.close();
      }
    });
    const native = await page.evaluate(async schema => {
      window.api = await import('/float-rescue/exporter.js'); window.audit = { writes: 0, countCalls: 0, opened: [] };
      const open = indexedDB.open; indexedDB.open = function(name, ...args) { audit.opened.push(name); if (!['AiPhoneChatDB','AiPhoneMediaCacheDB'].includes(name)) throw Error('excluded DB'); return open.call(this, name, ...args); };
      const tx = IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction = function(names, mode = 'readonly', ...rest) { if (mode !== 'readonly') { audit.writes++; throw Error('business write tx'); } return tx.call(this, names, mode, ...rest); };
      const count = IDBObjectStore.prototype.count; IDBObjectStore.prototype.count = function(...args) { if (this.name === 'messages') { audit.countCalls++; return {}; } return count.apply(this, args); };
      for (const method of ['put','add','delete','clear','get','getAll','getAllKeys','openCursor']) IDBObjectStore.prototype[method] = () => { throw Error('value read or business write'); };
      Object.defineProperty(IDBCursorWithValue.prototype, 'value', { get() { throw Error('message value read'); } });
      window.atob = () => { throw Error('media decode during preflight'); };
      const progress = [];
      const exporter = await api.RescueExporter.prepare(schema, ['chat'], 'chat-media-safety', { onProgress: value => progress.push(value) });
      return { inventory: exporter.inventory, progress, audit };
    }, schema);
    check('17,500 messages including 12+MiB inline media count accurately with pending count() and throwing value getter', native.inventory.find(task => task.store === 'messages').count === 17500 && native.audit.countCalls === 0 && native.audit.writes === 0);
    check('message preflight still opens only the two safety databases and returns their actual four stores', native.inventory.length === 4 && native.inventory.every(task => ['AiPhoneChatDB','AiPhoneMediaCacheDB'].includes(task.dbName)) && native.audit.opened.length === 2);
    const events = native.progress.filter(event => event.phase === 'COUNT_KEYS');
    assert.deepEqual(events.filter(event => event.lastEvent === 'KEY_PROGRESS').map(event => event.scannedCount), Array.from({ length: 34 }, (_, i) => (i + 1) * 512));
    check('progress reports every 512 keys, bounded event count and only quantities/time/stages, never message identifiers or values', events.length === 39 && events.at(-1).lastEvent === 'TX_COMPLETE' && events.at(-1).scannedCount === 17500 && events.every(event => Number.isFinite(event.elapsedMs) && Object.keys(event).every(key => ['phase','dbName','storeName','scannedCount','elapsedMs','lastEvent'].includes(key))) && !JSON.stringify(events).includes('PRIVATE_'));

    const faults = await page.evaluate(async () => {
      const nativeTx = IDBDatabase.prototype.transaction; const nativeTimer = setTimeout; const nativeClear = clearTimeout; const nativeNow = performance.now;
      const selected = { version: 1, modules: [{ id: 'chat', label: 'Chat', critical: true, sources: [{ type: 'indexeddb', sourceIndex: 0, dbName: 'AiPhoneChatDB', stores: ['messages'] }] }] };
      let request; let tx; let clock = 0; let nextId = 1000000; let aborts = 0; let continued = 0; const timers = new Map();
      performance.now = () => clock;
      window.setTimeout = (callback, ms, ...args) => {
        if (![20000,120000].includes(ms)) return nativeTimer(callback, ms, ...args);
        const id = nextId++; timers.set(id, { callback, ms, due: clock + ms }); return id;
      };
      window.clearTimeout = id => { if (!timers.delete(id)) nativeClear(id); };
      const tick = ms => {
        clock += ms;
        for (const [id, timer] of [...timers].sort((a,b) => a[1].due - b[1].due)) if (timer.due <= clock && timers.delete(id)) timer.callback();
      };
      IDBDatabase.prototype.transaction = function(name, mode) {
        if (mode !== 'readonly') throw Error('fault fixture write tx');
        request = null;
        tx = { objectStore: () => ({ name, keyPath: 'id', autoIncrement: false, indexNames: [], count() { throw Error('messages count forbidden'); }, openKeyCursor() { request = {}; return request; } }), abort() { aborts++; this.onabort?.({ type: 'abort' }); } };
        return tx;
      };
      async function begin() {
        clock = 0; aborts = 0; continued = 0;
        if (timers.size) throw Error('watchdog leaked from preceding operation');
        request = null; const progress = []; const state = { resolved: false, error: null, inventory: null };
        const promise = api.preflightInventory(selected, ['chat'], event => progress.push(event)).then(inventory => { state.resolved = true; state.inventory = inventory; }, error => { state.error = error.message; });
        for (let tries = 0; !request?.onsuccess && tries < 100; tries++) await new Promise(resolve => nativeTimer(resolve, 1));
        if (!request?.onsuccess) throw Error('fake request did not start');
        return { state, progress, promise, request, tx };
      }
      const key = run => {
        run.request.result = { get value() { throw Error('message value read'); }, get primaryKey() { throw Error('message ID must not enter diagnostics'); }, continue() { continued++; } };
        run.request.onsuccess();
      };
      const exhausted = run => { run.request.result = null; run.request.onsuccess(); };
      const complete = run => run.tx.oncomplete({ type: 'complete' });
      const results = {};
      try {
        let run = await begin(); tick(20000); await run.promise;
        const error = run.state.error; key(run); exhausted(run); complete(run);
        results.noRequest = { error, aborts, timers: timers.size, events: run.progress };

        run = await begin(); key(run); key(run); key(run); tick(20000); await run.promise;
        results.stalled = { error: run.state.error, aborts, timers: timers.size };

        run = await begin(); key(run); key(run); exhausted(run); await Promise.resolve();
        const pendingAfterExhaust = !run.state.resolved; tick(20000); await run.promise;
        results.noComplete = { pendingAfterExhaust, error: run.state.error, aborts, timers: timers.size };

        run = await begin(); key(run); key(run); exhausted(run); await Promise.resolve();
        const beforeComplete = run.state.resolved; complete(run); await run.promise;
        results.normal = { beforeComplete, count: run.state.inventory[0].count, events: run.progress.map(event => event.lastEvent).filter(Boolean), timers: timers.size };

        run = await begin(); complete(run); await Promise.resolve(); const beforeExhaust = run.state.resolved;
        key(run); exhausted(run); await run.promise;
        results.completeFirst = { beforeExhaust, count: run.state.inventory[0].count, timers: timers.size };

        run = await begin(); exhausted(run); complete(run); await run.promise;
        results.empty = { count: run.state.inventory[0].count, timers: timers.size };

        run = await begin(); key(run);
        for (let i = 0; i < 6; i++) { tick(10000); key(run); }
        exhausted(run); complete(run); await run.promise;
        results.longActive = { count: run.state.inventory[0].count, error: run.state.error, elapsed: clock, timers: timers.size };

        run = await begin(); key(run);
        for (let i = 0; i < 11; i++) { tick(10000); key(run); }
        tick(10000); await run.promise;
        results.absolute = { error: run.state.error, aborts, timers: timers.size };

        for (const type of ['error','abort']) {
          run = await begin(); key(run); run.tx[type === 'error' ? 'onerror' : 'onabort']({ type }); await run.promise;
          results[type] = { error: run.state.error, stage: run.progress.at(-1).lastEvent, timers: timers.size };
        }
        return results;
      } finally { IDBDatabase.prototype.transaction = nativeTx; window.setTimeout = nativeTimer; window.clearTimeout = nativeClear; performance.now = nativeNow; }
    });
    check('request never responds: inactivity error identifies DB/store, zero scanned, REQUEST_ISSUED; abort and late events safe', faults.noRequest.error.includes('inactivity timeout') && faults.noRequest.error.includes('AiPhoneChatDB / messages') && faults.noRequest.error.includes('已扫描 0 条') && faults.noRequest.error.includes('REQUEST_ISSUED') && faults.noRequest.aborts === 1);
    check('cursor stalls midway: inactivity error retains scanned count and KEY_PROGRESS stage', faults.stalled.error.includes('inactivity timeout') && faults.stalled.error.includes('已扫描 3 条') && faults.stalled.error.includes('KEY_PROGRESS') && faults.stalled.aborts === 1);
    check('exhausted cursor without TX completion cannot succeed and times out at CURSOR_EXHAUSTED', faults.noComplete.pendingAfterExhaust && faults.noComplete.error.includes('CURSOR_EXHAUSTED') && faults.noComplete.error.includes('已扫描 2 条') && faults.noComplete.aborts === 1);
    check('normal/empty scans succeed only after exhaustion AND TX completion, including inverse event order', !faults.normal.beforeComplete && faults.normal.count === 2 && !faults.completeFirst.beforeExhaust && faults.completeFirst.count === 1 && faults.empty.count === 0 && ['TX_OPENED','REQUEST_ISSUED','FIRST_KEY_RECEIVED','CURSOR_EXHAUSTED','TX_COMPLETE'].every(stage => faults.normal.events.includes(stage)));
    check('actively advancing 60s scan resets inactivity watchdog and is not subject to old fixed 30s timeout', faults.longActive.elapsed === 60000 && faults.longActive.count === 7 && faults.longActive.error === null);
    check('absolute 120s limit stops even advancing cursor and reports final scanned count/stage', faults.absolute.error.includes('absolute timeout') && faults.absolute.error.includes('已扫描 12 条') && faults.absolute.error.includes('KEY_PROGRESS') && faults.absolute.aborts === 1);
    check('TX_ERROR/TX_ABORT diagnostics distinguish failure events and all settled operations release both timers', faults.error.stage === 'TX_ERROR' && faults.abort.stage === 'TX_ABORT' && faults.error.error.includes('TX_ERROR') && faults.abort.error.includes('TX_ABORT') && Object.values(faults).every(result => result.timers === 0));
    check('message counter faults/native fixture have zero browser page errors', errors.length === 0);
  } finally { await context.close(); }
};
