// Lease-ownership regression smoke for ChatRoom nonblocking entry v1.1.
// This test is deterministic Node-level evidence, NOT a real browser paint test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const code = ts.transpileModule(read('lib/chat-background-hot.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function('module', 'exports', code)(mod, mod.exports);
const { acquireHotChatBackground, publishHotChatBackground, forgetHotChatBackground } = mod.exports;

assert.equal(acquireHotChatBackground('chat_bg_A'), null, 'cold first entry has no warm URL');

// Reproduction: hinted blob:old previously rendered before a passive effect
// acquired it. At 7.85s idle age a timer can fire while acquire is delayed.
const state = { url: 'blob:old', alive: true, users: 0, idleTimerActive: true, revoked: false };
function acquireLease() {
  if (!state.alive) return null;
  state.users++;
  state.idleTimerActive = false;
  let released = false;
  return { url: state.url, release: () => {
    if (released) return;
    released = true;
    state.users--;
    state.idleTimerActive = state.users === 0;
  } };
}
const idleRetire = () => {
  if (state.idleTimerActive && state.users === 0) {
    state.alive = false;
    state.revoked = true;
    forgetHotChatBackground('chat_bg_A', state.url);
  }
};
publishHotChatBackground('chat_bg_A', state.url, acquireLease);
const warm = acquireHotChatBackground('chat_bg_A');
assert.equal(warm.url, 'blob:old');
assert.equal(state.users, 1, 'lease must be acquired BEFORE wallpaper CSS can reference URL');
idleRetire(); // equivalent to the timer expiring during 250ms delayed fallback
assert.equal(state.revoked, false, 'a live room lease prevents premature revoke');
assert.equal(warm.url, state.url);
warm.release();
idleRetire();
assert.equal(state.revoked, true);
assert.equal(acquireHotChatBackground('chat_bg_A'), null, 'retired URL cannot be acquired again');

// A stale factory cannot publish an unleased string; invalidation clears it.
let staleCalls = 0;
publishHotChatBackground('chat_bg_A', 'blob:stale', () => { staleCalls++; return null; });
assert.equal(acquireHotChatBackground('chat_bg_A'), null);
assert.equal(staleCalls, 1);
forgetHotChatBackground('chat_bg_A');
assert.equal(acquireHotChatBackground('chat_bg_A'), null);

// A -> B -> A: stale cleanup must not erase a newly published acquisition.
publishHotChatBackground('chat_bg_A', 'blob:A1', () => ({ url: 'blob:A1', release() {} }));
publishHotChatBackground('chat_bg_A', 'blob:A2', () => ({ url: 'blob:A2', release() {} }));
forgetHotChatBackground('chat_bg_A', 'blob:A1');
assert.equal(acquireHotChatBackground('chat_bg_A').url, 'blob:A2');
forgetHotChatBackground('chat_bg_A', 'blob:A2');
assert.equal(acquireHotChatBackground('chat_bg_A'), null);

// Contract/source checks: a URL is used only after an owned, validated lease.
const resource = read('lib/chat-background-resource.ts');
assert.match(resource, /publishHotChatBackground\(source, resource\.url, \(\) => \{/);
assert.match(resource, /resource\.revision !== getChatWallpaperRevision\(source\)/);
assert.match(resource, /resources\.get\(source\) !== resource/);
assert.match(resource, /return lease\(resource\)/);
assert.match(resource, /forgetHotChatBackground\(resource\.assetId, resource\.url\)/);
assert.match(resource, /forgetHotChatBackground\(assetId\)/);
const room = read('components/chat/chat-room.tsx');
assert.match(room, /useLayoutEffect\(\(\) => \{\s*const source = session\.backgroundImage/);
assert.match(room, /const warm = acquireHotChatBackground\(source\)/);
assert.match(room, /release = warm\.release;\s*resolve\(warm\.url\)/);
assert.doesNotMatch(room, /peekHotChatBackground/);
assert.match(room, /data-entry-positioning/);
assert.match(room, /createChatEntryVisualReadiness\(performance\.now\(\)\)/);
assert.match(room, /wrapper\.classList\.contains\('im-single'\)/);
assert.match(room, /wrapper\.classList\.contains\('im-group'\)/);
assert.match(room, /if \(scrollStability\.isPinned\(\)\)/);
const list = read('components/chat/chat-message-list.tsx');
assert.match(list, /onPointerDown=\{prewarmBackground\}/);
assert.doesNotMatch(list, /onMouseEnter=\{prewarmBackground\}/);
const css = read('styles/chat.css');
assert.match(css, /page-body\[data-entry-positioning\]\s*\{\s*visibility: hidden/);
console.log('entry nonblocking v1.2 leased-background smoke: PASS');
