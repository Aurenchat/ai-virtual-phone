// All mutations below are fixtures in a disposable localhost browser profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const ts = require('typescript');
const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const html = fs.readFileSync('public/float-inline-media-maintenance.html', 'utf8');
const preview = fs.readFileSync('public/float-inline-media-maintenance.js', 'utf8');
const engineSource = fs.readFileSync('lib/legacy-inline-media-migration.ts', 'utf8');
const engine = ts.transpileModule(engineSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
async function setup(page) {
  await page.goto('/fixture');
  await page.evaluate(async () => {
    window.engine = await import('/offline-engine.js'); // test-only endpoint, never public
    window.requestValue = request => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    window.fixtureOpen = (name, store) => new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 10);
      request.onupgradeneeded = () => request.result.createObjectStore(store, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    window.chat = await fixtureOpen('AiPhoneChatDB', 'messages');
    window.media = await fixtureOpen('AiPhoneMediaCacheDB', 'entries');
    window.fixtureWrite = (db, store, values, clear = true) => new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite'); const table = tx.objectStore(store);
      if (clear) table.clear(); values.forEach(value => table.put(value));
      tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
    });
    window.fixtureRows = (db, store) => requestValue(db.transaction(store).objectStore(store).getAll());
    window.makeMessage = (id, url) => ({ id, sessionId: 'session-' + id, mediaUrl: url, role: 'user', order: 7, createdAt: 123, content: 'SECRET_BODY', rawResponseText: 'SECRET_RAW', editableResponseText: 'SECRET_EDIT', reasoningText: 'SECRET_REASON', statusPanel: 'SECRET_STATUS', mediaData: { label: 'SECRET_LABEL', nested: [1, 'x'] }, responseBatchId: 'batch', sender: 'sender', extra: { keep: true } });
    window.png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
    window.audio = 'data:audio/wav;base64,' + btoa('\x00\x01\x02\xff\x80\x10');
    window.unlimited = () => Promise.resolve({ usage: 0, quota: 10 ** 12 });
    window.hashBlob = async blob => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))).map(n => n.toString(16).padStart(2, '0')).join('');
  });
}
async function testEngine(page) {
  await setup(page);
  await page.evaluate(() => {
    window.deleteAttempts = 0;
    IDBObjectStore.prototype.delete = IDBFactory.prototype.deleteDatabase = function() { deleteAttempts++; throw Error('migration must not delete'); };
  });
  const basic = await page.evaluate(async () => {
    const before = [makeMessage('image-a', png), makeMessage('audio', audio), makeMessage('image-b', png)];
    await fixtureWrite(chat, 'messages', before); await fixtureWrite(media, 'entries', []);
    const hashes = await Promise.all(before.map(message => hashBlob(engine.decodeInlineMedia(message.mediaUrl))));
    const phases = [];
    const result = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited, onStage: async (stage, id) => {
      if (stage === 'MEDIA_COMMITTED') phases.push((await requestValue(chat.transaction('messages').objectStore('messages').get(id))).mediaUrl.startsWith('data:'));
    } });
    const after = await fixtureRows(chat, 'messages'); const entries = await fixtureRows(media, 'entries');
    const sameFields = before.every(message => JSON.stringify({ ...after.find(m => m.id === message.id), mediaUrl: message.mediaUrl }) === JSON.stringify(message));
    const sameBytes = (await Promise.all(before.map(message => hashBlob(entries.find(entry => entry.id === engine.deterministicMediaId(message.id)).blob)))).every((hash, index) => hash === hashes[index]);
    const second = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited });
    const image = new Image(); const url = URL.createObjectURL(entries.find(e => e.mimeType === 'image/png').blob);
    const loaded = await new Promise(resolve => { image.onload = () => resolve(true); image.onerror = () => resolve(false); image.src = url; }); URL.revokeObjectURL(url);
    return { result, sameFields, sameBytes, mediaUrls: after.map(m => m.mediaUrl), count: entries.length, phases, second, loaded,
      idsUnique: engine.deterministicMediaId('a/b') !== engine.deterministicMediaId('a%2Fb') && engine.deterministicMediaId('\ud800') === engine.deterministicMediaId('\ud800') };
  });
  check('image/audio/image migrate with deterministic refs, exact bytes and all other fields intact', () => {
    assert.equal(basic.result.status, 'DONE'); assert.equal(basic.result.results.length, 3); assert.ok(basic.result.results.every(r => r.status === 'MIGRATED')); assert.ok(basic.sameFields); assert.ok(basic.sameBytes); assert.equal(basic.count, 3); assert.ok(basic.mediaUrls.every(url => url.startsWith('media-store://legacy_inline_'))); assert.ok(basic.idsUnique);
  });
  check('media commits before message changes; repeat epoch is idempotent; migrated image decodes', () => { assert.deepEqual(basic.phases, [true, true, true]); assert.equal(basic.second.attemptedItems, 0); assert.ok(basic.loaded); });

  const recovery = await page.evaluate(async () => {
    await fixtureWrite(chat, 'messages', [makeMessage('crash', png)]); await fixtureWrite(media, 'entries', []);
    const first = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited, onStage(stage) { if (stage === 'MEDIA_COMMITTED') throw Error('simulated process exit'); } });
    const retained = (await fixtureRows(chat, 'messages'))[0].mediaUrl === png;
    const firstId = (await fixtureRows(media, 'entries'))[0].id;
    chat.close(); media.close(); // restart connections after interruption
    chat = await fixtureOpen('AiPhoneChatDB', 'messages'); media = await fixtureOpen('AiPhoneMediaCacheDB', 'entries');
    const second = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited });
    const entries = await fixtureRows(media, 'entries');
    return { first, retained, second, one: entries.length === 1 && entries[0].id === firstId };
  });
  check('crash after media commit retains inline; reopened retry reuses exactly one asset', () => { assert.equal(recovery.first.status, 'STOPPED_ERROR'); assert.ok(recovery.retained); assert.equal(recovery.second.results[0].status, 'MIGRATED'); assert.ok(recovery.one); });

  for (const failure of ['verify', 'cas', 'write', 'message-write', 'readback']) {
    const result = await page.evaluate(async failure => {
      await fixtureWrite(chat, 'messages', [makeMessage('fail', png)]); await fixtureWrite(media, 'entries', []);
      const originalPut = IDBObjectStore.prototype.put; const originalAdd = IDBObjectStore.prototype.add; const originalGet = IDBObjectStore.prototype.get;
      if (failure === 'write') IDBObjectStore.prototype.add = function(value) { if (this.name === 'entries') throw Error('quota write failure'); return originalAdd.call(this, value); };
      if (failure === 'message-write') IDBObjectStore.prototype.put = function(value) { if (this.name === 'messages') throw Error('message write failure'); return originalPut.call(this, value); };
      if (failure === 'readback') IDBObjectStore.prototype.put = function(value) { return originalPut.call(this, this.name === 'messages' && value.mediaUrl.startsWith('media-store://') ? { ...value, mediaUrl: 'wrong' } : value); };
      const outcome = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited, onStage: async stage => {
        if (failure === 'verify' && stage === 'MEDIA_COMMITTED') {
          const entry = (await fixtureRows(media, 'entries'))[0];
          // Same size and MIME, different bytes: size-only verification would miss this.
          await fixtureWrite(media, 'entries', [{ ...entry, blob: new Blob([new Uint8Array(entry.blob.size)], { type: entry.mimeType }) }]);
        }
        if (failure === 'cas' && stage === 'MEDIA_VERIFIED') await fixtureWrite(chat, 'messages', [{ ...makeMessage('fail', 'https://changed.example/image'), content: 'concurrent edit' }]);
      } });
      IDBObjectStore.prototype.put = originalPut; IDBObjectStore.prototype.add = originalAdd; IDBObjectStore.prototype.get = originalGet;
      const row = (await fixtureRows(chat, 'messages'))[0];
      return { outcome, unchanged: row.mediaUrl === png, conflictPreserved: row.mediaUrl === 'https://changed.example/image' && row.content === 'concurrent edit' };
    }, failure);
    check('failure safety: ' + failure, () => {
      assert.equal(result.outcome.status, 'STOPPED_ERROR');
      assert.equal(result.outcome.results[0].status, { verify: 'MEDIA_VERIFICATION_FAILED', cas: 'CAS_CONFLICT', write: 'ERROR', 'message-write': 'ERROR', readback: 'MESSAGE_VERIFICATION_FAILED' }[failure]);
      assert.ok(failure === 'cas' ? result.conflictPreserved : result.unchanged);
    });
  }
  const metadata = await page.evaluate(async () => {
    await fixtureWrite(chat, 'messages', [makeMessage('metadata', png)]); await fixtureWrite(media, 'entries', []);
    const result = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited, onStage: async stage => {
      if (stage === 'MEDIA_VERIFIED') await fixtureWrite(chat, 'messages', [{ ...makeMessage('metadata', png), content: 'concurrent metadata', added: [9] }]);
    } });
    const row = (await fixtureRows(chat, 'messages'))[0]; return { result, preserved: row.content === 'concurrent metadata' && row.added[0] === 9 };
  });
  check('CAS preserves concurrent changes to non-media fields', () => { assert.equal(metadata.result.results[0].status, 'MIGRATED'); assert.ok(metadata.preserved); });

  for (const url of ['data:image/png,not-base64', 'data:image/png;base64,@@@@', 'data:image/png;base64,AA=A', 'data:image/png;base64,AB==', 'data:;base64,AAAA', 'data:image/png;base64,AAA']) {
    const result = await page.evaluate(async url => {
      await fixtureWrite(chat, 'messages', [makeMessage('invalid', url)]); await fixtureWrite(media, 'entries', []);
      const outcome = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited });
      return { outcome, unchanged: (await fixtureRows(chat, 'messages'))[0].mediaUrl === url, mediaCount: (await fixtureRows(media, 'entries')).length };
    }, url);
    check('unsupported/malformed URL stays intact: ' + url, () => { assert.equal(result.outcome.results[0].status, 'INVALID_DATA_URL'); assert.ok(result.unchanged); assert.equal(result.mediaCount, 0); });
  }
  const skip = await page.evaluate(async () => {
    await fixtureWrite(chat, 'messages', [makeMessage('missing', 'media-store://missing'), makeMessage('asset', 'asset://existing'), makeMessage('url', 'https://example.test/image')]); await fixtureWrite(media, 'entries', []);
    const outcome = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited });
    return { outcome, unchanged: (await fixtureRows(chat, 'messages')).map(m => m.mediaUrl), mediaCount: (await fixtureRows(media, 'entries')).length };
  });
  check('existing and missing media-store / asset / external refs are never handled', () => { assert.equal(skip.outcome.attemptedItems, 0); assert.equal(skip.mediaCount, 0); assert.ok(skip.unchanged.includes('media-store://missing')); });

  const large = await page.evaluate(async () => {
    const url = 'data:image/png;base64,' + 'AAAA'.repeat(3300000); // 12.59 MiB encoded
    await fixtureWrite(chat, 'messages', [makeMessage('large', url)]); await fixtureWrite(media, 'entries', []);
    const realAtob = atob; const sizes = []; window.atob = value => { sizes.push(value.length); return realAtob(value); };
    const beforeHash = await hashBlob(new Blob([new Uint8Array(9900000)], { type: 'image/png' }));
    const outcome = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited }); window.atob = realAtob;
    const afterHash = await hashBlob((await fixtureRows(media, 'entries'))[0].blob);
    return { outcome, maxChunk: Math.max(...sizes), chunks: sizes.length, same: beforeHash === afterHash, budget: engine.BASE64_CHUNK_CHARS };
  });
  check('12+ MiB dynamic fixture uses bounded atob chunks with identical output hash', () => { assert.equal(large.outcome.results[0].status, 'MIGRATED'); assert.ok(large.chunks > 40); assert.ok(large.maxChunk <= large.budget); assert.ok(large.same); });

  const quota = await page.evaluate(async () => {
    await fixtureWrite(chat, 'messages', [makeMessage('quota', png)]); await fixtureWrite(media, 'entries', []);
    const outcome = await engine.runLegacyInlineMediaEpoch({ estimateStorage: async () => ({ usage: 99, quota: 100 }) });
    const retained = (await fixtureRows(chat, 'messages'))[0].mediaUrl === png; const mediaCount = (await fixtureRows(media, 'entries')).length;
    const unavailable = await engine.runLegacyInlineMediaEpoch({ estimateStorage: async () => { throw Error('unavailable'); } });
    return { outcome, retained, mediaCount, unavailable };
  });
  check('quota guard stops before writes; unavailable estimate does not block migration', () => { assert.equal(quota.outcome.status, 'INSUFFICIENT_STORAGE'); assert.ok(quota.retained); assert.equal(quota.mediaCount, 0); assert.equal(quota.unavailable.results[0].status, 'MIGRATED'); });

  const epochs = await page.evaluate(async () => {
    const short = 'data:audio/wav;base64,AAAA';
    await fixtureWrite(chat, 'messages', Array.from({ length: 130 }, (_, i) => makeMessage('item-' + i.toString().padStart(3, '0'), short))); await fixtureWrite(media, 'entries', []);
    const count = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited, maxItems: 999 });
    const finish = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited });
    const big = 'data:audio/wav;base64,' + 'AAAA'.repeat(100);
    await fixtureWrite(chat, 'messages', [makeMessage('small', short), makeMessage('large', big), makeMessage('medium', 'data:audio/wav;base64,' + 'AAAA'.repeat(50))]); await fixtureWrite(media, 'entries', []);
    const order = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited, maxEncodedChars: big.length });
    const rows = await fixtureRows(chat, 'messages');
    const impossible = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited, maxEncodedChars: 1 });
    return { count, finish, order, impossible, largestFirst: rows.find(m => m.id === 'large').mediaUrl.startsWith('media-store://') && rows.find(m => m.id === 'small').mediaUrl === short, cap: engine.MAX_ENCODED_CHARS_PER_EPOCH };
  });
  check('128 item hard cap; next epoch finishes; largest-first exact char cap and oversize stop', () => { assert.equal(epochs.count.attemptedItems, 128); assert.equal(epochs.count.status, 'EPOCH_LIMIT'); assert.equal(epochs.finish.attemptedItems, 2); assert.equal(epochs.order.status, 'EPOCH_LIMIT'); assert.equal(epochs.order.results[0].id, 'large'); assert.ok(epochs.largestFirst); assert.equal(epochs.impossible.attemptedItems, 0); assert.equal(epochs.cap, 96 * 1024 * 1024); });
  // Exercise the actual production char ceiling in the disposable fixture DB.
  const fullBudget = await page.evaluate(async () => {
    const url = 'data:audio/wav;base64,' + 'AAAA'.repeat(3 * 1024 * 1024); // header makes 8 items exceed 96 MiB
    await fixtureWrite(chat, 'messages', Array.from({ length: 8 }, (_, i) => makeMessage('budget-' + i, url))); await fixtureWrite(media, 'entries', []);
    const result = await engine.runLegacyInlineMediaEpoch({ estimateStorage: unlimited, maxEncodedChars: Number.MAX_SAFE_INTEGER });
    return { result, cap: engine.MAX_ENCODED_CHARS_PER_EPOCH, mediaCount: (await fixtureRows(media, 'entries')).length };
  });
  check('actual 96 MiB hard cap cannot be raised by caller', () => { assert.equal(fullBudget.result.status, 'EPOCH_LIMIT'); assert.equal(fullBudget.result.attemptedItems, 7); assert.ok(fullBudget.result.encodedChars <= fullBudget.cap); assert.equal(fullBudget.mediaCount, 7); });
  const deletes = await page.evaluate(() => deleteAttempts);
  check('offline engine performs zero deletes across success, failure and recovery', () => assert.equal(deletes, 0));
  await page.evaluate(() => { chat.close(); media.close(); });
}

