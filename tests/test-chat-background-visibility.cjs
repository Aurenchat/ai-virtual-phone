'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles/chat.css'), 'utf8');
const component = fs.readFileSync(path.join(root, 'components/chat/chat-room.tsx'), 'utf8');
const stripped = css.replace(/\/\*[\s\S]*?\*\//g,'');
for (const match of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!match[1].includes('.chat-room-wrapper[data-loading]')) continue;
    assert.doesNotMatch(match[2], /(?:^|;)\s*(?:opacity|visibility|display|filter)\s*:/i,
        'Wallpaper-loading must not hide the entire chat room');
}
assert.match(component, /\bbgLoading\b/);
assert.match(component, /["']data-loading["']/);
assert.match(component, /["']data-has-bg-image["']/);
assert.match(stripped, /\.chat-room-wrapper\[data-settings-open\]\s+\.chat-room-main-pane\s*\{\s*visibility:\s*hidden;/);
console.log('PASS: loading is not full-room invisibility; settings visibility remains distinct');
