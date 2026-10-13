const fs=require('node:fs'),assert=require('node:assert/strict');
const room=fs.readFileSync('components/chat/chat-room.tsx','utf8'),css=fs.readFileSync('styles/chat.css','utf8');
const provider=room.match(/enabled: imessagePresentation && \(([^)]+)\) && !renderMsg\.mediaData\?\.readingQuote/);
assert(provider,'restricted provider missing');
const enabled=new Function('renderMsg','return ('+provider[1]+') && !renderMsg.mediaData?.readingQuote');
for(const [msg,expected] of [[{},true],[{mediaType:'quote'},true],[{mediaType:'audio'},false],[{mediaType:'image'},false],[{mediaType:'quote',mediaData:{readingQuote:{}}},false]])assert.equal(enabled(msg),expected);
assert.match(room,/!offlineMode && imessagePresentation \? \{ "data-im-presentation"/);
assert.match(css,/\.chat-app \.chat-room-wrapper\.chat-mode-online\[data-im-presentation\] > \.page-body\.chat-room-main-pane\s*\{[^}]*padding-top: calc\(var\(--page-header-safe-top,48px\) \+ var\(--im-nav-height,100px\) \+ 16px \+ var\(--chat-plugin-header-height,0px\)\)/);
assert.doesNotMatch(css,/data-im-presentation[^{}]*\{[^}]*opacity:\s*0/);
console.log('PASS restricted quote opt-in, reading/media exclusions, online-only prepaint padding');

assert.match(css,/data-im-presentation\] > \.page-header\.chat-room-main-pane \.page-header-content\s*\{[^}]*min-height: var\(--im-nav-height,100px\)/);