async function testPreview(browser, baseURL) {
  const context = await browser.newContext({ baseURL }); const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await setup(page);
  await page.evaluate(async () => {
    await fixtureWrite(chat, 'messages', [makeMessage('a', png), makeMessage('b', audio), makeMessage('c', 'data:video/mp4;base64,AAAA'), makeMessage('d', 'data:application/octet-stream;base64,AAAA'), makeMessage('r1', 'media-store://found'), makeMessage('r2', 'media-store://found'), makeMessage('r3', 'media-store://missing'), makeMessage('asset', 'asset://existing'), makeMessage('web', 'https://example.test')]);
    await fixtureWrite(media, 'entries', [{ id: 'found', blob: new Blob(['abc']), mimeType: 'audio/wav', mediaCategory: 'audio', createdAt: 1 }, { id: 'orphan', blob: new Blob(['hello']), mimeType: 'image/png', mediaCategory: 'image', createdAt: 2 }]);
    localStorage.setItem('migrate', '1'); chat.close(); media.close();
  });
  await page.addInitScript(() => {
    window.audit = { writes: 0, cursors: 0, transactions: [], clipboard: '' };
    const fail = name => function() { if (['put', 'add', 'delete', 'clear'].includes(name)) audit.writes++; throw Error('Forbidden preview API: ' + name); };
    for (const name of ['put', 'add', 'delete', 'clear', 'getAll', 'getAllKeys']) IDBObjectStore.prototype[name] = fail(name);
    const cursor = IDBObjectStore.prototype.openCursor;
    IDBObjectStore.prototype.openCursor = function(...args) { audit.cursors++; return cursor.apply(this, args); };
    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function(stores, mode = 'readonly', ...args) { audit.transactions.push(mode); if (mode !== 'readonly') throw Error('Not readonly'); return transaction.call(this, stores, mode, ...args); };
    window.atob = fail('atob'); window.FileReader = fail('FileReader');
    Blob.prototype.arrayBuffer = fail('blob.arrayBuffer'); URL.createObjectURL = fail('createObjectURL');
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => { audit.clipboard = value; } } });
    navigator.storage.persist = fail('persist');
  });
  const requests = []; page.on('request', request => requests.push(new URL(request.url()).pathname));
  await page.goto('/float-inline-media-maintenance.html?migrate=1');
  check('standalone document loads only its native preview script, with migration locked', () => { assert.deepEqual(requests.filter(p => p !== '/float-inline-media-maintenance.html'), ['/float-inline-media-maintenance.js']); });
  assert.equal(await page.locator('#migration-locked').isDisabled(), true);
  await page.locator('#scan').click(); await page.waitForFunction(() => document.getElementById('status').textContent.includes('扫描完成'));
  await page.locator('#copy').click();
  const result = await page.evaluate(() => ({ ...audit, report: document.getElementById('report').textContent, lockedHandler: document.getElementById('migration-locked').onclick, exposed: ['migrate', 'runLegacyInlineMediaEpoch', 'hydrateChatStorage', '_messagesCache'].some(name => name in window) }));
  check('preview uses only readonly cursors, zero writes/decodes/media reads/persistence requests', () => { assert.equal(result.writes, 0); assert.equal(result.cursors, 2); assert.ok(result.transactions.every(mode => mode === 'readonly')); assert.equal(result.lockedHandler, null); assert.equal(result.exposed, false); });
  check('census classifies inline types, references, missing assets and cache bytes correctly', () => { assert.match(result.report, /ChatMessage 总数: 9/); for (const type of ['image', 'audio', 'video', 'other']) assert.ok(result.report.includes(type + ': 1 条')); assert.match(result.report, /引用 3 \/ unique IDs 2 \/ found 1 \/ missing 1/); assert.match(result.report, /AiPhoneMediaCacheDB: 2 项/); assert.match(result.report, /8 bytes\/chars/); assert.match(result.report, /messageId: a/); });
  check('copy report contains no body/reasoning/label/media payload; URL and flag cannot enable migration', () => { assert.equal(result.clipboard, result.report); assert.ok(!result.report.includes('SECRET')); assert.ok(!result.report.includes('iVBOR')); assert.equal(result.writes, 0); });
  // Abort initial upgrades when databases() is unavailable; aborted creation must
  // leave no empty database. New origin isolates this test from census fixtures.
  await context.close();
  const missingContext = await browser.newContext({ baseURL: baseURL.replace('127.0.0.1', 'localhost') }); const missing = await missingContext.newPage();
  await missing.addInitScript(() => { indexedDB.databases = undefined; });
  await missing.goto('/float-inline-media-maintenance.html'); await missing.locator('#scan').click();
  await missing.waitForFunction(() => document.getElementById('status').textContent.includes('未找到现有 Float 数据库'));
  await missing.goto('/fixture');
  const databases = await missing.evaluate(async () => IDBFactory.prototype.databases.call(indexedDB));
  check('preview missing DB aborts initial upgrade and leaves no empty database', () => assert.deepEqual(databases, []));
  // Engine uses the same noncreating rule, also without databases().
  const missingEngine = await missing.evaluate(async () => {
    const engine = await import('/offline-engine.js');
    try { await engine.runLegacyInlineMediaEpoch(); return 'unexpected'; } catch (error) { return error.message; }
  });
  check('offline engine missing DB aborts without creating it', () => assert.equal(missingEngine, 'DB_MISSING'));
  assert.deepEqual(await missing.evaluate(async () => IDBFactory.prototype.databases.call(indexedDB)), []);
  await missingContext.close();
  for (const store of ['wrong-store', 'messages']) {
    const partialContext = await browser.newContext({ baseURL }); const partial = await partialContext.newPage();
    await partial.goto('/fixture');
    await partial.evaluate(async store => {
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('AiPhoneChatDB', 10);
        request.onupgradeneeded = () => request.result.createObjectStore(store, { keyPath: 'id' });
        request.onsuccess = () => { request.result.close(); resolve(); }; request.onerror = () => reject(request.error);
      });
    }, store);
    await partial.goto('/float-inline-media-maintenance.html'); await partial.locator('#scan').click();
    await partial.waitForFunction(() => document.getElementById('status').textContent.includes('未找到现有 Float 数据库'));
    await partial.goto('/fixture');
    const result = await partial.evaluate(async () => {
      const engine = await import('/offline-engine.js'); let error;
      try { await engine.runLegacyInlineMediaEpoch(); } catch (e) { error = e.message; }
      return { error, names: (await indexedDB.databases()).map(db => db.name) };
    });
    check('preview and engine stop for ' + (store === 'messages' ? 'missing media DB' : 'missing required store') + ' without creating media DB', () => { assert.equal(result.error, 'DB_MISSING'); assert.deepEqual(result.names, ['AiPhoneChatDB']); });
    await partialContext.close();
  }
  check('preview has no browser page errors', () => assert.deepEqual(errors, []));
}

