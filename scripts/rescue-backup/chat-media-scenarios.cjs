const assert = require('node:assert/strict');
const DATABASES = ['AiPhoneChatDB', 'AiPhoneMediaCacheDB'];
// Runs only on disposable localhost fixtures, with the actual v2 importer.
module.exports = async ({ browser, baseURL, schema, check, seed, snapshot, installReadGuards, savedParts }) => {
  const context = await browser.newContext({ baseURL }); const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  function boundary() {
    window.safetyReads = { opened: [], forbidden: 0 };
    const open = indexedDB.open;
    indexedDB.open = function(name, ...args) {
      safetyReads.opened.push(name);
      if (!['AiPhoneChatDB','AiPhoneMediaCacheDB'].includes(name)) { safetyReads.forbidden++; throw Error('excluded DB access: ' + name); }
      return open.call(this, name, ...args);
    };
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) { if (key !== 'float_rescue_export_checkpoint_v1') throw Error('business localStorage read'); return get.call(this, key); };
    Storage.prototype.key = () => { throw Error('business localStorage inventory'); };
  }
  async function guarded() { await installReadGuards(page); await page.evaluate(boundary); }
  async function transfer(parts, variable) {
    for (let i = 0; i < parts.length; i++) {
      const chunks = [];
      for (let offset = 0; offset < parts[i].bytes; offset += 1024 * 1024) {
        const encoded = await page.evaluate(async ({ variable, i, offset }) => {
          const bytes = new Uint8Array(await window[variable][i].blob.slice(offset, offset + 1024 * 1024).arrayBuffer()); let binary = '';
          for (let start = 0; start < bytes.length; start += 32768) binary += String.fromCharCode(...bytes.subarray(start, start + 32768));
          return btoa(binary);
        }, { variable, i, offset }); chunks.push(Buffer.from(encoded, 'base64'));
      }
      savedParts.set('/saved/' + parts[i].filename, Buffer.concat(chunks));
    }
  }
  try {
    await seed(page, schema);
    // Future/unknown stores in either database must also be included.
    await page.evaluate(async () => {
      for (const name of ['AiPhoneChatDB','AiPhoneMediaCacheDB']) {
        const request = indexedDB.open(name, 11);
        request.onupgradeneeded = () => request.result.createObjectStore('extra-store', { keyPath: 'id' });
        const db = await new Promise(resolve => { request.onsuccess = () => resolve(request.result); });
        const tx = db.transaction('extra-store', 'readwrite');
        tx.objectStore('extra-store').put({ id: 'extra', metadata: 'keep', data: name === 'AiPhoneChatDB' ? 'data:audio/wav;base64,AQIDBAUG' : new Blob(['extra media bytes'], { type: 'audio/wav' }) });
        await new Promise(resolve => { tx.oncomplete = resolve; }); db.close();
      }
    });
    const before = await snapshot(page, DATABASES); delete before.localStorage;
    await guarded();
    const start = await page.evaluate(async schema => {
      window.api = await import('/float-rescue/exporter.js'); window.safetyParts = [];
      window.safetyExporter = await api.RescueExporter.prepare(schema, ['chat'], 'chat-media-safety', { partTargetBytes: 1024 * 1024, probe }); safetyExporter.persist();
      const part = await safetyExporter.nextPart(); safetyParts.push({ blob: part.blob, metadata: part.metadata }); part.saveSucceeded = true; safetyExporter.confirmSaved();
      return { inventory: safetyExporter.inventory, sources: safetyExporter.schema.modules[0].sources, parts: safetyParts.map(part => part.metadata), checkpoint: api.RescueExporter.readCheckpoint(), reads: safetyReads, audit: rescueAudit };
    }, schema);
    check('two-library scope derives original sourceIndex 0/1 and inventories all six real stores only', () => {
      assert.deepEqual(start.sources.map(({ dbName, sourceIndex }) => ({ dbName, sourceIndex })), DATABASES.map((dbName, sourceIndex) => ({ dbName, sourceIndex })));
      assert.equal(start.inventory.length, 6); assert.ok(start.inventory.every(task => task.type === 'indexeddb' && DATABASES.includes(task.dbName)));
      assert.equal(start.inventory.filter(task => task.store === 'extra-store').length, 2);
      assert.equal(start.checkpoint.mode, 'chat-media-safety'); assert.equal(start.reads.forbidden, 0); assert.equal(start.audit.writes, 0);
    });
    await transfer(start.parts, 'safetyParts');
    await page.reload(); await guarded();
    const resumed = await page.evaluate(async schema => {
      const { RescueExporter } = await import('/float-rescue/exporter.js'); const exporter = await RescueExporter.resume(schema, { probe }); window.safetyParts = [];
      let part;
      while ((part = await exporter.nextPart())) { safetyParts.push({ blob: part.blob, metadata: part.metadata }); part.saveSucceeded = true; exporter.confirmSaved(); }
      const index = await exporter.finish();
      return { index, parts: safetyParts.map(part => part.metadata), reads: safetyReads, audit: rescueAudit };
    }, schema);
    await transfer(resumed.parts, 'safetyParts');
    check('two-library reload resume and finish never access KV/QA/other databases or localStorage sources', () => {
      assert.equal(resumed.reads.forbidden, 0); assert.ok(resumed.reads.opened.every(name => DATABASES.includes(name)));
      assert.ok(resumed.index.complete); assert.equal(resumed.index.mode, 'chat-media-safety'); assert.equal(resumed.index.totalParts, start.parts.length + resumed.parts.length); assert.ok(resumed.index.totalParts >= 4);
      assert.equal(resumed.audit.writes, 0); assert.equal(resumed.audit.maxChatRows, 1); assert.ok(resumed.audit.maxOtherRows <= 16); assert.ok(resumed.audit.maxAtob <= 256 * 1024); assert.equal(resumed.audit.rawOverflow, false);
    });
    // Verify only saved files, with source databases entirely inaccessible.
    const verification = await page.evaluate(async index => {
      indexedDB.open = () => { throw Error('verification must not open any DB'); };
      const { verifyRescueFiles } = await import('/float-rescue/verifier.js');
      const files = [];
      for (const part of index.parts) files.push(new File([await (await fetch('/saved/' + part.filename)).blob()], part.filename));
      return verifyRescueFiles(new Blob([JSON.stringify(index)]), files);
    }, resumed.index);
    check('complete saved two-library set passes SHA/ZIP/manifest/count verifier without database access', () => assert.ok(verification.complete));

    const restoreContext = await browser.newContext({ baseURL });
    try {
      const restore = await restoreContext.newPage(); restore.on('pageerror', error => errors.push(error.message)); await restore.goto('/restore'); await restore.waitForFunction(() => !!window.rescueRestore);
      const imported = await restore.evaluate(async index => {
        // Existing unrelated data must survive even overwrite=true.
        const request = indexedDB.open('AiPhoneKvDB'); request.onupgradeneeded = () => request.result.createObjectStore('entries', { keyPath: 'key' });
        const db = await new Promise(resolve => { request.onsuccess = () => resolve(request.result); });
        const tx = db.transaction('entries', 'readwrite'); tx.objectStore('entries').put({ key: 'unrelated-sentinel', value: 'existing KV' });
        await new Promise(resolve => { tx.oncomplete = resolve; }); db.close(); localStorage.setItem('unrelated-sentinel', 'existing localStorage');
        const transaction = IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction = function(names, mode = 'readonly', ...rest) { if (this.name === 'AiPhoneKvDB' && mode !== 'readonly') throw Error('restore must not write KV'); return transaction.call(this, names, mode, ...rest); };
        for (const method of ['setItem','removeItem','clear']) Storage.prototype[method] = () => { throw Error('restore must not change localStorage'); };
        const results = []; const manifests = [];
        for (const part of index.parts.slice().reverse()) {
          const blob = await (await fetch('/saved/' + part.filename)).blob(); const manifest = await rescueRestore.readBackupManifest(blob); manifests.push(manifest);
          const archive = await rescueRestore.JSZip.loadAsync(blob, { checkCRC32: true });
          for (const [name, entry] of Object.entries(archive.files)) {
            if (!entry.dir && name.startsWith('modules/')) {
              const payload = JSON.parse(await entry.async('string'));
              if (payload.sources.some(source => source.type !== 'indexeddb' || !['AiPhoneChatDB','AiPhoneMediaCacheDB'].includes(source.dbName))) throw Error('excluded restore source');
            }
          }
          results.push(await rescueRestore.importBackupBlob(blob, undefined, { overwrite: true }));
        }
        const opened = indexedDB.open('AiPhoneKvDB'); const kv = await new Promise(resolve => { opened.onsuccess = () => resolve(opened.result); });
        const read = kv.transaction('entries').objectStore('entries').get('unrelated-sentinel'); const sentinel = await new Promise(resolve => { read.onsuccess = () => resolve(read.result); }); kv.close();
        return { results, manifests, sentinel, local: localStorage.getItem('unrelated-sentinel') };
      }, resumed.index);
      check('real current readBackupManifest/importBackupBlob accept every partial v2 ZIP; unrelated KV/localStorage survive restore', () => {
        assert.ok(imported.results.every(result => result.errors.length === 0)); assert.equal(imported.results.reduce((sum, result) => sum + result.added, 0), Object.values(resumed.index.exportedCounts).reduce((sum, count) => sum + count, 0));
        assert.ok(imported.manifests.every(manifest => manifest.version === 2 && manifest.rescueSet.mode === 'chat-media-safety' && manifest.modules[0].label.includes('部分备份')));
        assert.deepEqual(imported.sentinel, { key: 'unrelated-sentinel', value: 'existing KV' }); assert.equal(imported.local, 'existing localStorage');
      });
      const after = await snapshot(restore, DATABASES); delete after.localStorage;
      check('both restored databases deep equal all source records, inline image/audio/12MiB/nested data and Blob size/type/hash', () => assert.deepEqual(after, before));
    } finally { await restoreContext.close(); }

    // Missing either required database must stop, without creating an empty DB.
    for (const existing of DATABASES) {
      const missingContext = await browser.newContext({ baseURL });
      try {
        const missing = await missingContext.newPage(); missing.on('pageerror', error => errors.push(error.message)); await missing.goto('/fixture');
        const result = await missing.evaluate(async ({ schema, existing }) => {
          const request = indexedDB.open(existing); request.onupgradeneeded = () => request.result.createObjectStore('entries', { keyPath: 'id' });
          const db = await new Promise(resolve => { request.onsuccess = () => resolve(request.result); }); db.close();
          for (const method of ['put','add','delete','clear']) IDBObjectStore.prototype[method] = () => { throw Error('business write'); };
          const { RescueExporter } = await import('/float-rescue/exporter.js'); let error;
          try { await RescueExporter.prepare(schema, ['chat'], 'chat-media-safety'); } catch (failure) { error = failure.message; }
          return { error, names: (await indexedDB.databases()).map(db => db.name) };
        }, { schema, existing });
        check(`two-library missing required DB stops without creation (${existing} exists)`, () => { assert.ok(result.error.includes('关键数据库不存在')); assert.deepEqual(result.names, [existing]); });
      } finally { await missingContext.close(); }
    }

    // Actual UI preset, selection changes, and resumed scope description.
    const uiContext = await browser.newContext({ baseURL });
    try {
      const ui = await uiContext.newPage(); ui.on('pageerror', error => errors.push(error.message)); await seed(ui, schema); await ui.addInitScript(boundary);
      await ui.addInitScript(() => {
        for (const method of ['put','add','delete','clear']) IDBObjectStore.prototype[method] = () => { throw Error('UI business write'); };
        const tx = IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction = function(names, mode = 'readonly', ...rest) { if (mode !== 'readonly') throw Error('UI business write tx'); return tx.call(this, names, mode, ...rest); };
      });
      await ui.goto('/float-rescue-backup'); await ui.locator('#preset-chat-media').click();
      assert.ok((await ui.locator('#scope-detail').textContent()).includes('部分备份'));
      await ui.locator('#preset-chat').click(); assert.equal(await ui.locator('#modules input:checked').count(), 1);
      assert.ok(!(await ui.locator('#scope-detail').textContent()).includes('部分备份'));
      await ui.locator('#preset-full').click(); assert.equal(await ui.locator('#modules input:checked').count(), schema.modules.length);
      await ui.locator('#preset-chat-media').click(); assert.equal(await ui.locator('#modules input:checked').count(), 1);
      await ui.locator('#preflight').click(); await ui.waitForFunction(() => !document.getElementById('generate').disabled);
      check('actual new preset preflights only two libraries and clearly marks partial scope before export', () => {});
      assert.ok((await ui.locator('#inventory').textContent()).split('\n').every(line => /^(chat\/0\/|chat\/1\/)/.test(line)));
      await ui.locator('#generate').click(); await ui.locator('#part').waitFor({ state: 'visible' });
      assert.equal(await ui.evaluate(() => JSON.parse(localStorage.getItem('float_rescue_export_checkpoint_v1')).mode), 'chat-media-safety');
      await ui.reload(); await ui.locator('#resume-button').click(); await ui.locator('#part').waitFor({ state: 'visible' });
      check('actual UI reload resumes partial scope with zero KV access and mode shown on pending part', () => {});
      assert.ok((await ui.locator('#part-detail').textContent()).includes('部分备份')); assert.equal(await ui.evaluate(() => safetyReads.forbidden), 0);
    } finally { await uiContext.close(); }
    check('two-library rescue scenarios have no browser page errors', () => assert.deepEqual(errors, []));
  } finally { await context.close(); }
};
