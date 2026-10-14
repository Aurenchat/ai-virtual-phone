#!/usr/bin/env node
/** Structural regression: stop showing default-expanded translations for a frame. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const hook = read('components/chat/imessage-presentation.tsx');
const bubble = read('components/chat/message-bubble.tsx');
const begin = hook.indexOf('export function useImessagePresentation(');
const end = hook.indexOf('const interactive =', begin);
assert(begin >= 0 && end > begin, 'iMessage CSS opt-in hook missing');
const activation = hook.slice(begin, end);
assert.match(activation, /useLayoutEffect\(\(\) => \{/,
  'iMessage opt-in must be resolved in the pre-paint layout phase');
assert.doesNotMatch(activation, /requestAnimationFrame\s*\(/,
  'A rAF after paint re-exposes initial translation and layout flicker');
assert.match(activation, /getComputedStyle\(ref\.current\)/,
  'Opt-in must read the actual scoped session CSS');
for (const k of ['--im-theme','--im-presentation'])
  assert(activation.includes(k), `Missing ${k} opt-in guard`);
const block = bubble.slice(bubble.indexOf('export const BilingualTextBlock'),bubble.indexOf('function TextBubble'));
assert.match(block, /useLayoutEffect\(\(\) => \{\s*if \(presentation\.enabled\) setExpanded\(false\);\s*\}, \[presentation\.enabled\]\)/,
  'Theme activation must collapse translations before paint but not upon every user toggle');
assert.match(block, /if \(!presentation\.enabled\) setExpanded\(defaultExpanded\)/,
  'Other themes must retain their default expand option');
assert.match(block, /onToggle=\{target => \{/,
  'Manual iMessage translation toggle must remain interactive');
assert.match(block, /if \(presentation\.enabled\) return \(/,
  'iMessage presentation branch must remain intact');
console.log('PASS: iMessage pre-paint activation, scoped opt-in, default state and manual toggle');
