const fs = require('node:fs');
const cp = require('node:child_process');
const ts = require('typescript');
const vm = require('node:vm');
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const historical = path => cp.execFileSync('git', ['show', '0389dd2:' + path], { encoding: 'utf8', maxBuffer: 20e6 });
function fixture(M = 100, S = 5) {
    const sessions = Array.from({ length: S }, (_, i) => ({ id: 's' + i, contactId: 'c' + i, isGroup: i === S - 1, participantIds: ['c0', 'c1'], unreadCount: 0, isPinned: false, updatedAt: '2026-01-01T00:00:00.000Z' }));
    const messages = Array.from({ length: M }, (_, i) => ({ id: 'm' + i, sessionId: 's' + (i % S), order: Math.floor(i / S), createdAt: new Date(1700000000000 + i * 1000).toISOString(), role: i % 2 ? 'assistant' : 'user', content: 'text ' + i, status: 'sent' }));
    return { messages, sessions, contacts: sessions.filter(s => !s.isGroup).map(s => ({ id: 'contact-' + s.id, characterId: s.contactId, addedAt: s.updatedAt })) };
}
const sourceCache = new Map();
function load(data = fixture(), baseline = false) {
    const writes = [], events = [], listeners = new Map(), disk = new Map(data.messages.map(m => [m.id, m]));
    const window = { dispatchEvent(e) { events.push(e); for (const fn of listeners.get(e.type) || []) fn(e); }, addEventListener(k, fn) { if (!listeners.has(k)) listeners.set(k, []); listeners.get(k).push(fn); }, removeEventListener() {} };
    let seq = 0;
    const sandbox = vm.createContext({ console, window, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } }, process: { env: { NODE_ENV: 'test' } }, setTimeout, clearTimeout, queueMicrotask, Date, Math: Object.assign(Object.create(Math), { random: () => (++seq / 10000) }), Map, Set });
    const run = (source, require) => { const exports = {}; vm.compileFunction(compile(source), ['exports', 'require'], { parsingContext: sandbox })(exports, require); return exports; };
    const protocol = run(fs.readFileSync('lib/text-tool-protocol.ts', 'utf8'), () => { throw Error('unexpected protocol import'); });
    const db = { initChatDb: async () => structuredClone(data), chatDb: { messages: { get: async id => disk.get(id), put: async m => { disk.set(m.id, m); writes.push(['put', m]); } } } };
    for (const name of ['dbPutMessage', 'dbPutMessages', 'dbDeleteMessage', 'dbDeleteMessagesBySession', 'dbDeleteMessagesByIds', 'dbPutSessions', 'dbPutContacts', 'dbDeleteSession', 'dbReplaceContacts', 'dbReplaceSessions']) db[name] = x => writes.push([name, x]);
    const mocks = {
        './chat-db': db, './settings-storage': { resolveUserIdentity: () => ({ name: data.userName || 'User' }) },
        './character-storage': { loadCharacters: () => data.sessions.map(s => ({ id: s.contactId, name: data.characterName || s.contactId })) },
        './kv-db': { kvGet: () => null, kvSet() {}, registerKvMigration() {} },
        './chat-plugin-hooks': { emitChatPluginEvent: (type, detail) => events.push({ type, detail }), runChatPluginTransformSync: (_, p) => p },
        './text-tool-protocol': protocol, './rich-message-parser': { parseAIResponse: () => [] },
        './chat-status-region': { captureCurrentStatusRendererId: () => null },
    };
    const key = baseline ? 'baseline' : fs.statSync('lib/chat-storage.ts').mtimeMs;
    if (!sourceCache.has(key)) sourceCache.set(key, baseline ? historical('lib/chat-storage.ts') : fs.readFileSync('lib/chat-storage.ts', 'utf8'));
    const core = run(sourceCache.get(key) + '\nexports.__audit={all:()=>_messagesCache,isSessionPreviewCandidate,normalizeLegacyTextToolHistory,restoreContactsForPrivateSessions};', p => { if (!mocks[p]) throw Error(p); return mocks[p]; });
    return { core, writes, events, disk, window };
}
module.exports = { load, fixture, historical, compile };