(async () => {
  check('production source has no runtime bootstrap, decode, write, flags, globals or migration import', () => {
    assert.ok(!/MainApp|ChatRoom|ChatPluginBootstrap|hydrateChatStorage|_messagesCache|legacy-inline-media-migration|\batob\s*\(|arrayBuffer\s*\(|new Blob|FileReader|createObjectURL|\.getAll|\.put\s*\(|\.delete\s*\(|\.clear\s*\(|localStorage|location\.search|window\./.test(html + preview));
    assert.ok(!/\.delete\s*\(|\.clear\s*\(|deleteDatabase/.test(engineSource));
    assert.equal((html.match(/<script/g) || []).length, 1);
  });
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://test').pathname;
    const bodies = { '/fixture': ['text/html', '<!doctype html><title>Disposable offline fixture</title>'], '/float-inline-media-maintenance.html': ['text/html', html], '/float-inline-media-maintenance.js': ['text/javascript', preview], '/offline-engine.js': ['text/javascript', engine] };
    const item = bodies[pathname]; res.writeHead(item ? 200 : 404, { 'Content-Type': item?.[0] || 'text/plain' }); res.end(item?.[1] || 'not found');
  });
  await new Promise(resolve => server.listen(0, resolve));
  const baseURL = `http://127.0.0.1:${server.address().port}`; let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ baseURL }); const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await testEngine(page); check('offline engine has no browser page errors', () => assert.deepEqual(errors, [])); await context.close();
    await testPreview(browser, baseURL);
    console.log(`PASS ${checks} legacy inline media browser checks`);
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
