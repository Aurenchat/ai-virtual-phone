#!/usr/bin/env node
'use strict';
// Read-only post-application source contract checks, not a substitute for tsc/build/UI tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || process.cwd());
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const checks = [];
function check(name, run) { run(); checks.push(name); console.log(`PASS ${name}`); }
const storage = read('lib/chat-storage.ts');
const list = read('components/chat/chat-message-list.tsx');
const room = read('components/chat/chat-room.tsx');
const secure = read('components/secure-line/secure-line-app.tsx');
const timeline = read('lib/short-term-assembler.ts');
const engine = read('lib/chat-engine.ts');
const followup = read('lib/follow-up-service.ts');
const desktop = read('components/desktop-shell.tsx');
const settings = read('components/chat/chat-settings-panel.tsx');
check('legacy sessions remain private / channel stored in native session', () => {
  assert.match(storage, /channel\?: ChatChannel/);
  assert.match(storage, /session\.channel === "secure" \? "secure" : "private"/);
  assert.match(storage, /getChatSessionChannel\(session\).*?\$\{session\.contactId\}/s);
});
check('secure session add uses existing character, not ChatContact', () => {
  assert.match(storage, /createOrGetSession\(contactId: string, channel: ChatChannel = "private"\)/);
  assert.match(storage, /getChatSessionChannel\(s\) === channel/);
  assert.match(secure, /createOrGetSession\(characterId, "secure"\)/);
  assert.doesNotMatch(secure, /\baddChatContact\s*\(/);
  assert.match(storage, /privateSessionsWithMessages[\s\S]*?getChatSessionChannel\(session\) === "private"/);
});
check('both channels are distinct in storage and duplicate merge', () => {
  assert.match(read('lib/chat-session-merge.ts'), /direct:\$\{getChatSessionChannel\(session\)\}:\$\{session\.contactId\}/);
  assert.match(list, /getChatSessionChannel\(s\) === "secure"/);
  assert.match(read('components/chat/phone-chat-app.tsx'), /getChatSessionChannel\(s\) === "private"/);
});
check('Secure Line opens the exact native ChatRoom and reuses chat CSS', () => {
  assert.match(secure, /<ChatRoom session=\{active\}/);
  assert.match(secure, /SessionCustomCSS css=\{chatAppCSS\}/);
  assert.match(room, /session\.customCSS/);
  assert.match(room, /<ChatPluginSlot/);
  assert.match(storage, /runChatPluginTransformSync\("message.beforePersist"/);
  assert.match(storage, /emitChatPluginEvent\("message.persisted"/);
});
check('same native chat binding/identity and exact raw history', () => {
  assert.match(engine, /resolveBinding\(bindings, character\.id, resolvedAppId\)/);
  assert.match(engine, /resolveUserIdentity\(character\.id, resolvedAppId\)/);
  assert.match(engine, /excludeDirectSessionId: session\.id/);
  assert.match(engine, /当前通信渠道为 Secure Line/);
  assert.match(room, /generateChatCompletion\(session, latestMessages/);
  assert.match(timeline, /const directSessions = sessions\.filter/);
  assert.match(timeline, /e\.sessionId !== options\?\.excludeDirectSessionId/);
  assert.match(timeline, /chatChannel: channel/);
  assert.match(timeline, /Secure Line" : "私聊"/);
});
check('secure deletion cannot remove private friendship or memory', () => {
  assert.match(settings, /!session\.isGroup && getChatSessionChannel\(session\) === "private"/);
  assert.match(settings, /删除 Secure Line 联系人/);
  assert.match(settings, /removeChatSessionCompletely\(session\.id\)/);
});
check('secure proactive messages and wrong-app notifications excluded', () => {
  assert.match(followup, /secure_background_disabled/);
  assert.match(followup, /getChatSessionChannel\(session\) === "secure"/);
  assert.match(desktop, /getChatSessionChannel\(session\) === "secure"/);
  assert.match(read('lib/push-outbox-client.ts'), /drop|secure session never consumes unsolicited server replies/i);
});
check('desktop native entry and existing database backup', () => {
  assert.match(read('lib/desktop-config.ts'), /secure_line/);
  assert.match(read('components/icon-glyph.tsx'), /secure_line:/);
  assert.match(desktop, /<SecureLineApp onClose=/);
  assert.match(read('lib/data-management/modules.ts'), /AiPhoneChatDB/);
  assert.match(read('lib/chat-db.ts'), /sessions: "id, contactId"/);
  assert.match(read('lib/memory-summarizer.ts'), /loadNativeTimeline\(characterId/);
});
check('no Mask, duplicate engine, new DB, or reload', () => {
  assert.doesNotMatch(secure, /\bMask\b|secure_line_user_identity|new Dexie|window\.location\.reload/i);
  assert.doesNotMatch(secure, /generateChatCompletion\s*\(/);
  assert.doesNotMatch(secure, /chatDb\.sessions\.where/);
});
console.log(`\n${checks.length} Secure Line source contract checks passed.`);

check('current direct history always excluded even when offline includes direct entries', () => {
  assert.match(timeline, /&& e\.sessionId !== options\?\.excludeDirectSessionId/);
  assert.doesNotMatch(timeline, /!skipDirectChatEntries \|\| e\.sessionId !==/);
  assert.match(timeline, /directChatActivationSessionId: options\?\.excludeDirectSessionId/);
  assert.match(timeline, /session\.id === options\.directChatActivationSessionId/);
});
check('upstream prune and deleted-friend safeguards retained', () => {
  for (const text of ['historyPrunedMessageIds','reconcileNativeMessage','persistCachedMessageUpdate','assertChatHistoryWritable','removedByUser.has(session.contactId)']) assert(storage.includes(text),text);
  // main 5881a586 moved pruning to the native profile settings entry.
  const profile = read("components/chat/user-profile-panel.tsx");
  assert.match(profile, /showHistoryPrune && <ChatHistoryPruneDialog/);
  assert.match(profile, /setShowHistoryPrune\(true\)/);
  assert.doesNotMatch(list, /<ChatHistoryPruneDialog/);
  assert.match(read('lib/chat-history-prune.ts'), /assertLocalOnlySafe/);
  assert.match(read('lib/chat-history-prune.ts'), /isWeixinSyncPauseAwaitingReload/);
});
