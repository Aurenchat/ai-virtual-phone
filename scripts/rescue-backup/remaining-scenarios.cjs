const assert = require('node:assert/strict');
const excluded = ['AiPhoneChatDB', 'AiPhoneMediaCacheDB', 'AiPhoneKvDB'];
// Disposable localhost fixtures only. Imports use the existing, real v2 importer.
module.exports = async ({ browser, baseURL, schema, check, snapshot, installReadGuards, savedParts }) => {
  const context = await browser.newContext({ baseURL }); const page = await context.newPage(); const errors = [];
  const unexpectedRequests = [];
  await context.route('**/*', route => { const request = route.request(); const url = new URL(request.url()); if (request.method() !== 'GET' || url.origin !== baseURL) { unexpectedRequests.push(request.method() + ' ' + url.pathname); return route.abort(); } return route.continue(); });
  page.on('pageerror', error => errors.push(error.message));
  const sources = schema.modules.flatMap(module => module.sources.filter(source => source.type === 'localStorage' || source.type === 'indexeddb' && !excluded.includes(source.dbName)).map(source => ({ moduleId: module.id, ...source })));
  const dbNames = sources.filter(source => source.type === 'indexeddb').map(source => source.dbName);
  async function fixture(target, { missing, errorDb } = {}) {
    await target.goto('/fixture');
    await target.evaluate(async ({ sources, missing }) => {
      for (const source of sources) {
        if (source.type === 'localStorage') {
          for (const key of source.keys || []) localStorage.setItem(key, JSON.stringify({ preserved: key, fixture: true }));
          continue;
        }
        if (source.dbName === missing) continue;
        const request = indexedDB.open(source.dbName, 7);
        const names = source.stores || ['entries', 'extra-store'];
        request.onupgradeneeded = () => { for (const name of names) { const store = request.result.createObjectStore(name, { keyPath: 'id' }); store.createIndex('tags', 'tags', { multiEntry: true }); } };
        const db = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
        const tx = db.transaction(names, 'readwrite');
        for (const name of names) {
          for (let i = 0; i < 19; i++) tx.objectStore(name).put({ id: String(i).padStart(3, '0'), value: source.dbName + '/' + name, tags: ['keep', String(i)], nested: i === 0 ? { media: 'data:audio/wav;base64,' + 'AQID'.repeat(2000) } : { keep: true }, blob: i === 1 ? new Blob(['binary-' + source.dbName], { type: 'image/png' }) : null });
        }
        await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); }); db.close();
      }
      localStorage.setItem('unclassified-config', '{"nested":"data:image/png;base64,AQIDBAUG","keep":true}');
    }, { sources, missing });
    await installReadGuards(target);
    await target.evaluate(({ excluded, errorDb }) => {
      window.remainingReads = { opened: [], forbidden: 0 };
      const open = indexedDB.open;
      indexedDB.open = function(name, ...rest) {
        remainingReads.opened.push(name);
        if (excluded.includes(name)) { remainingReads.forbidden++; throw Error('excluded DB access: ' + name); }
        if (name === errorDb) throw Error('critical open failed');
        return open.call(this, name, ...rest);
      };
    }, { excluded, errorDb });
  }
  async function transfer(parts) {
    for (let i = 0; i < parts.length; i++) {
      const chunks = [];
      for (let offset = 0; offset < parts[i].bytes; offset += 1024 * 1024) {
        const encoded = await page.evaluate(async ({ i, offset }) => {
          const bytes = new Uint8Array(await remainingParts[i].blob.slice(offset, offset + 1024 * 1024).arrayBuffer()); let binary = '';
          for (let start = 0; start < bytes.length; start += 32768) binary += String.fromCharCode(...bytes.subarray(start, start + 32768));
          return btoa(binary);
        }, { i, offset }); chunks.push(Buffer.from(encoded, 'base64'));
      }
      savedParts.set('/saved/' + parts[i].filename, Buffer.concat(chunks));
    }
  }
  try {
    // Snapshot before installing read guards; no excluded database is ever seeded/opened.
    await fixture(page);
    await page.reload(); // Reset instrumentation for the test-only deep snapshot.
    const before = await snapshot(page, dbNames);
    await installReadGuards(page);
    await page.evaluate(excluded => {
      window.remainingReads = { opened: [], forbidden: 0 }; const open = indexedDB.open;
      indexedDB.open = function(name, ...rest) { remainingReads.opened.push(name); if (excluded.includes(name)) { remainingReads.forbidden++; throw Error('excluded DB'); } return open.call(this, name, ...rest); };
    }, excluded);
    const start = await page.evaluate(async schema => {
      window.api = await import('/float-rescue/exporter.js'); window.remainingParts = [];
      const original = JSON.stringify(schema);
      window.remainingExporter = await api.RescueExporter.prepare(schema, schema.modules.map(module => module.id), 'remaining-non-kv', { partTargetBytes: 32 * 1024, probe }); remainingExporter.persist();
      const part = await remainingExporter.nextPart(); remainingParts.push({ blob: part.blob, metadata: part.metadata }); part.saveSucceeded = true; remainingExporter.confirmSaved();
      return { inventory: remainingExporter.inventory, sources: remainingExporter.schema.modules.flatMap(module => module.sources.map(source => ({ moduleId: module.id, ...source }))), parts: remainingParts.map(part => part.metadata), checkpoint: api.RescueExporter.readCheckpoint(), schemaUnchanged: JSON.stringify(schema) === original };
    }, schema);
    check('remaining scope preserves every included canonical descriptor/sourceIndex; excludes all KV and both saved databases', () => { assert.deepEqual(start.sources, sources); assert.ok(start.schemaUnchanged); assert.equal(start.checkpoint.mode, 'remaining-non-kv'); assert.equal(start.inventory.filter(task => task.type === 'indexeddb').length, dbNames.length * 2); });
    await transfer(start.parts);
    await page.reload(); await installReadGuards(page);
    await page.evaluate(excluded => {
      window.remainingReads = { opened: [], forbidden: 0 }; const open = indexedDB.open;
      indexedDB.open = function(name, ...rest) { remainingReads.opened.push(name); if (excluded.includes(name)) { remainingReads.forbidden++; throw Error('excluded DB'); } return open.call(this, name, ...rest); };
    }, excluded);
    const resumed = await page.evaluate(async schema => {
      const { RescueExporter } = await import('/float-rescue/exporter.js'); const exporter = await RescueExporter.resume(schema, { partTargetBytes: 32 * 1024, probe }); window.remainingParts = [];
      let part;
      while ((part = await exporter.nextPart())) { remainingParts.push({ blob: part.blob, metadata: part.metadata }); part.saveSucceeded = true; exporter.confirmSaved(); }
      const index = await exporter.finish(); return { index, parts: remainingParts.map(part => part.metadata), reads: remainingReads, audit: rescueAudit };
    }, schema);
    await transfer(resumed.parts);
    check('remaining reload resume/finish reconciles counts with zero KV/two-library access and zero business writes', () => { assert.ok(resumed.index.complete); assert.equal(resumed.index.mode, 'remaining-non-kv'); assert.ok(resumed.index.totalParts >= 4); assert.equal(resumed.reads.forbidden, 0); assert.ok(resumed.reads.opened.every(name => dbNames.includes(name))); assert.equal(resumed.audit.writes, 0); assert.ok(resumed.audit.maxOtherRows <= 16); assert.ok(resumed.audit.maxAtob <= 256 * 1024); assert.equal(resumed.audit.rawOverflow, false); });
    const verification = await page.evaluate(async index => {
      indexedDB.open = () => { throw Error('verifier DB access'); };
      const { verifyRescueFiles } = await import('/float-rescue/verifier.js'); const parts = [];
      for (const part of index.parts) parts.push(new File([await (await fetch('/saved/' + part.filename)).blob()], part.filename));
      return verifyRescueFiles(new Blob([JSON.stringify(index)]), parts);
    }, resumed.index);
    check('remaining saved multi-part set passes SHA/ZIP/manifest/count verification with no DB access', () => assert.ok(verification.complete));

    const restoreContext = await browser.newContext({ baseURL });
    try {
      const restore = await restoreContext.newPage(); restore.on('pageerror', error => errors.push(error.message)); await restore.goto('/restore'); await restore.waitForFunction(() => !!window.rescueRestore);
      const result = await restore.evaluate(async ({ index, excluded }) => {
        for (const name of excluded) {
          const request = indexedDB.open(name); request.onupgradeneeded = () => request.result.createObjectStore('sentinel', { keyPath: 'id' });
          const db = await new Promise(resolve => { request.onsuccess = () => resolve(request.result); }); const tx = db.transaction('sentinel', 'readwrite'); tx.objectStore('sentinel').put({ id: 'keep', value: 'existing excluded data' }); await new Promise(resolve => { tx.oncomplete = resolve; }); db.close();
        }
        const transaction = IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction = function(names, mode = 'readonly', ...rest) { if (excluded.includes(this.name) && mode !== 'readonly') throw Error('excluded restore write'); return transaction.call(this, names, mode, ...rest); };
        const manifests = []; const results = []; const payloads = [];
        for (const part of index.parts.slice().reverse()) {
          const blob = await (await fetch('/saved/' + part.filename)).blob(); manifests.push(await rescueRestore.readBackupManifest(blob));
          const zip = await rescueRestore.JSZip.loadAsync(blob, { checkCRC32: true });
          for (const [name, entry] of Object.entries(zip.files)) if (!entry.dir && name.startsWith('modules/')) payloads.push({ name, payload: JSON.parse(await entry.async('string')) });
          results.push(await rescueRestore.importBackupBlob(blob, undefined, { overwrite: true }));
        }
        return { manifests, results, payloads };
      }, { index: resumed.index, excluded });
      check('real current readBackupManifest/importBackupBlob restore all remaining v2 parts, retaining original module/source chunk identities', () => {
        assert.ok(result.results.every(item => item.errors.length === 0));
        assert.equal(result.results.reduce((sum, item) => sum + item.added, 0), Object.values(resumed.index.exportedCounts).reduce((sum, count) => sum + count, 0));
        assert.ok(result.manifests.every(item => item.version === 2 && item.rescueSet.mode === 'remaining-non-kv' && item.modules.every(module => module.label.includes('部分备份'))));
        for (const { name, payload } of result.payloads) { const sourceIndex = Number(name.split('/')[2].split('-')[0]); const descriptor = sources.find(source => source.moduleId === payload.moduleId && source.sourceIndex === sourceIndex); assert.ok(descriptor); assert.equal(payload.sources[0].type, descriptor.type); if (descriptor.type === 'indexeddb') assert.equal(payload.sources[0].dbName, descriptor.dbName); }
      });
      const after = await snapshot(restore, dbNames);
      check('all included source records/localStorage deep equal after real import, including nested media and Blob size/type/hash', () => assert.deepEqual(after, before));
      const untouched = await snapshot(restore, excluded); delete untouched.localStorage;
      check('restore leaves omitted ChatDB/MediaCacheDB/KV records untouched', () => { for (const name of excluded) assert.deepEqual(untouched[name].sentinel, [{ id: 'keep', value: 'existing excluded data' }]); });
      const storeSchema = async target => target.evaluate(async dbNames => {
        const schemas = {};
        for (const name of dbNames) { const req = indexedDB.open(name); const db = await new Promise(resolve => { req.onsuccess = () => resolve(req.result); }); schemas[name] = Array.from(db.objectStoreNames).map(name => { const store = db.transaction(name).objectStore(name); return { name, keyPath: store.keyPath, autoIncrement: store.autoIncrement, indexes: Array.from(store.indexNames).map(name => { const index = store.index(name); return { name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry }; }) }; }); db.close(); } return schemas;
      }, dbNames);
      await page.reload();
      check('remaining restore retains every store schema and index', () => {});
      assert.deepEqual(await storeSchema(restore), await storeSchema(page));
    } finally { await restoreContext.close(); }

    for (const scenario of [{ missing: 'AiPhoneMomentsDB', optional: true }, { missing: 'AiPhoneQaDB' }, { errorDb: 'AiPhoneSettingsDB' }]) {
      const testContext = await browser.newContext({ baseURL });
      try {
        const target = await testContext.newPage(); target.on('pageerror', error => errors.push(error.message)); await fixture(target, scenario);
        const result = await target.evaluate(async schema => {
          const { RescueExporter } = await import('/float-rescue/exporter.js');
          try { const exporter = await RescueExporter.prepare(schema, schema.modules.map(module => module.id), 'remaining-non-kv'); return { inventory: exporter.inventory }; } catch (error) { return { error: error.message }; }
        }, schema);
        if (scenario.optional) {
          check('optional missing remaining DB is explicitly recorded; aborted open leaves no empty DB', () => assert.ok(result.inventory.some(task => task.dbName === scenario.missing && task.exists === false && task.count === 0)));
          const names = await target.evaluate(async () => (await indexedDB.databases()).map(item => item.name)); assert.ok(!names.includes(scenario.missing));
        } else check('critical missing/open failure stops remaining preflight: ' + (scenario.missing || scenario.errorDb), () => assert.ok(result.error.includes(scenario.missing || scenario.errorDb)));
      } finally { await testContext.close(); }
    }
    // Actual preset and scope copy. Fixture has no excluded DBs at all.
    const uiContext = await browser.newContext({ baseURL });
    try {
      const ui = await uiContext.newPage(); ui.on('pageerror', error => errors.push(error.message)); await fixture(ui); await ui.goto('/float-rescue-backup');
      await installReadGuards(ui); await ui.evaluate(excluded => { const open = indexedDB.open; indexedDB.open = function(name, ...rest) { if (excluded.includes(name)) throw Error('UI excluded DB'); return open.call(this, name, ...rest); }; }, excluded);
      await ui.locator('#preset-remaining').click(); assert.ok((await ui.locator('#scope-detail').textContent()).includes('部分备份'));
      await ui.locator('#preflight').click(); await ui.waitForFunction(() => !document.getElementById('generate').disabled);
      await ui.locator('#generate').click(); await ui.locator('#part').waitFor({ state: 'visible' });
      assert.ok((await ui.locator('#part-detail').textContent()).includes('其余非 KV')); assert.equal(await ui.evaluate(() => JSON.parse(localStorage.getItem('float_rescue_export_checkpoint_v1')).mode), 'remaining-non-kv');
      await ui.reload(); await ui.locator('#resume-button').click(); await ui.locator('#part').waitFor({ state: 'visible' });
      check('actual remaining preset/resume clearly identifies partial scope; old presets still present', () => {});
      assert.ok((await ui.locator('#part-detail').textContent()).includes('部分备份')); assert.equal(await ui.locator('#preset-chat-media,#preset-chat,#preset-full').count(), 3);
    } finally { await uiContext.close(); }
    check('remaining scenarios have no browser page errors or network upload', () => { assert.deepEqual(errors, []); assert.deepEqual(unexpectedRequests, []); });
  } finally { await context.close(); }
};
