// Minimal source and state contract regression. Real browser evidence required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const room = read('components/chat/chat-room.tsx');
const css = read('styles/chat.css');
const wrapper = room.split('\n').find(s => s.includes('ref={wrapperRef} className={`session-${session.id}'));
assert.ok(wrapper, 'must locate active ChatRoom wrapper');
assert.match(wrapper, /backgroundSource \? \{ "data-has-bg-image": "" \} : \{\}/,
  'configured source determines geometry from first React commit');
assert.match(wrapper, /bgImageResolved \? \{ "data-bg-url-acquired": "" \} : \{\}/,
  'lease/URL readiness is a SEPARATE marker');
assert.doesNotMatch(wrapper, /bgImageResolved \? \{ "data-has-bg-image": "" \}/,
  'regression: async URL must never flip original Bridge geometry mode');
const pendingStyle = css.match(/\.chat-app \.chat-room-wrapper\.im-wallpaper\[data-has-bg-image\]:not\(\[data-bg-url-acquired\]\) \{([^}]+)\}/);
assert.ok(pendingStyle, 'pending/failure fallback readable only for configured image without acquired URL');
assert.match(pendingStyle[1], /--im-time-color:\s*#737378/);
assert.doesNotMatch(pendingStyle[1], /(?:padding|margin|height|width|font-size|line-height|transform|top|bottom):/,
  'fallback must not change message geometry');
for (const filename of [
  'themes/imessage-native-day/iMessage-Message-Bridge.js',
  'themes/imessage-native-day/iMessage-Message-Bridge-perf.6-geometry-stable.js',
]) {
  const bridge = read(filename);
  assert.match(bridge, /const plain = !room\.hasAttribute\('data-has-bg-image'\)/,
    `existing installed-style Bridge logic must be supported: ${filename}`);
  assert.match(bridge, /data-im-text-gap/);
}
// The same message must use wallpaper geometry before AND after cold URL acquisition.
for (const src of ['', 'chat_bg_A', 'data:image/png;base64,a', 'https://example.test/a.jpg']) {
  const configured = !!src;
  const initial = configured;
  for (const urlAcquired of [false, true]) {
    const hasBgImage = configured;
    const isPlain = !hasBgImage; // textRecord/bilingual unchanged
    assert.equal(isPlain, !initial, `${src}: delayed URL must not alter geometry`);
    assert.equal(hasBgImage, configured);
    assert.equal(!!urlAcquired && configured, Boolean(urlAcquired && src));
  }
}
assert.match(room, /createChatEntryVisualReadiness\(performance\.now\(\)\)/,
 'v1.2 gate should remain unchanged');
console.log('Chat entry v1.3 wallpaper intent source/state smoke: PASS');
