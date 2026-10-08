const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let checks = 0;
const test = (label, fn) => { fn(); checks++; console.log('PASS ' + label); };
function load(file) {
    const records = new Map();
    let throws = false;
    const exports = {};
    const localStorage = {
        getItem(key) { if (throws) throw Error('disabled'); return records.get(key) || null; },
        setItem(key, value) { if (throws) throw Error('quota'); records.set(key, value); },
    };
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(code, { exports, localStorage, Date, Math });
    return { api: exports, records, fail: () => { throws = true; } };
}
const generation = load('lib/chat-generation-diagnostics.ts');
// Execute the actual first-delta gate, rather than asserting source strings.
const roomSource = fs.readFileSync('components/chat/chat-room.tsx', 'utf8');
const roomAst = ts.createSourceFile('room.tsx', roomSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const firstDelta = roomAst.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'markFirstGenerationDelta');
const deltaWrites = [];
const deltaContext = { markGenerationDiagnostic: (...args) => deltaWrites.push(args) };
vm.createContext(deltaContext);
vm.runInContext(ts.transpileModule(firstDelta.getText(roomAst), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, deltaContext);
const deltaRun = { runId: 'delta-run', firstDeltaSeen: false };
for (let i = 0; i < 100; i++) deltaContext.markFirstGenerationDelta(deltaRun);
test('100 stream callbacks write first-delta breadcrumb once', () => {
    assert.equal(deltaWrites.length, 1); assert.equal(deltaWrites[0][1], 'API_FIRST_DELTA');
});
const g = generation.api;
g.startGenerationDiagnostic('run-1', 'session-a', false);
g.markGenerationDiagnostic('run-1', 'HISTORY_LOADED', { historyCount: 110 });
g.markGenerationDiagnostic('run-1', 'API_BEGIN');
test('pending API retains API_BEGIN incomplete and history count', () => {
    const r = g.readGenerationDiagnostics().current;
    assert.equal(r.lastStage, 'API_BEGIN'); assert.equal(r.completed, false); assert.equal(r.historyCount, 110);
});
g.markGenerationDiagnostic('run-1', 'RESPONSE_RECEIVED', { rawLength: 100 });
g.markGenerationDiagnostic('run-1', 'PARSE_DONE', {}, 3);
test('parse completed before publishing records three drafts and zero published', () => {
    const r = g.readGenerationDiagnostics().current;
    assert.equal(r.lastStage, 'PARSE_DONE'); assert.equal(r.draftCount, 3); assert.equal(r.publishedCount, 0);
});
g.markGenerationDiagnostic('run-1', 'PUBLISHING', {}, 0, 1);
g.startGenerationDiagnostic('run-2', 'session-b', true);
test('interrupted staged publish is preserved as previous', () => {
    const r = g.readGenerationDiagnostics().previous;
    assert.equal(r.lastStage, 'PUBLISHING'); assert.equal(r.publishedCount, 1); assert.equal(r.draftCount, 3); assert.equal(r.completed, false);
});
g.markGenerationDiagnostic('run-1', 'GEN_FINALLY', { completed: true });
test('late previous run cannot overwrite active run', () => assert.equal(g.readGenerationDiagnostics().current.lastStage, 'GEN_TRIGGERED'));
g.markGenerationDiagnostic('run-2', 'PARSE_DONE', {}, 2);
g.markGenerationDiagnostic('run-2', 'PUBLISHING', {}, 0, 2);
g.markGenerationDiagnostic('run-2', 'PUBLISH_DONE');
test('publish done remains incomplete until finally', () => {
    const r = g.readGenerationDiagnostics().current;
    assert.equal(r.lastStage, 'PUBLISH_DONE'); assert.equal(r.publishedCount, 2); assert.equal(r.completed, false);
});
g.markGenerationDiagnostic('run-2', 'GEN_FINALLY', { completed: true });
g.startGenerationDiagnostic('run-3', 'session-c', false);
test('successful run does not erase previous incomplete evidence', () => assert.equal(g.readGenerationDiagnostics().previous.runId, 'run-1'));
g.markGenerationDiagnostic('run-3', 'GEN_ERROR', { errorName: 'NetworkError' });
g.markGenerationDiagnostic('run-3', 'GEN_FINALLY', { completed: true });
test('finally preserves error class and marks completion', () => {
    const r = g.readGenerationDiagnostics().current;
    assert.equal(r.errorName, 'NetworkError'); assert.equal(r.completed, true);
});
const runtime = load('lib/chat-runtime-diagnostics.ts');
const r = runtime.api;
const photo = r.startChatRuntimeDiagnostic('a', 'PHOTO_UPLOAD', 'PHOTO_SELECTED', { fileBytes: 8192, mime: 'image/png', content: 'secret', prompt: 'secret', apiKey: 'secret' });
r.markChatRuntimeDiagnostic(photo, 'PHOTO_STORE_BEGIN');
test('photo crash breadcrumb stores only allowed metadata', () => {
    const record = r.readChatRuntimeDiagnostics().current;
    assert.equal(record.stage, 'PHOTO_STORE_BEGIN'); assert.equal(record.completed, false);
    assert.deepEqual(Object.keys(record.metadata).sort(), ['fileBytes', 'mime']);
    assert.ok(![...runtime.records.values()].join('').includes('secret'));
});
const call = r.startChatRuntimeDiagnostic('b', 'VOICE_CALL', 'CALL_TRIGGERED', { initiator: 'character' });
r.markChatRuntimeDiagnostic(call, 'CALL_SCREEN_MOUNTED');
test('new call preserves incomplete photo evidence', () => assert.equal(r.readChatRuntimeDiagnostics().previous.stage, 'PHOTO_STORE_BEGIN'));
const panel = r.startChatRuntimeDiagnostic('c', 'STICKER_PANEL', 'STICKER_PANEL_OPEN', { packCount: 5, activePackStickerCount: 20 });
test('incomplete incoming call becomes previous', () => assert.equal(r.readChatRuntimeDiagnostics().previous.stage, 'CALL_SCREEN_MOUNTED'));
r.markChatRuntimeDiagnostic(panel, 'STICKER_PANEL_CLOSED', true);
r.startChatRuntimeDiagnostic('d', 'STICKER_PANEL', 'STICKER_PANEL_OPEN');
test('successful panel close does not erase incomplete call', () => assert.equal(r.readChatRuntimeDiagnostics().previous.operationId, call));
test('late old operation cannot overwrite current operation', () => {
    r.markChatRuntimeDiagnostic(call, 'CALL_ENDED', true);
    assert.equal(r.readChatRuntimeDiagnostics().current.stage, 'STICKER_PANEL_OPEN');
});
for (const fixture of [generation, runtime]) {
    fixture.fail();
    test('disabled localStorage never throws or blocks business continuation', () => {
        if (fixture === generation) {
            g.startGenerationDiagnostic('safe', 'a', false); g.markGenerationDiagnostic('safe', 'GEN_FINALLY', { completed: true });
            assert.equal(g.readGenerationDiagnostics().current, null);
        } else {
            const id = r.startChatRuntimeDiagnostic('a', 'PHOTO_UPLOAD', 'PHOTO_SELECTED'); r.markChatRuntimeDiagnostic(id, 'PHOTO_DONE', true);
            assert.equal(r.readChatRuntimeDiagnostics().current, null);
        }
    });
}
console.log(JSON.stringify({ checks }));
