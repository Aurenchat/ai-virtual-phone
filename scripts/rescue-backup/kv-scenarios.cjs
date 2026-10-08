const assert = require('node:assert/strict');
module.exports = async ({ browser, baseURL, schema, check }) => {
  const context = await browser.newContext({ baseURL }); const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('/fixture');
    const seeded = await page.evaluate(async schema => {
      const source = schema.modules.find(module => module.id === 'chat').sources.find(source => source.type === 'kv');
      const chatKeys = [...source.keys, ...source.prefixes.map((prefix, i) => prefix + 'fixture-' + i), source.prefixes[0] + '\uffff-tail', source.prefixes[1] + 'fixture-extra'];
      const request = indexedDB.open('AiPhoneKvDB');
      request.onupgradeneeded = () => request.result.createObjectStore('entries', { keyPath: 'key' });
      const db = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const tx = db.transaction('entries', 'readwrite'); const store = tx.objectStore('entries');
      for (let i = 0; i < 50000; i++) store.put({ key: `unrelated-${String(i).padStart(5, '0')}`, value: 'PRIVATE_UNRELATED_VALUE' });
      for (const key of chatKeys) store.put({ key, value: JSON.stringify({ value: key }) });
      for (let i = 0; i < 40; i++) store.put({ key: `rescue-test:${String(i).padStart(3, '0')}`, value: 'x'.repeat(500) });
      for (const key of ['shared:early','shared:late','exact-test','edge:\uffff-tail','\uffff\uffff-tail']) store.put({ key, value: 'fixture' });
      await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); }); db.close();
      window.chatKeys = chatKeys;
      return { exact: source.keys.length, prefixes: source.prefixes.length, count: chatKeys.length };
    }, schema);
    assert.deepEqual(seeded, { exact: 12, prefixes: 6, count: 20 });
    async function install() {
      await page.evaluate(async schema => {
        window.api = await import('/float-rescue/exporter.js'); window.io = await import('/float-rescue/io.js'); window.selectors = await import('/float-rescue/kv-selectors.js');
        window.metrics = { visited: 0, gets: 0, full: 0, writes: 0, maxRows: 0, maxChars: 0 }; window.phase = 'preflight'; window.allowAll = false; window.ownerSchema = schema;
        window.currentIds = ['chat'];
        const transaction = IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction = function(names, mode = 'readonly', ...rest) { if (mode !== 'readonly') { metrics.writes++; throw Error('business write forbidden'); } return transaction.call(this, names, mode, ...rest); };
        for (const name of ['put','add','delete','clear','getAll','getAllKeys']) IDBObjectStore.prototype[name] = () => { metrics.writes++; throw Error('business write/whole-store forbidden'); };
        indexedDB.deleteDatabase = () => { throw Error('deleteDatabase forbidden'); };
        const ls = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) { if (key !== io.CHECKPOINT_KEY) throw Error('unrelated localStorage write'); return ls.call(this, key, value); };
        const keyCursor = IDBObjectStore.prototype.openKeyCursor;
        IDBObjectStore.prototype.openKeyCursor = function(range, ...rest) {
          if (this.transaction.db.name === 'AiPhoneKvDB' && range === undefined) { metrics.full++; if (!allowAll) throw Error('non-includeAll KV full scan'); }
          const request = keyCursor.call(this, range, ...rest);
          request.addEventListener('success', () => { if (request.result) metrics.visited++; }); return request;
        };
        const cursor = IDBObjectStore.prototype.openCursor;
        IDBObjectStore.prototype.openCursor = function(...args) { if (this.transaction.db.name === 'AiPhoneKvDB') throw Error('KV value cursor forbidden'); return cursor.apply(this, args); };
        const get = IDBObjectStore.prototype.get;
        IDBObjectStore.prototype.get = function(key) {
          if (phase === 'preflight') throw Error('preflight value read');
          if (this.transaction.db.name === 'AiPhoneKvDB' && !ownerSchema.modules.some(module => currentIds.includes(module.id) && module.sources.some(source => source.type === 'kv' && io.ownsKey(ownerSchema, module.id, source.sourceIndex, key, 'kv')))) throw Error('unowned KV value read');
          metrics.gets++; return get.call(this, key);
        };
        Object.defineProperty(IDBCursorWithValue.prototype, 'value', { get() { throw Error('KV cursor.value forbidden'); } });
        window.probe = (type, value) => { if (type === 'batch') { metrics.maxRows = Math.max(metrics.maxRows, value.rows); metrics.maxChars = Math.max(metrics.maxChars, value.chars); } };
      }, schema);
    }
    await install();
    const inventory = await page.evaluate(async schema => {
      const progress = []; const tasks = await api.preflightInventory({ ...schema, modules: schema.modules.map(module => module.id === 'chat' ? { ...module, sources: module.sources.filter(source => source.type === 'kv') } : module) }, ['chat'], value => progress.push(value));
      const compiled = selectors.compileKvSelectors(schema, 'chat', 3);
      return { tasks, progress, metrics: { ...metrics }, compiled };
    }, schema);
    check('50,000 unrelated keys: chat preflight visits exactly 20 matched keys, no values/full scan/writes', inventory.tasks[0].count === 20 && inventory.metrics.visited === 20 && inventory.metrics.gets === 0 && inventory.metrics.full === 0 && inventory.metrics.writes === 0);
    check('chat compiles 12 exact + 6 prefix selectors and reports 18 metadata-only selector stages', inventory.compiled.filter(item => item.type === 'exact').length === 12 && inventory.compiled.filter(item => item.type === 'prefix').length === 6 && inventory.progress.filter(item => item.phase === 'COUNT_SELECTOR').length === 18 && !JSON.stringify(inventory.progress).includes('PRIVATE'));
    const exported = await page.evaluate(async schema => {
      const kvSchema = { ...schema, modules: schema.modules.map(module => module.id === 'chat' ? { ...module, sources: module.sources.filter(source => source.type === 'kv') } : module) };
      const exporter = await api.RescueExporter.prepare(kvSchema, ['chat'], 'chat', { probe });
      phase = 'export'; metrics.visited = metrics.gets = 0; window.seenKeys = [];
      // No need to parse ZIP to inspect batching: capture bounded gets, then
      // the separate real-import E2E validates the generated records themselves.
      const get = IDBObjectStore.prototype.get; IDBObjectStore.prototype.get = function(key) { seenKeys.push(key); return get.call(this, key); };
      let part; let records = 0;
      while ((part = await exporter.nextPart())) { records += part.metadata.recordCount; part.saveSucceeded = true; exporter.confirmSaved(); }
      const result = { records, keys: seenKeys, metrics: { ...metrics } };
      phase = 'preflight'; const index = await exporter.finish(); return { ...result, complete: index.complete };
    }, schema);
    check('chat export also visits/reads exactly 20 owned keys, bounded rows, no full scan, no omissions', exported.complete && exported.records === 20 && exported.metrics.visited === 20 && exported.metrics.gets === 20 && exported.metrics.maxRows <= 16 && exported.metrics.maxChars <= 16 * 1024 * 1024 && new Set(exported.keys).size === 20);
    console.log(`KV fixture: 50,000 unrelated; preflight visited=${inventory.metrics.visited}; export visited=${exported.metrics.visited}, value reads=${exported.metrics.gets}`);

    const overlap = await page.evaluate(async () => {
      const custom = { version: 1, modules: [
        { id: 'earlier', label: 'Earlier', sources: [{ type: 'kv', sourceIndex: 0, keys: ['shared:early'] }] },
        { id: 'chat', label: 'Chat', critical: true, sources: [{ type: 'kv', sourceIndex: 0, keys: ['exact-test','shared:early','shared:late','rescue-test:001'], prefixes: ['shared:','rescue-test:','rescue-test:00','shared:','edge:','\uffff\uffff'], excludeKeys: ['rescue-test:002'], excludePrefixes: ['rescue-test:03'] }] }
      ] };
      const compiled = selectors.compileKvSelectors(custom, 'chat', 0);
      phase = 'preflight'; ownerSchema = custom;
      const exporter = await api.RescueExporter.prepare(custom, ['chat'], 'chat', { probe }); const expected = exporter.inventory[0].count;
      phase = 'export'; seenKeys.length = 0; let part; let records = 0;
      while ((part = await exporter.nextPart())) { records += part.metadata.recordCount; part.saveSucceeded = true; exporter.confirmSaved(); }
      return { compiled, expected, records, keys: [...seenKeys], writes: metrics.writes };
    });
    check('overlapping prefixes/exact keys normalize; first owner and exclusions preserve ownership without duplicate values', overlap.compiled.length === 5 && overlap.compiled.filter(item => item.type === 'exact').length === 1 && overlap.expected === 33 && overlap.records === 33 && new Set(overlap.keys).size === 33 && !overlap.keys.includes('shared:early') && !overlap.keys.includes('rescue-test:002') && !overlap.keys.some(key => key.startsWith('rescue-test:03')) && overlap.keys.includes('edge:\uffff-tail') && overlap.keys.includes('\uffff\uffff-tail') && overlap.writes === 0);

    const resumeStart = await page.evaluate(async () => {
      window.resumeSchema = { version: 1, modules: [{ id: 'chat', label: 'Chat', critical: true, sources: [{ type: 'kv', sourceIndex: 0, prefixes: ['rescue-test:'] }] }] };
      ownerSchema = resumeSchema; phase = 'preflight';
      const exporter = await api.RescueExporter.prepare(resumeSchema, ['chat'], 'chat', { partTargetBytes: 11000 }); exporter.persist();
      phase = 'export'; const part = await exporter.nextPart(); part.saveSucceeded = true; exporter.confirmSaved();
      const original = localStorage.getItem(io.CHECKPOINT_KEY); const saved = JSON.parse(original);
      const retained = saved.parts.length; const errors = [];
      for (const lastKey of [null, io.encodeKey('rescue-test:015')]) {
        const legacy = { ...saved, state: { ...saved.state, lastKey } }; const raw = JSON.stringify(legacy); localStorage.setItem(io.CHECKPOINT_KEY, raw);
        try { await api.RescueExporter.resume(resumeSchema); errors.push('accepted'); } catch (error) { errors.push(error.message); }
        if (localStorage.getItem(io.CHECKPOINT_KEY) !== raw) throw Error('legacy checkpoint mutated');
      }
      localStorage.setItem(io.CHECKPOINT_KEY, original);
      return { saved, retained, errors, resumeSchema, writes: metrics.writes };
    });
    check('confirmed KV checkpoint stores selector index plus one exclusive encoded key, not key lists/values', resumeStart.saved.state.lastKey.selectorIndex === 0 && resumeStart.saved.state.lastKey.key.t === 's' && resumeStart.saved.state.lastKey.key.v === 'rescue-test:015' && resumeStart.retained === 1 && !JSON.stringify(resumeStart.saved).includes('xxxxx'));
    check('legacy KV null/tagged-key checkpoints safely refuse without modifying saved parts or business DB', resumeStart.errors.every(error => error === '救援断点来自旧版 KV 扫描逻辑，请重新开始救援备份。Float 原数据未修改。') && resumeStart.writes === 0);
    await page.reload(); await install();
    const resumed = await page.evaluate(async custom => {
      ownerSchema = custom; const exporter = await api.RescueExporter.resume(custom); phase = 'export';
      const keys = []; const get = IDBObjectStore.prototype.get; IDBObjectStore.prototype.get = function(key) { keys.push(key); return get.call(this, key); };
      let part; let records = 0;
      while ((part = await exporter.nextPart())) { records += part.metadata.recordCount; part.saveSucceeded = true; exporter.confirmSaved(); }
      phase = 'preflight'; const index = await exporter.finish(); return { records, keys, complete: index.complete, writes: metrics.writes };
    }, resumeStart.resumeSchema);
    // Part lookahead can reread values, but the saved manifests/counts must
    // publish only 24 remaining records. First resumed read is key 016.
    check('real reload resumes in the middle of a prefix exclusively with no duplicate/missing records', resumed.complete && resumed.records === 24 && resumed.keys[0] === 'rescue-test:016' && new Set(resumed.keys).size === 24 && resumed.writes === 0);

    const fallback = await page.evaluate(async () => {
      const custom = { version: 1, modules: [
        { id: 'chat', label: 'Chat', critical: true, sources: [{ type: 'kv', sourceIndex: 0, prefixes: ['rescue-test:'] }] },
        { id: 'cache', label: 'Cache', sources: [{ type: 'kv', sourceIndex: 0, includeAll: true }] }
      ] };
      ownerSchema = custom; currentIds = ['chat','cache']; allowAll = true; phase = 'preflight'; metrics.full = 0;
      const inventory = await api.preflightInventory(custom, currentIds);
      const preflightFull = metrics.full;
      const exporter = await api.RescueExporter.prepare(custom, currentIds, 'full'); metrics.full = 0; phase = 'export';
      let part; let records = 0;
      while ((part = await exporter.nextPart())) { records += part.metadata.recordCount; part.saveSucceeded = true; exporter.confirmSaved(); }
      phase = 'preflight'; const index = await exporter.finish();
      return { counts: inventory.map(task => task.count), preflightFull, records, complete: index.complete, full: metrics.full, writes: metrics.writes };
    });
    check('includeAll cache alone uses full cursor and exports all 50,025 remaining KV; selected finite sources stay ranged', fallback.counts[0] === 40 && fallback.counts[1] === 50025 && fallback.preflightFull === 1 && fallback.records === 50065 && fallback.complete && fallback.full === 2 && fallback.writes === 0);
    check('all targeted KV preflight/export/resume scenarios have no page errors', errors.length === 0);
  } finally { await context.close(); }
};
