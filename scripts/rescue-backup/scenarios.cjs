module.exports = async function({ page, browser, baseURL, schema, check, assert, errors, sourceContext, seed, installReadGuards, savedParts, savedIndex }) {
  const invalid = await page.evaluate(async () => {
    const { verifyRescueFiles } = await import('/float-rescue/verifier.js'); const files = parts.map(p => new File([p.blob], p.metadata.filename));
    const attempt = async (indexValue, selected) => { try { await verifyRescueFiles(new Blob([JSON.stringify(indexValue)]), selected); return false; } catch { return true; } };
    const incomplete = await attempt({ ...index, complete: false }, files);
    const missing = await attempt(index, files.slice(1));
    const wrongSet = await attempt({ ...index, setId: 'other' }, files);
    const duplicates = await attempt(index, [files[0], ...files.slice(0, -1)]);
    const corrupted = new File([new Uint8Array([0]), files[0].slice(1)], files[0].name);
    const hash = await attempt(index, [corrupted, ...files.slice(1)]);
    const modified = JSON.parse(JSON.stringify(index)); modified.exportedCounts[Object.keys(modified.exportedCounts)[0]]++;
    const counts = await attempt(modified, files);
    return { incomplete, missing, wrongSet, duplicates, hash, counts };
  });
  check('verifier rejects incomplete index, missing/duplicate/wrong-set parts, tampering and count mismatch', () => assert.ok(Object.values(invalid).every(Boolean)));
  // ZIP compatibility / ordinary backup regression run in the actual importer fixture.
  const zipContext = await browser.newContext({ baseURL }); const zipPage = await zipContext.newPage(); await zipPage.goto('/restore'); await zipPage.waitForFunction(() => !!window.rescueRestore);
  const zip = await zipPage.evaluate(async () => {
    const { StoreZipWriter, readStoreManifest } = await import('/float-rescue/zip-store.js'); const { sha256Blob, crc32Blob } = await import('/float-rescue/io.js');
    const writer = new StoreZipWriter();
    await writer.add('空文件.txt', new Blob([])); await writer.add('配置/文件.json', new Blob(['{"hello":"世界"}'])); await writer.add('media/a.bin', new Blob([new Uint8Array([0, 1, 255])])); await writer.add('media/b.bin', new Blob(['another binary']));
    await writer.add('manifest.json', new Blob([JSON.stringify({ format: 'ai-phone-backup', version: 2, createdAt: new Date().toISOString(), origin: location.origin, modules: [], totalBytes: 0, totalRecords: 0 })]));
    const blob = writer.finalize(); const archive = await rescueRestore.JSZip.loadAsync(blob, { checkCRC32: true });
    const manifest = await rescueRestore.readBackupManifest(blob); const parsed = await readStoreManifest(blob);
    const crc = await crc32Blob(new Blob(['123456789'])); const hash = await sha256Blob(new Blob(['abc']));
    const originalStream = Blob.prototype.stream; Blob.prototype.stream = undefined;
    const fallbackReads = []; const fallbackBlob = new Blob([new Uint8Array(2 * 1024 * 1024 + 9)]);
    const fallback = await sha256Blob(new Blob(['abc']));
    const fallbackHash = await sha256Blob(fallbackBlob, (kind, size) => { if (kind === 'readChunkBytes') fallbackReads.push(size); });
    const fallbackCrc = await crc32Blob(fallbackBlob, (kind, size) => { if (kind === 'readChunkBytes') fallbackReads.push(size); });
    Blob.prototype.stream = originalStream;
    const streamHash = await sha256Blob(fallbackBlob); const streamCrc = await crc32Blob(fallbackBlob);
    let zip64Rejected = false; try { await new StoreZipWriter().add('huge', { size: 0xffffffff }); } catch { zip64Rejected = true; }
    let duplicateRejected = false; const duplicate = new StoreZipWriter(); await duplicate.add('same', new Blob([])); try { await duplicate.add('same', new Blob([])); } catch { duplicateRejected = true; }
    const damagedHeader = new Blob([new Uint8Array([0]), blob.slice(1)]); let headerRejected = false; try { await readStoreManifest(damagedHeader); } catch { headerRejected = true; }
    let endRejected = false; try { await readStoreManifest(blob.slice(0, blob.size - 1)); } catch { endRejected = true; }
    const collector = rescueRestore.createMediaCollector(); const custom = await import('/float-rescue/serializer.js'); const ours = custom.createCollector();
    const raw = { blob: new Blob(['bytes'], { type: 'image/png' }), nested: ['data:audio/wav;base64,' + 'AQID'.repeat(1200)], plain: 'ordinary' };
    const standard = await rescueRestore.serializeValue(raw, collector); const rescued = await custom.serializeValue(raw, ours);
    const stored = JSON.stringify({ raw });
    const standardString = await rescueRestore.serializeStorageString(stored, collector); const rescuedString = await custom.serializeStorageString(stored, ours);
    await rescueRestore.hydrateKvDb(); const ordinary = await rescueRestore.createBackupBlob(['cache'], { includeCloudCredentials: true }); const imported = await rescueRestore.importBackupBlob(ordinary.blob);
    return { zero: (await archive.file('空文件.txt').async('uint8array')).length, unicode: await archive.file('配置/文件.json').async('string'), bytes: Array.from(await archive.file('media/a.bin').async('uint8array')), entries: Object.values(archive.files).filter(file => !file.dir).length, crc, hash, fallback, fallbackReads, fallbackEqual: fallbackHash === streamHash && fallbackCrc === streamCrc, zip64Rejected, duplicateRejected, headerRejected, endRejected, manifest: manifest.version, parsed: parsed.version, released: writer.parts.length, serializerEqual: JSON.stringify(standard) === JSON.stringify(rescued) && standardString === rescuedString, ordinary: imported.errors };
  });
  check('STORE ZIP handles empty/unicode/JSON/Blob/several binaries with correct CRC32, directory and EOCD; JSZip checks CRC', () => { assert.equal(zip.zero, 0); assert.equal(zip.unicode, '{"hello":"世界"}'); assert.deepEqual(zip.bytes, [0,1,255]); assert.equal(zip.entries, 5); assert.equal(zip.crc, 0xcbf43926); assert.equal(zip.manifest, 2); assert.equal(zip.parsed, 2); assert.equal(zip.released, 0); });
  check('ported incremental SHA matches known vector; multi-MiB old-iOS hash/CRC fallback reads <=1MiB', () => { assert.equal(zip.hash, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'); assert.equal(zip.fallback, zip.hash); assert.ok(zip.fallbackEqual); assert.equal(zip.fallbackReads.length, 6); assert.ok(zip.fallbackReads.every(size => size <= 1024 * 1024)); });
  check('ZIP rejects ZIP64-sized entries, duplicate names, damaged local header and truncated EOCD', () => { assert.ok(zip.zip64Rejected && zip.duplicateRejected && zip.headerRejected && zip.endRejected); });
  check('rescue serializer matches current v2 markers and storage-string contract; ordinary backup/import still works', () => { assert.ok(zip.serializerEqual); assert.deepEqual(zip.ordinary, []); });
  await zipContext.close();

  const beforeResume = await page.evaluate(async schema => {
    window.resuming = await api.RescueExporter.prepare(schema, ['chat'], 'chat', { partTargetBytes: 1024 * 1024, probe }); resuming.persist();
    const first = await resuming.nextPart(); const withoutAck = JSON.parse(localStorage.getItem('float_rescue_export_checkpoint_v1'));
    first.saveSucceeded = true; resuming.confirmSaved();
    const afterAck = JSON.parse(localStorage.getItem('float_rescue_export_checkpoint_v1'));
    return { setId: resuming.setId, before: withoutAck.parts.length, after: afterAck.parts.length, released: first.blob === null, firstCounts: first.manifest.rescueSet.sourceCounts };
  }, schema);
  check('checkpoint advances only after explicit saved acknowledgement and releases pending Blob', () => { assert.equal(beforeResume.before, 0); assert.equal(beforeResume.after, 1); assert.ok(beforeResume.released); });
  const checkpointSafety = await page.evaluate(async schema => {
    const key = 'float_rescue_export_checkpoint_v1'; const original = localStorage.getItem(key);
    const corrupt = JSON.parse(original); corrupt.parts[0].recordCount++; localStorage.setItem(key, JSON.stringify(corrupt));
    let corruptRejected = false; try { await api.RescueExporter.resume(schema); } catch { corruptRejected = true; }
    localStorage.setItem(key, original);
    const fresh = await api.RescueExporter.prepare(schema, ['chat'], 'chat', { partTargetBytes: 1024 * 1024 }); fresh.persist();
    const part = await fresh.nextPart(); part.saveSucceeded = true; const before = localStorage.getItem(key);
    const native = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw Error('checkpoint full'); };
    let stopped = false; try { fresh.confirmSaved(); } catch { stopped = true; } finally { Storage.prototype.setItem = native; }
    const retained = fresh.pending === part && !!part.blob && fresh.parts.length === 0 && before === localStorage.getItem(key);
    localStorage.setItem(key, original); return { corruptRejected, stopped, retained };
  }, schema);
  check('corrupt checkpoint counts block resume; checkpoint storage failure retains current Blob and cursor', () => assert.ok(checkpointSafety.corruptRejected && checkpointSafety.stopped && checkpointSafety.retained));
  await page.reload(); await installReadGuards(page);
  const resumed = await page.evaluate(async schema => {
    const { RescueExporter } = await import('/float-rescue/exporter.js'); const exporter = await RescueExporter.resume(schema, { probe }); const startParts = exporter.parts.length; const totals = {}; let part;
    while ((part = await exporter.nextPart())) { for (const [id, count] of Object.entries(part.manifest.rescueSet.sourceCounts)) totals[id] = (totals[id] || 0) + count; part.saveSucceeded = true; exporter.confirmSaved(); }
    const final = await exporter.finish(); return { setId: exporter.setId, startParts, final, totals };
  }, schema);
  check('actual document reload resumes confirmed cursor without duplicate or missing records', () => { assert.equal(resumed.setId, beforeResume.setId); assert.equal(resumed.startParts, 1); assert.ok(resumed.final.complete); for (const task of resumed.final.inventory) assert.equal((beforeResume.firstCounts[task.id] || 0) + (resumed.totals[task.id] || 0), task.count); });

  // A separate iOS fixture exercises the actual standalone UI and share state.
  const iosContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1' });
  const ios = await iosContext.newPage(); ios.on('pageerror', error => errors.push(error.message)); await seed(ios, schema);
  await ios.addInitScript(() => {
    if (location.pathname !== '/float-rescue-backup') return;
    window.shareCancel = true; window.shareCalls = 0; window.releaseObserved = false;
    Object.defineProperty(navigator, 'canShare', { value: data => data.files.length === 1 && data.files[0] instanceof File });
    Object.defineProperty(navigator, 'share', { value: async () => { shareCalls++; if (shareCancel) throw new DOMException('cancel', 'AbortError'); } });
    for (const name of ['put','add','delete','clear']) IDBObjectStore.prototype[name] = () => { throw Error('iOS export business write'); };
    const tx = IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction = function(store, mode = 'readonly', ...rest) { if (mode !== 'readonly') throw Error('iOS export write tx'); return tx.call(this, store, mode, ...rest); };
  });
  const requests = []; await iosContext.route('**/*', route => {
    const req = route.request(); const url = new URL(req.url());
    if (req.method() !== 'GET' || url.origin !== baseURL || url.pathname !== '/float-rescue-backup' && url.pathname !== '/float-rescue-backup/schema' && url.pathname !== '/float-rescue-backup.js' && !url.pathname.startsWith('/float-rescue/')) { requests.push(req.method() + ' ' + url.pathname); return route.abort(); }
    route.continue();
  });
  await ios.goto('/float-rescue-backup'); await ios.locator('#preflight').waitFor({ state: 'visible' }); await ios.waitForFunction(() => !document.getElementById('preflight').disabled);
  await ios.evaluate(async () => {
    const { RescueExporter } = await import('/float-rescue/exporter.js'); const prepare = RescueExporter.prepare; const confirm = RescueExporter.prototype.confirmSaved;
    // Test-only injection of a small target; production UI has no flags or overrides.
    RescueExporter.prepare = function(schema, ids, mode, options) { return prepare.call(this, schema, ids, mode, { ...options, partTargetBytes: 1024 * 1024 }); };
    RescueExporter.prototype.confirmSaved = function() { const pending = this.pending; confirm.call(this); window.releaseObserved = pending.blob === null && this.pending === null; };
  });
  await ios.locator('#preflight').click(); await ios.waitForFunction(() => !document.getElementById('generate').disabled); await ios.locator('#generate').click(); await ios.waitForFunction(() => document.getElementById('part-title').textContent.includes('第 1 卷'));
  const checkpointStart = await ios.evaluate(() => localStorage.getItem('float_rescue_export_checkpoint_v1'));
  assert.equal(await ios.evaluate(() => shareCalls), 0);
  await ios.locator('#save-part').click(); await ios.waitForFunction(() => document.getElementById('status').textContent.includes('已取消'));
  check('iOS share cancel retains part, keeps continue disabled and does not advance checkpoint', () => {});
  assert.equal(await ios.evaluate(() => localStorage.getItem('float_rescue_export_checkpoint_v1')), checkpointStart); assert.equal(await ios.locator('#continue').isDisabled(), true);
  await ios.evaluate(() => { shareCancel = false; }); await ios.locator('#save-part').click(); await ios.waitForFunction(() => !document.getElementById('continue').disabled);
  assert.equal(await ios.evaluate(() => localStorage.getItem('float_rescue_export_checkpoint_v1')), checkpointStart);
  await ios.locator('#continue').click(); await ios.waitForFunction(() => document.getElementById('part-title').textContent.includes('第 2 卷'));
  const iosState = await ios.evaluate(() => ({ shares: shareCalls, releaseObserved, saved: JSON.parse(localStorage.getItem('float_rescue_export_checkpoint_v1')).parts.length, overflow: document.documentElement.scrollWidth > innerWidth, runtime: ['_messagesCache','hydrateChatStorage','runLegacyInlineMediaEpoch'].some(key => key in window) }));
  check('share success still requires confirmation; only then release/advance; no automatic next share', () => { assert.equal(iosState.shares, 2); assert.ok(iosState.releaseObserved); assert.equal(iosState.saved, 1); assert.equal(iosState.overflow, false); assert.equal(iosState.runtime, false); assert.deepEqual(requests, []); });
  await ios.reload(); await ios.locator('#resume-button').waitFor({ state: 'visible' }); await ios.locator('#resume-button').click(); await ios.waitForFunction(() => document.getElementById('part-title').textContent.includes('第 2 卷'));
  check('standalone UI offers reload resume and re-generates only the unsaved next part', () => {}); assert.equal(await ios.evaluate(() => shareCalls), 0);
  await iosContext.close();

  // Resume count-change guard and final reconciliation after a concurrent write.
  const changedContext = await browser.newContext({ baseURL }); const changed = await changedContext.newPage(); await seed(changed, schema);
  const mismatch = await changed.evaluate(async schema => {
    const { RescueExporter } = await import('/float-rescue/exporter.js'); const exporter = await RescueExporter.prepare(schema, ['chat'], 'chat'); exporter.persist();
    const request = indexedDB.open('AiPhoneChatDB'); const db = await new Promise(resolve => { request.onsuccess = () => resolve(request.result); });
    const write = db.transaction('messages', 'readwrite'); write.objectStore('messages').put({ id: 'concurrent-new', sessionId: 's', content: 'change' }); await new Promise(resolve => { write.oncomplete = resolve; }); db.close();
    let stopped = false; try { await RescueExporter.resume(schema); } catch (error) { stopped = error.message.includes('源数据自备份开始后已发生变化'); }
    let part; while ((part = await exporter.nextPart())) { part.saveSucceeded = true; exporter.confirmSaved(); }
    const index = await exporter.finish(); return { stopped, complete: index.complete, status: index.status, error: index.error };
  }, schema);
  check('count change blocks resume and marks final export INCOMPLETE', () => { assert.ok(mismatch.stopped); assert.equal(mismatch.complete, false); assert.equal(mismatch.status, 'INCOMPLETE'); });
  await changedContext.close();

  const memoryContext = await browser.newContext({ baseURL }); const memoryPage = await memoryContext.newPage(); memoryPage.on('pageerror', error => errors.push(error.message)); await seed(memoryPage, schema);
  await memoryPage.evaluate(async () => {
    const open = name => new Promise(resolve => { const request = indexedDB.open(name); request.onsuccess = () => resolve(request.result); });
    const chat = await open('AiPhoneChatDB'); const tx = chat.transaction('messages', 'readwrite');
    for (let i = 0; i < 100; i++) tx.objectStore('messages').put({ id: 'scaled-' + String(i).padStart(3, '0'), sessionId: 's', mediaUrl: 'data:audio/wav;base64,' + btoa(String.fromCharCode(i, i + 1, i + 2)).repeat(16384) });
    await new Promise(resolve => { tx.oncomplete = resolve; }); chat.close();
    const story = await open('AiPhoneStoryDB'); const write = story.transaction('entries', 'readwrite');
    write.objectStore('entries').put({ id: 'giant-a', image: 'data:image/png;base64,' + 'AAAA'.repeat(9 * 1024 * 1024 / 4) });
    write.objectStore('entries').put({ id: 'giant-b', image: 'data:image/png;base64,' + 'AQID'.repeat(9 * 1024 * 1024 / 4) });
    write.objectStore('entries').put({ id: 'giant-c', image: 'data:image/png;base64,' + 'BAUG'.repeat(18 * 1024 * 1024 / 4) });
    await new Promise(resolve => { write.oncomplete = resolve; }); story.close();
  });
  await installReadGuards(memoryPage);
  const memory = await memoryPage.evaluate(async schema => {
    const api = await import('/float-rescue/exporter.js'); const { RescueExporter } = api;
    const observed = []; const exporter = await RescueExporter.prepare(schema, ['chat','creative'], 'full', { partTargetBytes: 2 * 1024 * 1024, probe: (kind, value) => { probe(kind, value); if (kind === 'batch') observed.push(value); } });
    let p; let partCount = 0; let maxBytes = 0; while ((p = await exporter.nextPart())) { partCount++; maxBytes = Math.max(maxBytes, p.blob.size); p.saveSucceeded = true; exporter.confirmSaved(); }
    const index = await exporter.finish();
    return { complete: index.complete, audit: rescueAudit, partCount, maxBytes, giantBatches: observed.filter(batch => batch.task === 'creative/0/entries'), constants: [api.CHAT_RESCUE_BATCH_ROWS,api.DEFAULT_RESCUE_BATCH_ROWS,api.RESCUE_RAW_BATCH_CHAR_BUDGET,api.RESCUE_PART_TARGET_BYTES,api.RESCUE_PART_HARD_MAX_BYTES] };
  }, schema);
  check('100 scaled media messages keep cap=1; giant non-chat rows obey raw budget and single-row overflow', () => { assert.ok(memory.complete); assert.equal(memory.audit.maxChatRows, 1); assert.ok(memory.audit.maxOtherRows <= 16); assert.equal(memory.audit.rawOverflow, false); assert.ok(memory.giantBatches.some(b => b.chars > 16 * 1024 * 1024 && b.rows === 1)); assert.ok(memory.partCount >= 4); assert.ok(memory.maxBytes <= 128 * 1024 * 1024); assert.deepEqual(memory.constants, [1,16,16*1024*1024,96*1024*1024,128*1024*1024]); });
  await memoryContext.close();

  const emptyContext = await browser.newContext({ baseURL }); const emptyPage = await emptyContext.newPage(); await emptyPage.goto('/fixture');
  await emptyPage.evaluate(() => { indexedDB.databases = undefined; });
  const missing = await emptyPage.evaluate(async schema => {
    const { RescueExporter } = await import('/float-rescue/exporter.js'); let error;
    try { await RescueExporter.prepare(schema, ['chat'], 'chat'); } catch (e) { error = e.message; }
    return { error, databases: await IDBFactory.prototype.databases.call(indexedDB) };
  }, schema);
  check('missing critical database aborts preflight without creating an empty database', () => { assert.ok(missing.error.includes('关键数据库不存在')); assert.deepEqual(missing.databases, []); });
  await emptyContext.close();

  const verifyContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } }); const verifyPage = await verifyContext.newPage(); verifyPage.on('pageerror', error => errors.push(error.message));
  await verifyPage.addInitScript(() => { indexedDB.open = () => { throw Error('file verification must not open source DBs'); }; });
  await verifyPage.goto('/float-rescue-backup'); await verifyPage.waitForFunction(() => !document.getElementById('preflight').disabled);
  await verifyPage.locator('#verify-files').setInputFiles([{ name: `float-rescue-${savedIndex.setId}-index.json`, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(savedIndex)) }, ...savedIndex.parts.map(part => ({ name: part.filename, mimeType: 'application/zip', buffer: savedParts.get('/saved/' + part.filename) }))]);
  await verifyPage.locator('#verify').click(); await verifyPage.waitForFunction(() => document.getElementById('verification').textContent.includes('已完整验证'));
  check('actual standalone UI validates selected saved index/ZIP files without opening source databases', () => {});
  await verifyContext.close();
};
