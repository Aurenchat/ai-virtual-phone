// Real IndexedDB on an isolated synthetic origin. No real profile, data or network.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process'), ts = require('typescript'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const compile = s => ts.transpileModule(s, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
// Benchmark prototype first; --candidate is never used by the application.
async function candidate(table, size) {
  return table.db.transaction('r', table, async () => {
    const all = []; let last;
    for (;;) {
      const batch = await (last === undefined ? table.toCollection() : table.where(':id').above(last)).limit(size).toArray();
      for (const message of batch) all.push(message);
      if (batch.length < size) return all;
      last = batch[batch.length - 1].id;
    }
  });
}
const oldDbSource = cp.execFileSync('git', ['show', '4324623:lib/chat-db.ts'], { cwd: root, encoding: 'utf8' });
const payload = { db: compile(fs.readFileSync(path.join(root, 'lib/chat-db.ts'), 'utf8')), oldDb: compile(oldDbSource),
  core: compile(fs.readFileSync(path.join(root, 'lib/chat-storage.ts'), 'utf8')), protocol: compile(fs.readFileSync(path.join(root, 'lib/text-tool-protocol.ts'), 'utf8')),
  candidate: candidate.toString(), prototype: process.argv.includes('--candidate') };
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--enable-precise-memory-info'] });
  try {
    const context = await browser.newContext();
    await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body>synthetic startup benchmark</body></html>' }));
    const page = await context.newPage(); await page.goto('https://float-startup-benchmark.invalid');
    const setup = async () => {
    await page.addScriptTag({ content: fs.readFileSync(path.join(path.dirname(require.resolve('dexie')), 'dexie.js'), 'utf8') });
    await page.evaluate(p => {
      window.process = { env: { NODE_ENV: 'test' } };
      const run = (code, require) => { const exports = {}; new Function('exports', 'require', code)(exports, require); return exports; };
      const noop = () => {};
      const marks = [];
      const deps = name => name === 'dexie' ? { default: Dexie } : name === './boot-diagnostics' ? { markBootStage: s => marks.push([s, performance.now()]) } : (() => { throw Error(name); })();
      const current = run(p.db, deps), old = run(p.oldDb, deps);
      const chunk = p.prototype ? (0,eval)('(' + p.candidate + ')') : current.readChatMessagesInChunks;
      if (!chunk) throw Error('chunk reader not implemented');
      const table = current.chatDb.messages, db = current.chatDb;
      const protocol = run(p.protocol, () => { throw Error('unexpected protocol dependency'); });
      const synthetic = (i, bytes = 120) => ({ id: 'm' + String(i).padStart(8, '0'), sessionId: 's' + (i % 200), role: i % 2 ? 'assistant' : 'user',
        content: ('synthetic-' + i + ' ' + 'x'.repeat(bytes)).slice(0, bytes), order: i % 9 ? Math.floor(i / 200) : undefined,
        createdAt: new Date(1700000000000 + i * 1000).toISOString(), status: 'sent' });
      window.seed = async (n, bytes) => {
        window.retained = null; await table.clear(); await db.sessions.clear(); await db.contacts.clear();
        for (let start = 0; start < n; start += 1000) {
          const batch = []; for (let i = Math.min(n, start + 1000) - 1; i >= start; i--) batch.push(synthetic(i, bytes));
          await table.bulkPut(batch);
        }
        await db.sessions.bulkPut(Array.from({ length: 200 }, (_, i) => ({ id: 's' + i, contactId: 'c' + i, updatedAt: '2026-01-01T00:00:00.000Z', isPinned: false, unreadCount: 0 })));
        await db.contacts.bulkPut(Array.from({ length: 200 }, (_, i) => ({ id: 'contact-s' + i, characterId: 'c' + i, addedAt: '2026-01-01T00:00:00.000Z' })));
        localStorage.setItem('ai_phone_idb_migrated_v1', '1');
      };
      window.measure = async (mode, size) => {
        window.retained = null; marks.length = 0;
        let messages, readMs = 0, ticks = 0, maxGap = 0, lastTick = performance.now(), readDoneAt = Infinity;
        let peak = performance.memory.usedJSHeapSize;
        const tasks = [], observer = new PerformanceObserver(list => tasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration }))));
        observer.observe({ type: 'longtask', buffered: false });
        const start = performance.now(), heapBefore = performance.memory.usedJSHeapSize;
        const timer = setInterval(() => { const now = performance.now(); maxGap = Math.max(maxGap, now - lastTick); lastTick = now; ticks++; peak = Math.max(peak, performance.memory.usedJSHeapSize); }, 5);
        const mocks = { './boot-diagnostics': { markBootStage: s => marks.push([s, performance.now()]) },
          './chat-db': { ...current, initChatDb: async () => {
            const t = performance.now();
            const data = mode === 'before' ? await old.initChatDb() : size === current.CHAT_MESSAGE_READ_CHUNK_SIZE && !p.prototype ? await current.initChatDb() : {
              messages: await chunk(table, size), sessions: await db.sessions.toArray(), contacts: await db.contacts.toArray() };
            messages = data.messages; readMs = performance.now() - t; readDoneAt = performance.now(); peak = Math.max(peak, performance.memory.usedJSHeapSize); return data;
          } },
          './settings-storage': { resolveUserIdentity: () => ({ name: 'User' }) }, './character-storage': { loadCharacters: () => Array.from({ length: 200 }, (_, i) => ({ id: 'c' + i, name: 'c' + i })) },
          './kv-db': { kvGet: () => null, kvSet: noop, registerKvMigration: noop }, './chat-plugin-hooks': { emitChatPluginEvent: noop, runChatPluginTransformSync: (_, p) => p },
          './rich-message-parser': { parseAIResponse: () => [] }, './text-tool-protocol': protocol, './chat-status-region': { captureCurrentStatusRendererId: () => null } };
        for (const k of ['dbPutMessages', 'dbPutSessions', 'dbReplaceSessions', 'dbReplaceContacts']) mocks['./chat-db'][k] = noop;
        const core = run(p.core, name => { if (!mocks[name]) throw Error(name); return mocks[name]; });
        await core.hydrateChatStorage();
        if (!core.isChatStorageHydrated()) throw Error('hydrate failed');
        const end = performance.now(); maxGap = Math.max(maxGap, end - lastTick); peak = Math.max(peak, performance.memory.usedJSHeapSize);
        const readTicks = ticks; clearInterval(timer); await new Promise(r => setTimeout(r, 40)); observer.disconnect();
        core.assertChatMessageIndexConsistency();
        window.retained = { messages, core };
        return { mode, size, readMs, messageStageMs: marks.some(m => m[0] === 'CHAT_MESSAGES_DONE') ? marks.find(m => m[0] === 'CHAT_MESSAGES_DONE')[1] - marks.find(m => m[0] === 'CHAT_MESSAGES_BEGIN')[1] : null,
          hydrateMs: end - start, maxTaskMs: Math.max(0, ...tasks.filter(t => t.start < end && t.start + t.duration > start).map(t => t.duration)),
          maxReadTaskMs: Math.max(0, ...tasks.filter(t => t.start < readDoneAt && t.start + t.duration > start).map(t => t.duration)),
          maxHeartbeatGapMs: maxGap, heartbeatTicks: readTicks, heapBeforeMiB: heapBefore / 1048576, sampledPeakMiB: peak / 1048576,
          count: messages.length, ordered: messages.every((m, i) => m.id === synthetic(i, 0).id) };
      };
      window.regress = async () => {
        const results = [], check = (name, condition) => { if (!condition) throw Error(name); results.push(name); };
        for (const n of [0, 1, 9, 256, 257, 4097, 10000, 50000]) {
          await window.seed(n, 120);
          const expected = await table.toArray();
          for (const size of [1, 256, 1024]) {
            if (size === 1 && n > 257) continue;
            const actual = await chunk(table, size);
            check('equal every field/order n=' + n + ' chunk=' + size, JSON.stringify(actual) === JSON.stringify(expected));
          }
        }
        // Keep the read in one snapshot: an interleaved writer must wait until all batches finish.
        await window.seed(1025, 120); const other = new Dexie('AiPhoneChatDB'); other.version(1).stores({ messages: 'id, sessionId, createdAt', sessions: 'id, contactId', contacts: 'id, characterId' }); await other.open();
        let writer, reads = 0;
        const original = IDBObjectStore.prototype.getAll;
        IDBObjectStore.prototype.getAll = function(...args) {
          if (this.name === 'messages' && ++reads === 2) writer = other.messages.delete('m00001024');
          return original.apply(this, args);
        };
        try { const snapshot = await chunk(table, 256); check('single readonly transaction excludes concurrent delete', snapshot.length === 1025); await writer; }
        finally { IDBObjectStore.prototype.getAll = original; other.close(); }
        // Request/cursor failure must reject, not return the accumulated prefix.
        reads = 0;
        IDBObjectStore.prototype.getAll = function(...args) { if (this.name === 'messages' && ++reads === 2) throw new DOMException('synthetic read failure', 'UnknownError'); return original.apply(this, args); };
        try { let failed = false; try { await chunk(table, 256); } catch { failed = true; } check('mid-read error rejects entire result', failed); }
        finally { IDBObjectStore.prototype.getAll = original; }
        // Failure in init must use its existing retry/reject path, including lost migration flag.
        IDBObjectStore.prototype.getAll = function(...args) { if (this.name === 'messages') throw new DOMException('synthetic failure', 'UnknownError'); return original.apply(this, args); };
        try {
          let failed = false; try { await current.initChatDb(); } catch { failed = true; }
          check('init rejects after exhausted retries', failed);
          localStorage.removeItem('ai_phone_idb_migrated_v1'); failed = false;
          try { await current.initChatDb(); } catch { failed = true; }
          check('lost migration flag never falls back to empty messages on read error', failed);
        } finally { IDBObjectStore.prototype.getAll = original; localStorage.setItem('ai_phone_idb_migrated_v1', '1'); }
        // Exercise Dexie's actual openCursor fallback, not a fabricated cursor mock.
        await window.seed(513, 120);
        const expectedCursor = await table.toArray();
        const descriptor = Object.getOwnPropertyDescriptor(IDBObjectStore.prototype, 'getAll');
        const cursorContinue = IDBCursor.prototype.continue;
        let fallback;
        try {
          delete IDBObjectStore.prototype.getAll;
          fallback = new Dexie('AiPhoneChatDB'); fallback.version(1).stores({ messages: 'id, sessionId, createdAt', sessions: 'id, contactId', contacts: 'id, characterId' }); await fallback.open();
          let cursorSteps = 0;
          IDBCursor.prototype.continue = function(...args) { cursorSteps++; return cursorContinue.apply(this, args); };
          check('cursor fallback field/order equality', JSON.stringify(await chunk(fallback.messages, 256)) === JSON.stringify(expectedCursor));
          check('cursor fallback actually iterated', cursorSteps > 0);
          cursorSteps = 0;
          IDBCursor.prototype.continue = function(...args) { const result = cursorContinue.apply(this, args); if (++cursorSteps === 300) this.source.transaction.abort(); return result; };
          let failed = false; try { await chunk(fallback.messages, 256); } catch { failed = true; }
          check('cursor request abort rejects entire read', failed);
        } finally { fallback?.close(); Object.defineProperty(IDBObjectStore.prototype, 'getAll', descriptor); IDBCursor.prototype.continue = cursorContinue; }
        await table.clear();
        const special = Array.from({ length: 300 }, (_, i) => ({...synthetic(i), order: undefined, rawResponseText: 'raw [获取工具: test] '.repeat(100), mediaData: { imageUrls: ['synthetic://image'], nested: { duration: i } } }));
        await table.bulkPut(special.reverse());
        check('legacy order/rawResponseText/media metadata unchanged', JSON.stringify(await chunk(table, 256)) === JSON.stringify(await table.toArray()));
        let invalid = false; try { await chunk(table, 0); } catch { invalid = true; }
        check('invalid chunk size rejects instead of truncating', invalid);
        // Exact multiples need one final empty batch; check empty-string primary key too.
        await table.clear(); await table.bulkPut([{...synthetic(1), id: ''}, {...synthetic(2), id: 'z'}]);
        check('empty string primary key not skipped', JSON.stringify(await chunk(table, 1)) === JSON.stringify(await table.toArray()));
        return results;
      };
    }, payload);
    };
    await setup();
    const cdp = await context.newCDPSession(page);
    if (!process.argv.includes('--benchmark')) {
      const results = await page.evaluate(() => window.regress()); console.log(JSON.stringify({ checks: results.length, results }, null, 2));
    } else {
      const rows = [], calibration = process.argv.includes('--calibrate');
      const scenarios = calibration ? [[50000, 10240]] : [[50000, 120], [50000, 2048], [50000, 10240], [100000, 120]];
      for (const [count, bytes] of scenarios) {
        await page.evaluate(([n,b]) => window.seed(n,b), [count,bytes]);
        for (let repeat = 0; repeat < 3; repeat++) {
          const modes = calibration ? [['before',0], ['after',256], ['after',1024], ['after',4096]] : [['before',0], ['after',256]];
          if (repeat % 2) modes.reverse();
          for (const [mode,size] of modes) {
            // chat-storage installs module-level listeners; reload to release the previous module/cache.
            await page.reload(); await setup(); await cdp.send('HeapProfiler.collectGarbage');
            const row = await page.evaluate(([m,s]) => window.measure(m,s), [mode,size]);
            assert.equal(row.count, count); assert.equal(row.ordered, true);
            await cdp.send('HeapProfiler.collectGarbage'); row.retainedMiB = (await cdp.send('Runtime.getHeapUsage')).usedSize / 1048576;
            rows.push({ count, bytes, repeat, ...row }); console.log(JSON.stringify(rows.at(-1)));
          }
        }
      }
      const output = { browser: await browser.version(), prototype: payload.prototype, rows, note: 'Desktop Chromium synthetic. Long Tasks >=50ms only. Heartbeat includes scheduling, not pure CPU. Sampled heap is a lower bound, excludes IDB/native buffers. Retained heap after forced GC.' };
      const out = process.argv.find(a => a.startsWith('--out='))?.slice(6); if (out) fs.writeFileSync(out, JSON.stringify(output, null, 2) + '\n');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
