/* Isolated synthetic boots. No application database or user browser profile. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib/boot-diagnostics.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const CURRENT = 'ai_phone_boot_diag_current_v1';
const PREVIOUS = 'ai_phone_boot_diag_previous_v1';
const stages = ['VN_BEGIN', 'MAP_BEGIN', 'MODULES_READY', 'KV_READ_BEGIN', 'CHAT_DB_BEGIN', 'CHAT_MESSAGES_BEGIN', 'KV_READ_DONE', 'KV_CACHE_DONE', 'THEME_READ_BEGIN', 'THEME_READ_DONE', 'THEME_DECODE_DONE', 'CHAT_MESSAGES_DONE', 'CHAT_NORMALIZE_BEGIN', 'CHAT_NORMALIZE_DONE', 'CHAT_INDEX_DONE', 'CHAT_HYDRATE_DONE', 'PLUGIN_BEGIN', 'PLUGIN_DONE', 'AUX_STORAGE_BEGIN', 'AUX_STORAGE_DONE', 'VN_DONE', 'MAP_DONE', 'SHELL_INTERACTIVE'];
let checks = 0;
function check(value, expected) { assert.deepEqual(JSON.parse(JSON.stringify(value)), JSON.parse(JSON.stringify(expected))); checks++; }
function boot(data = new Map(), mode = '', disabled = false) {
  const writes = [], listeners = {};
  const storage = { getItem: key => data.get(key) ?? null, get length() { return data.size; }, key: index => [...data.keys()][index] ?? null, removeItem: key => data.delete(key), setItem(key, value) { if (mode === 'quota') throw new Error('quota'); data.set(key, value); writes.push([key, value]); } };
  const window = { addEventListener: (name, cb) => { listeners[name] = cb; } };
  Object.defineProperty(window, 'localStorage', { get() { if (mode === 'unavailable') throw new Error('unavailable'); return storage; } });
  const ctx = vm.createContext({ window, exports: {}, process: { env: {} } });
  vm.runInContext(compiled, ctx);
  const api = ctx.exports;
  const script = api.bootDiagnosticsScript('test-build', disabled);
  vm.runInContext(script, ctx);
  return { ctx, api, data, writes, listeners, script, diag: window.__FLOAT_BOOT_DIAG__, mark: stage => api.markBootStage(stage) };
}
function finish(b, safe = false) { for (const s of stages) b.mark(s === 'PLUGIN_DONE' && safe ? 'PLUGIN_SKIPPED_SAFE' : s); }
const normal = boot();
finish(normal);
check(normal.diag.getPrevious(), null);
check(normal.diag.getCurrent().ready, true);
check(normal.diag.getCurrent().lastStage, 'BOOT_READY');
check(normal.diag.getCurrent().activeStages, []);
const normalWrites = normal.writes.length;
for (const s of stages) normal.mark(s);
vm.runInContext(normal.script, normal.ctx);
check(normal.writes.length, normalWrites);
check(boot(normal.data).diag.getPrevious(), null);

for (const stop of ['KV_READ_BEGIN', 'KV_READ_DONE', 'CHAT_MESSAGES_BEGIN', 'CHAT_MESSAGES_DONE', 'CHAT_HYDRATE_DONE', 'PLUGIN_BEGIN']) {
  const first = boot();
  for (const s of stages) { first.mark(s); if (s === stop) break; }
  const old = first.diag.getCurrent();
  const next = boot(first.data);
  check(next.diag.getPrevious(), old);
  check(next.diag.getCurrent().ready, false);
  assert.notEqual(next.diag.getCurrent().bootAttemptId, old.bootAttemptId); checks++;
  check(next.writes.length, 2);
}
const parallel = boot();
for (const s of ['KV_READ_BEGIN', 'CHAT_DB_BEGIN', 'CHAT_MESSAGES_BEGIN', 'KV_READ_DONE']) parallel.mark(s);
check(parallel.diag.getCurrent().lastStage, 'KV_READ_DONE');
assert.ok(parallel.diag.getCurrent().activeStages.includes('CHAT_MESSAGES')); checks++;
assert.ok(parallel.diag.getCurrent().activeStages.includes('KV_CACHE')); checks++;
check(boot(parallel.data).diag.getPrevious().activeStages, parallel.diag.getCurrent().activeStages);

for (const mode of ['unavailable', 'quota']) { const b = boot(new Map(), mode); finish(b); check(b.diag.getCurrent().ready, true); check(b.diag.getPrevious(), null); }
for (const corrupt of ['{', 'null', '[]', '{}', '"text"', 'x'.repeat(3000), JSON.stringify({ version: 1, lastStage: 'USER PRIVATE TEXT' })]) {
  const b = boot(new Map([[CURRENT, corrupt], [PREVIOUS, corrupt]])); finish(b); check(b.diag.getCurrent().ready, true); check(b.diag.getPrevious(), null);
}
const safe = boot(); finish(safe, true);
check(safe.diag.getCurrent().ready, true);
assert.ok(safe.diag.getCurrent().completedStages.includes('PLUGIN_SKIPPED_SAFE')); checks++;
const exit = boot(); exit.listeners.pagehide(); exit.listeners.pagehide();
check(exit.diag.getCurrent().ready, false); check(exit.diag.getCurrent().exitObserved, true); check(exit.writes.length, 2);
check(boot(exit.data).diag.getPrevious().exitObserved, true);
const snapshot = normal.diag.getCurrent(); snapshot.activeStages.push('USER TEXT'); snapshot.ready = false;
check(normal.diag.getCurrent().ready, true); check(normal.diag.getCurrent().activeStages, []);
check(Object.isFrozen(normal.diag), true);
normal.mark('USER TEXT'); check(normal.writes.length, normalWrites);
const disabled = boot(new Map(), '', true); finish(disabled); disabled.api.markBootReady();
check(disabled.writes.length, 0); check(disabled.api.readPreviousBootAttempt(), null);
check(disabled.script, '');
const firstFailure = boot(); firstFailure.mark('KV_READ_BEGIN');
const success = boot(firstFailure.data); finish(success);
check(boot(success.data).diag.getPrevious().lastStage, 'KV_READ_BEGIN');
const premature = boot(); premature.api.markBootReady(); check(premature.diag.getCurrent().ready, false);
const largest = Math.max(...normal.writes.map(([, value]) => Buffer.byteLength(value, 'utf8')));
assert.ok(largest < 1500); checks++;
const worstBuild = boot();
delete worstBuild.ctx.window.__FLOAT_BOOT_DIAG_INTERNAL_V1__;
vm.runInContext(worstBuild.api.bootDiagnosticsScript('b'.repeat(80)), worstBuild.ctx);
finish(worstBuild, true);
const maxSupportedJsonBytes = Math.max(...worstBuild.writes.map(([, value]) => Buffer.byteLength(value, 'utf8')));
assert.ok(maxSupportedJsonBytes < 1024); checks++;
// No storage reads/writes after ready (other than a single pagehide stamp).
const afterReady = normal.writes.length;
normal.listeners.pagehide(); normal.listeners.pagehide(); normal.api.markBootReady();
check(normal.writes.length, afterReady + 1);
check(normal.diag.getCurrent().ready, true);
const ssr = vm.createContext({ exports: {}, process: { env: {} } });
vm.runInContext(compiled, ssr); ssr.exports.markBootStage('KV_READ_BEGIN'); ssr.exports.markBootReady();
check(ssr.exports.readCurrentBootAttempt(), null);
const noBootstrap = boot(new Map(), '', true);
vm.runInContext(noBootstrap.api.bootDiagnosticsScript('test-build'), noBootstrap.ctx);
delete noBootstrap.ctx.window.__FLOAT_BOOT_DIAG_INTERNAL_V1__;
const removedWrites = noBootstrap.writes.length;
finish(noBootstrap); check(noBootstrap.writes.length, removedWrites);
// Bootstrap is a literal, independent of module/minifier closure transformations.
assert.ok(!normal.api.bootDiagnosticsScript('</script><script>bad()</script>').includes('</script>')); checks++;
const times = [];
for (let i = 0; i < 200; i++) { const b = boot(); const start = performance.now(); finish(b); times.push(performance.now() - start); }
times.sort((a,b) => a-b);
console.log(JSON.stringify({ checks, normalSetItems: normalWrites, maxJsonUtf8Bytes: largest, maxSupportedJsonBytes, mockStorageStagesMs: { median: times[100], p95: times[190] }, note: 'Node VM + in-memory storage; browser synchronous IO is measured separately.' }, null, 2));
module.exports = { compiled, stages, root, boot };
