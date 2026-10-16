const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '..', 'lib/chat-entry-visual-readiness.ts'), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function('module', 'exports', code)(mod, mod.exports);
const { createChatEntryVisualReadiness, MAX_CHAT_ENTRY_VISUAL_WAIT_MS } = mod.exports;
const frame = (now, overrides={}) => ({now, expectsBridge:true, bridgeReady:false,scrollHeight:1600, clientHeight:700,scrollTop:900,tailTop:600,tailBottom:650,...overrides});
let t=createChatEntryVisualReadiness(0);
assert.deepEqual(t.sample(frame(16)), {ready:false});
assert.deepEqual(t.sample(frame(32)), {ready:false});
assert.deepEqual(t.sample(frame(48,{bridgeReady:true})), {ready:false});
assert.deepEqual(t.sample(frame(64,{bridgeReady:true,tailTop:594,tailBottom:644,scrollHeight:1606})), {ready:false}, 'post-Bridge 6px geometry drift must reset readiness');
assert.deepEqual(t.sample(frame(80,{bridgeReady:true,tailTop:594,tailBottom:644,scrollHeight:1606})), {ready:false});
assert.deepEqual(t.sample(frame(96,{bridgeReady:true,tailTop:594,tailBottom:644,scrollHeight:1606})), {ready:true,timedOut:false,reason:'stable'});
// Changing the rendered tail on the second quiet frame must not release.
t=createChatEntryVisualReadiness(0);
assert.equal(t.sample(frame(16,{bridgeReady:true})).ready,false);
assert.equal(t.sample(frame(32,{bridgeReady:true})).ready,false);
assert.equal(t.sample(frame(48,{bridgeReady:true,tailTop:594})).ready,false);
assert.equal(t.sample(frame(64,{bridgeReady:true,tailTop:594})).ready,false);
assert.equal(t.sample(frame(80,{bridgeReady:true,tailTop:594})).ready,true);
// Non-iMessage path remains nearly instantaneous, no bridge dependency.
t=createChatEntryVisualReadiness(0);
assert.equal(t.sample(frame(16,{expectsBridge:false,bridgeReady:true})).ready,false);
assert.equal(t.sample(frame(32,{expectsBridge:false,bridgeReady:true})).ready,true);
// Never turn a permanently missing Bridge into a 1-second message blank.
t=createChatEntryVisualReadiness(0);
assert.equal(t.sample(frame(16)).ready,false);
assert.deepEqual(t.sample(frame(MAX_CHAT_ENTRY_VISUAL_WAIT_MS+1)), {ready:true,timedOut:true,reason:'bridge-unavailable'});
t=createChatEntryVisualReadiness(0);
assert.equal(t.sample(frame(16,{bridgeReady:true})).ready,false);
assert.deepEqual(t.sample(frame(MAX_CHAT_ENTRY_VISUAL_WAIT_MS+1,{bridgeReady:true,tailTop:593})),{ready:true,timedOut:true,reason:'geometry-unsettled'});
// Check application contracts without requiring a full browser environment.
const room=fs.readFileSync(path.join(__dirname,'..','components/chat/chat-room.tsx'),'utf8');
assert.match(room,/createChatEntryVisualReadiness\(performance\.now\(\)\)/);
assert.match(room,/wrapper\.classList\.contains\('im-single'\)/);
assert.match(room,/wrapper\.classList\.contains\('im-group'\)/);
assert.match(room,/if \(scrollStability\.isPinned\(\)\)/);
assert.match(room,/cancelAnimationFrame\(frame\)/);
assert.doesNotMatch(room,/setTimeout\(\(\) => setEntryPositionReady/);
console.log('entry visual readiness: PASS (late Bridge 6px drift, stable gate, fallback, regular rooms)');
