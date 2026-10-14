'use strict';
// Component-wiring and guard behavior test. Full React ChatRoom, Chromium and
// WKWebView validation remains the required Codex deployment gate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const room = fs.readFileSync(path.join(root, 'components/chat/chat-room.tsx'), 'utf8');
const guardCode = fs.readFileSync(path.join(root, 'lib/chat-user-layout-intent.ts'), 'utf8');

assert.match(room, /voiceTranscript: true, beforeTranslationToggle/, 'transcript translation must inherit the v2.1 guard');
assert.match(room, /finishVoiceTranscriptLayoutRef\.current\s*=\s*beforeVoiceTranscriptToggle\(m\.id\)/, 'menu toggle must start anchor guard before state update');
assert.match(room, /\}, \[voiceTextIds\]\);/, 'transcript height must be stabilized in layout effect after React commit');
assert.match(room, /if \(imessagePresentation\) \{\s*finishVoiceTranscriptLayoutRef/, 'non-iMessage voice toggles must not use the iMessage guard');
assert.doesNotMatch(room, /beginChatUserLayoutChange\(scrollRef\.current, e\.currentTarget/, 'portaled menu must not be treated as a scrolling-pane descendant');

const block = room.match(/    const beforeVoiceTranscriptToggle = useCallback\(\(messageId: string\) => \{[\s\S]*?\n    \}, \[scrollStability\]\);/);
assert.ok(block, 'voice anchor resolver must be present');
assert.match(block[0], /element\.dataset\.msgId === messageId/, 'identify actual message by stable message ID');

class FakeElement {}
function compileAndRun(source, scope) {
  const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code, scope);
}
for (const supportsAnchor of [true, false]) {
  const guardExports = {};
  compileAndRun(guardCode, {
    exports: guardExports,
    Element: FakeElement,
    CSS: { supports: () => supportsAnchor },
    window: {getSelection: () => ({toString: () => ''})},
  });
  const {beginChatUserLayoutChange: begin, releaseChatUserLayoutHold: release} = guardExports;
  let scrollTop = 2136;
  let scrollHeight = 3010;
  let writes = 0;
  let suspended = 0;
  const listeners = new Map();
  const styleProperties = new Map();
  const style = {
    getPropertyValue: k => styleProperties.get(k)?.value ?? '',
    getPropertyPriority: k => styleProperties.get(k)?.priority ?? '',
    setProperty: (k, value, priority='') => styleProperties.set(k, {value, priority}),
    removeProperty: k => styleProperties.delete(k),
  };
  const other = Object.assign(new FakeElement(), {dataset: {msgId: 'other'}, isConnected: true});
  const bubble = Object.assign(new FakeElement(), {
    dataset: {msgId: 'voice-1'},
    isConnected: true,
    getBoundingClientRect: () => ({top: 2850.28125-scrollTop}),
    closest: selector => selector==='[data-msg-id]' ? bubble : null,
  });
  const scroller = {
    isConnected: true,
    style,
    clientHeight: 874,
    get scrollHeight() { return scrollHeight; },
    get scrollTop() { return scrollTop; },
    set scrollTop(value) { writes++; scrollTop = Math.max(0, Math.min(value,scrollHeight-874)); },
    querySelectorAll: selector => {assert.equal(selector, '[data-msg-id]'); return [other, bubble];},
    contains: node => node === bubble,
    getBoundingClientRect: () => ({right: 430}),
    addEventListener: (name, f) => { if(!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(f); },
    removeEventListener: (name, f) => listeners.get(name)?.delete(f),
  };
  const callbackExports = {};
  compileAndRun(block[0] + '\nexports.beforeVoiceTranscriptToggle = beforeVoiceTranscriptToggle;', {
    exports: callbackExports,
    useCallback: callback => callback,
    scrollRef: {current: scroller},
    scrollStability: {suspend: () => {suspended++;}},
    beginChatUserLayoutChange: begin,
  });
  const start = callbackExports.beforeVoiceTranscriptToggle;
  assert.equal(start('missing'), undefined, 'stale message ID must not trigger scroll manipulation');
  for (let i=0;i<40;i++) {
    const beforeTop = bubble.getBoundingClientRect().top;
    const done = start('voice-1');
    assert.equal(typeof done,'function','portaled menu must resolve live bubble');
    // Full height changes are permitted: browser may scroll to preserve bottom.
    const delta = i%2===0 ? 85 : -85;
    scrollHeight += delta;
    scrollTop += delta; // Native scroll/anchoring adjustment, bypassing JS setter.
    const beforeWrites = writes;
    done(); // useLayoutEffect after DOM commit, before paint
    assert.equal(bubble.getBoundingClientRect().top, beforeTop, `toggle ${i}: position remains stable`);
    assert.equal(writes-beforeWrites,1, 'only a real shift is corrected');
    // Non-moving content changes must never cause gratuitous setter writes.
    const stable = start('voice-1');
    const stableWrites = writes;
    stable();
    assert.equal(writes,stableWrites);
  }
  assert.equal(suspended,80,'voice toggles suspend bottom following once per start');
  if(supportsAnchor) assert.equal(style.getPropertyValue('overflow-anchor'), 'none');
  release(scroller);
  assert.equal(style.getPropertyValue('overflow-anchor'), '', 'original inline style restored');
  for (const x of listeners.values()) assert.equal(x.size,0,'guard event listeners released');
}
console.log('PASS voice transcript v2.2: wiring + portal target + 80 layout cycles (CSS support and no CSS support)');
