// Run the actual startup functions against deferred synthetic storage boundaries.
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), assert = require('node:assert/strict');
const compile = text => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const flush = () => new Promise(setImmediate);
let checks = 0;
function equal(value, expected) { assert.deepEqual(value, expected); checks++; }
(async () => {
  const chat = deferred(), kvReady = deferred(), phases = [];
  let chatWaits = 0;
  const kv = { registerKvMigration() {}, registerDynamicPrefix() {}, kvGet: () => null, hydrateKvDb: () => kvReady.promise };
  class FakeDexie {
    version() { return { stores: schema => { for (const name of Object.keys(schema)) this[name] = { toArray: async () => { phases.push(name); return []; } }; } }; }
    table(name) { return this[name]; }
  }
  const mocks = { dexie: { default: FakeDexie }, './boot-diagnostics': { markBootStage: s => phases.push(s) }, './chat-storage': { hydrateChatStorage: () => { chatWaits++; return chat.promise; } }, './kv-db': kv, './llm-prompt-assembler': {}, './bilingual-prompt-defaults': {} };
  const ctx = vm.createContext({ window: {}, exports: {} });
  vm.compileFunction(compile(fs.readFileSync('lib/map-storage.ts', 'utf8')), ['exports','require'], { parsingContext: ctx })(ctx.exports, n => { if (!mocks[n]) throw Error(n); return mocks[n]; });
  await flush(); equal(phases, []);
  equal(chatWaits, 0); kvReady.resolve(); await flush(); equal(chatWaits, 1);
  const pending = ctx.exports.hydrateMapStorage(), duplicate = ctx.exports.hydrateMapStorage();
  equal(pending === duplicate, true);
  chat.resolve(); await pending;
  equal(phases, ['MAP_BEGIN', 'worlds', 'saves', 'themeBlobs', 'MAP_DONE']);
  await ctx.exports.hydrateMapStorage(); equal(phases.length, 5);

  const source = fs.readFileSync('components/main-app.tsx', 'utf8');
  const ast = ts.createSourceFile('main.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect;
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes('MODULES_READY')) effect = node.arguments[0].getText(ast);
    ts.forEachChild(node, visit);
  }; visit(ast); assert.ok(effect); checks++;
  for (const cancel of [false, true]) {
    const kvDone = deferred(), chatDone = deferred(), calls = [];
    const sandbox = { exports: {}, navigator: { storage: { persist: async () => {} } }, window: { matchMedia: () => ({ matches: false }) },
      markBootStage: s => calls.push(s), hydrateKvDb: () => kvDone.promise, isKvHydrated: () => true,
      hydrateChatStorage: () => { calls.push('chat-wait'); return chatDone.promise; }, setKvHydrateFailed() {},
      prepareDesktopThemeForFirstPaint: async () => { calls.push('theme-read-decode'); return {}; }, setPreparedDesktopTheme() {},
      setHydrated: () => calls.push('shell-can-mount'), hasPendingMcpOAuthCallback: () => false };
    const scope = vm.createContext(sandbox);
    vm.runInContext(compile('exports.start = ' + effect), scope);
    const cleanup = scope.exports.start(); await flush(); equal(calls, ['MODULES_READY']);
    kvDone.resolve(); await flush(); equal(calls, ['MODULES_READY', 'chat-wait']);
    if (cancel) cleanup(); chatDone.resolve(); await flush();
    equal(calls, cancel ? ['MODULES_READY', 'chat-wait'] : ['MODULES_READY', 'chat-wait', 'theme-read-decode', 'shell-can-mount']);
  }
  // The post-theme desktop starts AUX, rather than the original root/plugin parallel branch.
  const desktop = fs.readFileSync('components/desktop-shell.tsx', 'utf8');
  assert.ok(desktop.indexOf('markBootStage("AUX_STORAGE_BEGIN")') < desktop.indexOf('markBootStage("AUX_STORAGE_DONE")')); checks++;
  console.log(JSON.stringify({ checks, status: 'passed', covers: 'module auto Map deferral, single-flight Map, theme waits KV+Chat, cancellation, shell/AUX boundary' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
