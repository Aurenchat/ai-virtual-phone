// Disposable localhost origins/profiles only. Never opens the user's Float site.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const vm = require('node:vm');
const ts = require('typescript');
const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const repo = path.resolve(__dirname, '..'); let checks = 0;
function check(label, fn) { fn(); checks++; console.log('PASS ' + label); }
async function routeModule(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(await fs.readFile(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, { exports, Response, require: name => { if (!imports[name]) throw Error('unexpected import ' + name); return imports[name]; } });
  return exports;
}
async function seed(page, schema) {
  await page.goto('/fixture');
  await page.evaluate(async schema => {
    const requestValue = request => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const open = (name, names, keyPath = 'id') => new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 10);
      request.onupgradeneeded = () => { for (const name of names) { const store = request.result.createObjectStore(name, { keyPath }); if (name === 'messages') { store.createIndex('sessionId', 'sessionId'); store.createIndex('createdAt', 'createdAt'); } } };
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const write = async (db, store, values) => new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); values.forEach(value => tx.objectStore(store).put(value)); tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); });
    const dbs = new Map();
    for (const module of schema.modules.filter(module => module.critical)) for (const source of module.sources.filter(source => source.type === 'indexeddb')) {
      if (dbs.has(source.dbName)) continue;
      const names = source.dbName === 'AiPhoneChatDB' ? ['messages', 'sessions', 'contacts'] : source.stores || ['entries'];
      dbs.set(source.dbName, await open(source.dbName, names));
    }
    const chat = dbs.get('AiPhoneChatDB');
    const messages = [{ id: 'text-1', sessionId: 's', role: 'user', content: 'source message', createdAt: 1, mediaData: { label: 'label' }, reasoningText: 'reason', rawResponseText: 'raw', responseBatchId: 'batch' }, { id: 'text-2', sessionId: 's', role: 'assistant', content: 'reply', createdAt: 2 }];
    for (let i = 0; i < 6; i++) messages.push({ id: 'media-' + i, sessionId: 's', role: 'user', content: 'image/audio', createdAt: i + 3, mediaUrl: `data:${i % 2 ? 'audio/wav' : 'image/png'};base64,` + ['AAAA','AQID','BAUG'][Math.floor(i / 2)].repeat(200000), extra: { nested: i < 2 ? 'data:image/png;base64,' + 'AAAA'.repeat(200000) : 'keep' } });
    messages.push({ id: 'large', sessionId: 's', role: 'user', mediaUrl: 'data:image/png;base64,' + 'AAAA'.repeat(3300000), content: '12+MiB inline', createdAt: 99 });
    await write(chat, 'messages', messages); await write(chat, 'sessions', [{ id: 's', contactId: 'c', groupName: 'fixture' }]); await write(chat, 'contacts', [{ id: 'c', characterId: 'character' }]);
    const media = dbs.get('AiPhoneMediaCacheDB');
    await write(media, 'entries', [{ id: 'blob-image', blob: new Blob(['saved binary image'], { type: 'image/png' }), mimeType: 'image/png', mediaCategory: 'image', createdAt: 55 }]);
    const kv = await open('AiPhoneKvDB', ['entries'], 'key'); dbs.set('AiPhoneKvDB', kv);
    await write(kv, 'entries', [{ key: 'ai_phone_chat_settings_v1', value: JSON.stringify({ a: 1, nested: 'data:audio/wav;base64,' + 'AQID'.repeat(1200) }) }, { key: 'ai_phone_api_configs_v1', value: '[{"id":"api","apiKey":"PRIVATE_API_FIXTURE"}]' }, { key: 'ai_phone_cloud_backup_config_v1', value: '{"secret":"PRIVATE_CLOUD_FIXTURE"}' }, { key: 'unclassified-fixture', value: 'ordinary string' }]);
    const story = await open('AiPhoneStoryDB', ['entries']); dbs.set('AiPhoneStoryDB', story); await write(story, 'entries', [{ id: 'story', title: 'other module', nested: ['data:image/png;base64,' + 'BAUG'.repeat(1200)] }]);
    localStorage.setItem('ai_phone_idb_migrated_v1', 'true'); localStorage.setItem('ai_phone_settings_idb_migrated_v1', 'true'); localStorage.setItem('ordinary-config', '{"x":1}'); localStorage.setItem('nested-storage', JSON.stringify({ image: 'data:image/png;base64,' + 'AQID'.repeat(1200) }));
    for (const db of dbs.values()) db.close();
  }, schema);
}
async function snapshot(page, names = ['AiPhoneChatDB', 'AiPhoneMediaCacheDB', 'AiPhoneKvDB', 'AiPhoneStoryDB']) {
  return page.evaluate(async names => {
    const open = name => new Promise((resolve, reject) => { const request = indexedDB.open(name); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const rows = store => new Promise((resolve, reject) => { const request = store.getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    async function normalized(value) {
      if (value instanceof Blob) return { BLOB: true, size: value.size, type: value.type, hash: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await value.arrayBuffer()))).map(n => n.toString(16).padStart(2, '0')).join('') };
      if (Array.isArray(value)) return Promise.all(value.map(normalized));
      if (value && typeof value === 'object') { const result = {}; for (const key of Object.keys(value).sort()) result[key] = await normalized(value[key]); return result; }
      return value;
    }
    const result = {};
    for (const name of names) {
      const db = await open(name); result[name] = {};
      for (const name of Array.from(db.objectStoreNames).sort()) result[db.name][name] = await normalized(await rows(db.transaction(name).objectStore(name)));
      db.close();
    }
    result.localStorage = Object.fromEntries(Object.keys(localStorage).filter(key => key !== 'float_rescue_export_checkpoint_v1').sort().map(key => [key, localStorage.getItem(key)]));
    return result;
  }, names);
}
async function installReadGuards(page) {
  await page.evaluate(() => {
    window.rescueAudit = { writes: 0, transactions: 0, maxAtob: 0, maxRead: 0, maxChatRows: 0, maxOtherRows: 0, rawOverflow: false, maxPending: 0, releases: 0, serializerDuringTransaction: false };
    for (const name of ['put','add','delete','clear']) IDBObjectStore.prototype[name] = function() { rescueAudit.writes++; throw Error('business writes forbidden'); };
    const nativeTx = IDBDatabase.prototype.transaction;
    let activeTransactions = 0;
    IDBDatabase.prototype.transaction = function(stores, mode = 'readonly', ...rest) { if (mode !== 'readonly') { rescueAudit.writes++; throw Error('business write transaction forbidden'); } rescueAudit.transactions++; const tx = nativeTx.call(this, stores, mode, ...rest); activeTransactions++; const end = () => { activeTransactions--; }; tx.addEventListener('complete', end, { once: true }); tx.addEventListener('abort', end, { once: true }); return tx; };
    IDBObjectStore.prototype.getAll = IDBObjectStore.prototype.getAllKeys = () => { throw Error('whole-store accumulate forbidden'); };
    const nativeAtob = atob; window.atob = value => { if (activeTransactions) { rescueAudit.serializerDuringTransaction = true; throw Error('media serialization before cursor transaction ended'); } rescueAudit.maxAtob = Math.max(rescueAudit.maxAtob, value.length); if (value.length > 256 * 1024) throw Error('unbounded atob'); return nativeAtob(value); };
    const nativeArrayBuffer = Blob.prototype.arrayBuffer;
    Blob.prototype.arrayBuffer = function() { rescueAudit.maxRead = Math.max(rescueAudit.maxRead, this.size); if (this.size > 8 * 1024 * 1024) throw Error('unbounded blob read'); return nativeArrayBuffer.call(this); };
    const nativeSet = Storage.prototype.setItem; const nativeRemove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function(key, value) { if (key !== 'float_rescue_export_checkpoint_v1') throw Error('business localStorage write forbidden'); return nativeSet.call(this, key, value); };
    Storage.prototype.removeItem = function(key) { if (key !== 'float_rescue_export_checkpoint_v1') throw Error('business localStorage delete forbidden'); return nativeRemove.call(this, key); };
    window.probe = (kind, value) => {
      if (kind === 'batch') { const chat = value.task === 'chat/0/messages'; rescueAudit[chat ? 'maxChatRows' : 'maxOtherRows'] = Math.max(rescueAudit[chat ? 'maxChatRows' : 'maxOtherRows'], value.rows); if (value.rows > 1 && value.chars > 16 * 1024 * 1024) rescueAudit.rawOverflow = true; }
      if (kind === 'readChunkBytes') { if (value > 1024 * 1024) throw Error('unbounded hash/CRC chunk'); }
      if (kind === 'pendingParts') rescueAudit.maxPending = Math.max(rescueAudit.maxPending, value);
      if (kind === 'writerReleased') { if (value !== 0) throw Error('writer refs retained'); rescueAudit.releases++; }
    };
  });
}

(async () => {
  const modules = await routeModule('lib/data-management/modules.ts');
  const schemaRoute = await routeModule('app/float-rescue-backup/schema/route.ts', { '@/lib/data-management/modules': modules });
  const schema = await schemaRoute.GET().json(); const html = await (await routeModule('app/float-rescue-backup/route.ts')).GET().text();
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'float-rescue-tests-')); const wp = require('next/dist/compiled/webpack/webpack'); wp.init();
  await new Promise((resolve, reject) => wp.webpack({ mode: 'development', target: 'web', devtool: false, context: repo, entry: path.join(repo, 'scripts/rescue-backup/restore-fixture.ts'), output: { path: temp, filename: 'restore.js' }, resolve: { extensions: ['.tsx','.ts','.js'], alias: { '@': repo } }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(repo, 'scripts/anonymous-xhs-phase0/ts-loader.cjs') }] }, plugins: [new wp.webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('development') })] }, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const savedParts = new Map();
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://fixture').pathname;
      if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
      if (pathname === '/fixture') { res.setHeader('Content-Type', 'text/html'); return res.end('<!doctype html><title>Disposable fixture</title>'); }
      if (pathname === '/restore') { res.setHeader('Content-Type', 'text/html'); return res.end('<!doctype html><script src="/restore.js"></script>'); }
      if (pathname === '/restore.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(await fs.readFile(path.join(temp, 'restore.js'))); }
      if (pathname === '/float-rescue-backup') { res.setHeader('Content-Type', 'text/html'); return res.end(html); }
      if (pathname === '/float-rescue-backup/schema') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(schema)); }
      if (savedParts.has(pathname)) { res.setHeader('Content-Type', 'application/zip'); return res.end(savedParts.get(pathname)); }
      if (pathname === '/float-rescue-backup.js' || /^\/float-rescue\/[a-z0-9-]+\.js$/.test(pathname)) { res.setHeader('Content-Type', 'text/javascript'); return res.end(await fs.readFile(path.join(repo, 'public', pathname))); }
      res.writeHead(404); res.end('not found');
    } catch (error) { res.writeHead(500); res.end(error.message); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const baseURL = `http://127.0.0.1:${server.address().port}`; let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true }); const sourceContext = await browser.newContext({ baseURL }); const page = await sourceContext.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await seed(page, schema); const before = await snapshot(page); await installReadGuards(page);
    const unexpectedRequests = [];
    await sourceContext.route('**/*', route => {
      const request = route.request(); const url = new URL(request.url());
      if (request.method() !== 'GET' || url.origin !== baseURL || !['/fixture','/float-rescue-backup','/float-rescue-backup.js','/float-rescue-backup/schema'].includes(url.pathname) && !url.pathname.startsWith('/float-rescue/')) { unexpectedRequests.push(request.method() + ' ' + url.pathname); return route.abort(); }
      return route.continue();
    });
    const result = await page.evaluate(async schema => {
      const api = await import('/float-rescue/exporter.js'); window.api = api; window.parts = []; window.exporter = await api.RescueExporter.prepare(schema, schema.modules.map(m => m.id), 'full', { partTargetBytes: 1024 * 1024, probe }); exporter.persist();
      const credentialTask = exporter.inventory.find(task => task.sourceIndex === 999); const inventoryNoValues = !JSON.stringify(exporter.inventory).includes('PRIVATE_API_FIXTURE') && !JSON.stringify(exporter.inventory).includes('PRIVATE_CLOUD_FIXTURE');
      let part; let duplicateBlocked = false;
      while ((part = await exporter.nextPart())) {
        if (!parts.length) { try { await exporter.nextPart(); } catch { duplicateBlocked = true; } }
        parts.push({ blob: part.blob, metadata: part.metadata, manifest: part.manifest, oversized: part.oversized });
        part.saveSucceeded = true; exporter.confirmSaved();
      }
      window.index = await exporter.finish();
      const verifier = await import('/float-rescue/verifier.js');
      const verified = await verifier.verifyRescueFiles(new Blob([JSON.stringify(index)]), parts.map(p => new File([p.blob], p.metadata.filename)), () => {}, probe);
      return { index, audit: rescueAudit, duplicateBlocked, credentialCount: credentialTask.count, inventoryNoValues, parts: parts.map(p => ({ ...p.metadata, oversized: p.oversized, manifest: p.manifest })), verified, checkpoint: localStorage.getItem('float_rescue_export_checkpoint_v1') };
    }, schema);
    check('standalone schema is single-source DATA_MODULES and includes local cloud credential source', () => { assert.deepEqual(schema.modules.map(m => m.id), Array.from(modules.DATA_MODULES, m => m.id)); assert.equal(result.credentialCount, 1); assert.ok(result.inventoryNoValues); });
    check('export sources use zero business writes, bounded messages=1 / others<=16 and no whole-store reads; serialize after transaction', () => { assert.equal(result.audit.writes, 0); assert.equal(result.audit.maxChatRows, 1); assert.ok(result.audit.maxOtherRows <= 16); assert.equal(result.audit.rawOverflow, false); assert.equal(result.audit.serializerDuringTransaction, false); assert.ok(result.audit.transactions > 0); });
    check('atob / hash / CRC bounded; one pending part; finalized writer references released', () => { assert.ok(result.audit.maxAtob <= 256 * 1024); assert.ok(result.audit.maxRead <= 8 * 1024 * 1024); assert.equal(result.audit.maxPending, 1); assert.equal(result.audit.releases, result.parts.length); assert.ok(result.duplicateBlocked); });
    check('at least four sequential v2 STORE parts with target enforcement and complete reconciled index', () => { assert.ok(result.parts.length >= 4); assert.ok(result.parts.every((part, i) => part.partNumber === i + 1 && part.manifest.version === 2 && (part.bytes <= 1024 * 1024 || part.oversized))); assert.equal(result.index.complete, true); assert.equal(result.verified.complete, true); });
    check('checkpoint contains metadata only; exporter performs no network upload', () => { assert.ok(!/PRIVATE_API_FIXTURE|PRIVATE_CLOUD_FIXTURE|data:image|source message/.test(result.checkpoint)); assert.deepEqual(unexpectedRequests, []); });
    // Transfer saved files to the test server only, outside the exporter. Production
    // exporter has no upload function and never sees these test fixture endpoints.
    for (let i = 0; i < result.parts.length; i++) {
      const chunks = [];
      for (let offset = 0; offset < result.parts[i].bytes; offset += 1024 * 1024) {
        const encoded = await page.evaluate(async ({ i, offset }) => {
          const bytes = new Uint8Array(await parts[i].blob.slice(offset, offset + 1024 * 1024).arrayBuffer()); let binary = '';
          for (let start = 0; start < bytes.length; start += 32768) binary += String.fromCharCode(...bytes.subarray(start, start + 32768));
          return btoa(binary);
        }, { i, offset }); chunks.push(Buffer.from(encoded, 'base64'));
      }
      savedParts.set('/saved/' + result.parts[i].filename, Buffer.concat(chunks));
    }
    const restoreContext = await browser.newContext({ baseURL }); const restore = await restoreContext.newPage(); await restore.goto('/restore'); await restore.waitForFunction(() => !!window.rescueRestore);
    const imported = await restore.evaluate(async filenames => {
      await rescueRestore.hydrateKvDb(); const results = []; const manifests = []; let dedupe = false; let selfContained = true; let storeOnly = true;
      const findRefs = value => {
        if (typeof value === 'string' && value.includes('__aiPhoneMediaRef')) { try { return findRefs(JSON.parse(value)); } catch { return []; } }
        if (value?.__aiPhoneMediaRef === true) return [value.ref];
        if (Array.isArray(value)) return value.flatMap(findRefs);
        if (value && typeof value === 'object') return Object.values(value).flatMap(findRefs);
        return [];
      };
      for (const filename of filenames.reverse()) {
        const blob = await (await fetch('/saved/' + filename)).blob(); manifests.push(await rescueRestore.readBackupManifest(blob));
        const archive = await rescueRestore.JSZip.loadAsync(blob, { checkCRC32: true }); const refs = [];
        for (const [name, entry] of Object.entries(archive.files)) {
          if (entry.dir) continue; storeOnly = storeOnly && entry._data.compression.magic === '\x00\x00';
          if (name.startsWith('modules/') && name.endsWith('.json')) refs.push(...findRefs(JSON.parse(await entry.async('string'))));
        }
        dedupe = dedupe || refs.length > new Set(refs).size;
        selfContained = selfContained && refs.every(ref => archive.file('media/' + ref + '.bin')) && Object.keys(archive.files).filter(name => name.startsWith('media/') && !archive.files[name].dir).length === new Set(refs).size;
        results.push(await rescueRestore.importBackupBlob(blob));
      }
      return { results, manifests, dedupe, selfContained, storeOnly };
    }, result.parts.map(part => part.filename));
    check('current readBackupManifest accepts every part and actual importBackupBlob restores in reverse order', () => { assert.equal(imported.manifests.length, result.parts.length); assert.ok(imported.results.every(r => !r.errors.length)); });
    check('all parts STORE-only, media deduped within part and independently self-contained; KV/LS ownership has no duplicates', () => {
      assert.ok(imported.storeOnly); assert.ok(imported.dedupe); assert.ok(imported.selfContained);
      assert.equal(result.index.inventory.filter(task => task.type === 'kv').reduce((sum, task) => sum + task.count, 0), 4);
      assert.equal(result.index.inventory.filter(task => task.type === 'localStorage').reduce((sum, task) => sum + task.count, 0), 4);
      assert.equal(imported.results.reduce((sum, item) => sum + item.added, 0), Object.values(result.index.exportedCounts).reduce((sum, count) => sum + count, 0));
    });
    const after = await snapshot(restore);
    check('restored messages deep equal including 12+MiB and nested data URLs; Blob size/type/hash, KV, localStorage and counts equal', () => assert.deepEqual(after, before));
    const ordinaryRegression = await restore.evaluate(async ids => {
      const backup = await rescueRestore.createBackupBlob(ids, { includeCloudCredentials: true });
      const manifest = await rescueRestore.readBackupManifest(backup.blob);
      const result = await rescueRestore.importBackupBlob(backup.blob);
      return { manifest, errors: result.errors };
    }, schema.modules.map(module => module.id));
    const ordinaryRestored = await snapshot(restore);
    check('unchanged ordinary full v2 backup/import round-trips the populated chat/media/KV/localStorage fixture', () => { assert.equal(ordinaryRegression.manifest.version, 2); assert.deepEqual(ordinaryRegression.errors, []); assert.deepEqual(ordinaryRestored, before); });
    await restoreContext.close();
    // Additional runtime scenarios follow in a separate test-only module below.
    await require('./rescue-backup/scenarios.cjs')({ page, browser, baseURL, schema, check, assert, errors, sourceContext, seed, installReadGuards, savedParts, savedIndex: result.index });
    await require('./rescue-backup/chat-media-scenarios.cjs')({ browser, baseURL, schema, check, seed, snapshot, installReadGuards, savedParts });
    await require('./rescue-backup/remaining-scenarios.cjs')({ browser, baseURL, schema, check, snapshot, installReadGuards, savedParts });
    check('all rescue scenarios have no page errors', () => assert.deepEqual(errors, []));
    await sourceContext.close(); console.log(`PASS ${checks} rescue backup browser checks`);
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
