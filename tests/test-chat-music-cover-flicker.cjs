#!/usr/bin/env node
/** Structural regression: de-risk WebKit music cover while retaining tail path. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root,'styles/chat.css'),'utf8');
const bridge = fs.readFileSync(path.join(process.env.FLOAT_IMESSAGE_THEME_DIR || path.join(root,'themes/imessage-native-day'),'iMessage-Message-Bridge.js'),'utf8');
const music = fs.readFileSync(path.join(root,'components/chat/music-share-bubble.tsx'),'utf8');
const selectors = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g));
const declaration = name => selectors.find(x => x[1].trim().endsWith(name))?.[2] || '';
const prefix = '.chat-room-wrapper:is(.im-single, .im-group) .im-bubble.chat-bubble-music-share';
const cover = declaration(prefix+'.im-geometry-ready .chat-music-share-cover');
assert.match(cover,/border-radius\s*:\s*24px 24px 0 0\s*;/,
  'Cover must keep the same rounded upper corners');
assert.match(cover,/clip-path\s*:\s*none\s*;/,
  'Cover must not duplicate the moving, full-card dynamic path');
const img = declaration(prefix+' .chat-music-share-cover > img');
assert.match(img,/transition\s*:\s*none\s*;/,
  'Only iMessage music cover opacity transition should be disabled');
assert.match(bridge,/bubble\.style\.setProperty\('--im-music-outline'/,
  'Bridge music surface path/tail must remain intact');
assert.match(bridge,/const musicShell\s*=\s*msg\?\.mediaType==='music_share'/,
  'Bridge music special shape must remain active');
assert.match(music,/img key=\{cover\} src=\{cover\}/,
  'Preserve original cover URL/React identity and loaded state');
assert.match(music,/data-cover-state=\{ready \? "loaded"/,
  'Do not bypass existing async cover state');
console.log('PASS: scoped music cover stabilization, SVG surface/tail, original image state');
