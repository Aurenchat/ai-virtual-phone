const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript'), assert = require('node:assert/strict');
const { boot, root, stages } = require('./test-boot-diagnostics.cjs');
const { load, fixture } = require('./chat-performance/harness.cjs');
let checks = 0;
const check = (value, expected) => { assert.deepEqual(JSON.parse(JSON.stringify(value)), JSON.parse(JSON.stringify(expected))); checks++; };
const sourceCache = new Map();
function run(b, file, mocks) {
  if (!sourceCache.has(file)) sourceCache.set(file, ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText);
  const exports = {};
  vm.compileFunction(sourceCache.get(file), ['exports', 'require'], { parsingContext: b.ctx })(exports, name => {
    if (name === './boot-diagnostics') return b.api;
    if (!(name in mocks)) throw Error('Unexpected dependency: ' + name);
    return mocks[name];
  });
  return exports;
}
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function fakeDexie(tables) { return { default: class {
  version() { return { stores: () => { Object.assign(this, tables); for (const table of Object.values(tables)) Object.assign(table, { db: this, toCollection() { return this; }, limit() { return this; } }); } }; }
  transaction(_mode, _table, fn) { return fn(); }
} }; }
(async () => {
  const bootResults = [];
  for (const disabled of [false, true]) {
    const b = boot(new Map([['ai_phone_idb_migrated_v1', '1']]), '', disabled);
    b.ctx.localStorage = b.ctx.window.localStorage;
    const reads = [], kvDone = deferred(), messagesDone = deferred(), sessionsDone = deferred();
    const kv = run(b, 'lib/kv-db.ts', { dexie: fakeDexie({ entries: { toArray: () => { reads.push('kv'); return kvDone.promise; } } }) });
    const chat = run(b, 'lib/chat-db.ts', { dexie: fakeDexie({ messages: { toArray: () => { reads.push('messages'); return messagesDone.promise; } },
      sessions: { toArray: () => { reads.push('sessions'); return sessionsDone.promise; } }, contacts: { toArray: async () => { reads.push('contacts'); return []; } } }) });
    const kvPromise = kv.hydrateKvDb(), chatPromise = chat.initChatDb();
    if (!disabled) check(b.diag.getCurrent().activeStages, ['KV_READ', 'KV_CACHE', 'CHAT_DB', 'CHAT_HYDRATE', 'CHAT_MESSAGES']);
    kvDone.resolve([{ key: 'synthetic', value: 'fixture' }]); await kvPromise;
    if (!disabled) { check(b.diag.getCurrent().lastStage, 'KV_CACHE_DONE'); check(b.diag.getCurrent().activeStages.includes('CHAT_MESSAGES'), true); }
    messagesDone.resolve([{ id: 'synthetic-message' }]); await new Promise(setImmediate);
    if (!disabled) { check(b.diag.getCurrent().lastStage, 'CHAT_MESSAGES_DONE'); check(b.diag.getCurrent().activeStages.includes('CHAT_DB'), true); }
    sessionsDone.resolve([]); const data = await chatPromise;
    bootResults.push({ reads, data, hydrated: kv.isKvHydrated(), value: kv.kvGet('synthetic') });
    if (disabled) check(b.writes.length, 0);
  }
  check(bootResults[0], bootResults[1]);
  // Execute real storage hydrate, verifying existing normalizer/index/metadata code still returns identical data.
  const b = boot(), h = load(fixture(100, 5), false, b.api);
  b.mark('CHAT_DB_BEGIN'); b.mark('CHAT_MESSAGES_BEGIN'); b.mark('CHAT_MESSAGES_DONE');
  await h.core.hydrateChatStorage();
  check(b.diag.getCurrent().lastStage, 'CHAT_HYDRATE_DONE');
  check(b.diag.getCurrent().activeStages, []);
  check(b.diag.getCurrent().completedStages.slice(-3), ['CHAT_NORMALIZE_DONE', 'CHAT_INDEX_DONE', 'CHAT_HYDRATE_DONE']);
  h.core.assertChatMessageIndexConsistency(); checks++;
  const writeCount = b.writes.length; await h.core.hydrateChatStorage(); check(b.writes.length, writeCount);

  // Execute actual runtime startup in normal, explicit-safe and crash-guard modes.
  for (const mode of ['normal', 'safe', 'guard']) {
    const b = boot(), kvDone = deferred(), chatDone = deferred(), calls = [];
    const kv = new Map(mode === 'safe' ? [['chat_plugins_safe_mode', '1']] : mode === 'guard' ? [['chat_plugins_boot_guard', '3']] : []);
    b.ctx.window.dispatchEvent = () => {}; b.ctx.CustomEvent = class {}; b.ctx.window.location = { search: '' }; b.ctx.URLSearchParams = URLSearchParams;
    const mocks = Object.fromEntries(['./native-gift-bridge', './shopping-storage', './media-cache-storage', './character-storage', './settings-storage', './api-helpers', './chat-plugin-loader', './chat-plugin-types'].map(name => [name, {}]));
    mocks['./kv-db'] = { hydrateKvDb: () => kvDone.promise, kvGet: key => kv.get(key), kvSet: (k,v) => kv.set(k,v), kvRemove: k => kv.delete(k) };
    mocks['./chat-storage'] = { hydrateChatStorage: () => chatDone.promise };
    mocks['./chat-plugin-hooks'] = { getChatPluginHookBus: () => ({ emitEvent: name => calls.push(name) }) };
    mocks['./chat-plugin-storage'] = { recordChatPluginLog() {}, loadRunnableChatPlugins: () => { calls.push('list'); return []; } };
    const runtime = run(b, 'lib/chat-plugin-runtime.ts', mocks).getChatPluginRuntime();
    const promise = runtime.ensureStarted();
    check(b.diag.getCurrent().lastStage, 'BOOT_START');
    kvDone.resolve(); await Promise.resolve(); check(b.diag.getCurrent().lastStage, 'BOOT_START');
    chatDone.resolve(); await promise;
    check(b.diag.getCurrent().lastStage, mode === 'normal' ? 'PLUGIN_DONE' : 'PLUGIN_SKIPPED_SAFE');
    check(calls, mode === 'normal' ? ['list', 'app.ready'] : []);
    for (const stage of stages.filter(s => !s.startsWith('PLUGIN'))) b.mark(stage);
    check(b.diag.getCurrent().ready, true);
  }
  // Structural guard: inserts only, no edits to schemas/cache/legacy normalization/boot branches.
  const cp = require('node:child_process');
  for (const file of ['lib/chat-db.ts', 'lib/chat-storage.ts', 'lib/kv-db.ts', 'lib/vn-storage.ts', 'lib/map-storage.ts', 'lib/chat-plugin-runtime.ts', 'components/main-app.tsx', 'components/desktop-shell.tsx']) {
    const before = cp.execFileSync('git', ['show', 'ebd54d4:' + file], { cwd: root, encoding: 'utf8', maxBuffer: 10e6 });
    const after = fs.readFileSync(path.join(root, file), 'utf8');
    // Stage 3B intentionally changes these boundaries. Dedicated chunk/scheduling
    // tests check their behavior; keep all Stage 3A marker calls unchanged here.
    if (['lib/chat-db.ts', 'lib/map-storage.ts', 'components/main-app.tsx'].includes(file)) {
      const markers = text => text.match(/markBootStage\("[A-Z_]+"\)/g) || [];
      const telemetryBaseline = cp.execFileSync('git', ['show', '4324623:' + file], { cwd: root, encoding: 'utf8', maxBuffer: 10e6 });
      check(markers(after), markers(telemetryBaseline));
      continue;
    }
    const strip = text => text.replace(/^import \{ markBootStage \} from [^\n]+\n/gm, '')
      .replace(/  useEffect\(\(\) => \{\s*if \(desktopReady\) markBootStage\("SHELL_INTERACTIVE"\);\s*\}, \[desktopReady\]\);/g, '')
      .replace(/\.then\(messages => \{ markBootStage\("CHAT_MESSAGES_DONE"\); return messages; \}\)/g, '')
      .replace(/^\s*markBootStage\("[A-Z_]+"\);\s*$/gm, '')
      .replace(/\s+/g, '');
    check(strip(after), strip(before));
  }
  console.log(JSON.stringify({ integrationChecks: checks, status: 'passed', covers: 'real KV + ChatDB parallel completion, disabled equivalence, real ChatStorage index, runtime safe/guard branches, startup logic unchanged after marker removal' }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
