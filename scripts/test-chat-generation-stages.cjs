// Executes actual prompt/request/background functions, with synthetic dependencies.
// No user DB, remote API or private data is read. Fixed pre-change comparison guards behavior.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const cp = require('node:child_process');
const ts = require('typescript');
let checks = 0;
const BASELINE = '0f569f59dac19e5ab4d4a69c62eac7f3e20f9963';
const check = (name, fn) => { fn(); checks++; console.log('PASS ' + name); };
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const json = value => JSON.parse(JSON.stringify(value));
function bind(file, names, context, baseline = false) {
    const source = baseline ? cp.execFileSync('git', ['show', BASELINE + ':' + file], { encoding: 'utf8' }) : fs.readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const functions = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text));
    assert.equal(functions.length, names.length, file + ' actual functions found');
    vm.runInContext(compile(functions.map(n => n.getText(ast)).join('\n')), context);
}
function diagnostic() {
    const records = new Map(), writes = [];
    let disabled = false;
    const localStorage = {
        getItem(key) { if (disabled) throw Error('disabled'); return records.get(key) || null; },
        setItem(key, value) { if (disabled) throw Error('disabled'); writes.push({ key, value }); records.set(key, value); },
    };
    const exports = {};
    vm.runInNewContext(compile(fs.readFileSync('lib/chat-generation-diagnostics.ts', 'utf8')), { exports, localStorage, Date, Math });
    return { api: exports, records, writes, disable: () => { disabled = true; } };
}
function fixture(baseline = false) {
    const diag = diagnostic(), bodies = [], events = [], saved = [], delays = [];
    const session = { id: 'synthetic-session', contactId: 'synthetic-character', isGroup: false };
    const history = Array.from({ length: 6906 }, (_, i) => ({ id: 'm' + i, sessionId: session.id, role: 'user', content: 'PRIVATE_CHAT_BODY', createdAt: '2026-10-09T00:00:00.000Z', mediaUrl: 'data:image/png;base64,PRIVATE_IMAGE' }));
    const config = { id: 'api', provider: 'openai', defaultModel: 'synthetic', apiKey: 'PRIVATE_API_KEY' };
    const character = { id: session.contactId, name: 'PRIVATE_CARD', avatar: null };
    const identity = x => x;
    const noop = () => {};
    const ctx = vm.createContext({ exports: {}, console: { log: noop, warn: noop, error: noop }, Error, DOMException, AbortController,
        setTimeout, clearTimeout, Date, Math, ...diag.api,
        loadCharacters: () => [character], loadBindingConfig: () => ({}), resolveBinding: () => ({ apiConfigId: 'api' }),
        loadApiConfigs: () => [config], loadPresets: () => [], loadWorldBooks: () => [], loadRegexes: () => [],
        resolveUserIdentity: () => ({ name: 'PRIVATE_IDENTITY' }), mergeAppTags: tags => tags,
        buildCharacterTimeContext: () => ({}), getPromptTimestampOptionsForTimeContext: () => ({}),
        loadMemoryConfig: () => ({ shortTermTokenBudget: 50000, longTermTokenBudget: 50000, coreMemoryTokenBudget: 50000 }),
        getEnabledTools: () => [], presetIncludesToolsMacro: () => false, nativeToolProtocolForConfig: () => null,
        readMemoryRevisions: async () => ({}),
        prepareShortTermContext: (_id, _app, options = {}) => ({ truncatedHistory: (options.history || []).slice(-10), recentBlocks: [], unifiedRecentItems: Array(12).fill({}), wbActivationContext: 'PRIVATE_MEMORY_CONTEXT' }),
        applyVisionImagePromptLimit: identity, retrieveMemoriesForPrompt: async () => Array(2).fill({ content: 'PRIVATE_MEMORY' }),
        retrieveCoreMemoriesForPrompt: async () => [{ content: 'PRIVATE_CORE' }],
        buildMusicLocalMacro: async () => '', buildMusicCloudMacro: async () => '', formatLongTermMemories: () => 'PRIVATE_LONG', formatCoreMemories: () => 'PRIVATE_CORE',
        buildCalendarScheduleMarker: () => '', getWeekStartIso: () => '', getCurrentCalendarScheduleForPrompt: () => '',
        isNeteaseConfigured: () => false, runChatPluginTransform: async (_hook, value) => value, buildChatPluginPromptFragments: () => '',
        formatCustomAppChatDirectivesForPrompt: () => '', buildScreenEffectPromptHint: () => '', formatToolsForPrompt: () => '',
        buildChatBilingualInstruction: () => '', getStatusRegionConfig: () => ({}), buildOfflineBilingualInstruction: () => '',
        getLatestCharacterStateValues: () => [], getCustomStickerNames: () => '', getCustomStickerExample: () => '', loadChatAppSettings: () => ({}),
        SHOPPING_SHARE_PURCHASE_TOOL_NAME: 'purchase', resolveStatusRegionSection: () => '', resolveStatusRegionExampleLine: () => '', resolveStatusRegionComposition: () => '', resolveStatusRegionFullExample: () => '',
        assemblePromptPayload: input => [{ role: 'system', content: 'PRIVATE_PROMPT' }, ...input.history], appendEmptyGenerateGuardMessage: noop,
        applyChatPluginLlmRequest: async (preset, messages) => ({ preset, messages }), applyChatPluginLlmResponse: async text => text,
        toLlmRequestMessages: identity, buildProviderRequest: (_config, _preset, messages, options) => ({ providerKind: 'openai', url: 'https://private.invalid/api', headers: { Authorization: 'PRIVATE_API_KEY' }, body: { messages, stream: !!options?.stream }, messagesForLog: messages }),
        publishDebugPromptSnapshot: noop, attachExternalAbort: () => noop, protectProviderBody: async body => body,
        fetch: async (url, options) => { bodies.push({ url, body: options.body }); return { ok: true, json: async () => ({ content: 'PRIVATE_RESPONSE' }) }; },
        parseProviderResponse: (_kind, data) => ({ content: data.content, toolCalls: [] }), pushApiLog: noop, apiLogChannelFor: () => ({}),
        readSseStream: async (_response, _kind, callbacks) => { for (let i = 0; i < 100; i++) await callbacks.onDelta('x'); return { content: 'PRIVATE_RESPONSE', rawResponse: 'PRIVATE_RESPONSE' }; },
        emitChatPluginEvent: noop, stripHallucinatedTimestamps: identity, MacroEngine: class {}, getActiveAppTags: () => [], applyOutputRegex: identity,
        maybeAppendShortcutCapability: noop, getMaxToolRounds: () => 1, isSessionStreamingEnabled: () => false,
        stripPresetTexts: identity, parseActionTags: text => ({ cleanText: text, actions: [] }), stripStateAndInnerForPrompt: identity,
        throwIfAborted: signal => { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); }, incrementEventCounter: noop, maybeRunSummarization: async () => {},
        backgroundReplyFiringSet: new Set(), backgroundGeneratingSessions: new Set(), cancelledBackgroundSessions: new Set(),
        firingSet: new Set(), cancelledWhileFiring: new Set(), clearFollowUpSchedule: noop, startBailoutHeartbeat: () => noop, cancelFollowUpBailout: noop,
        loadChatSessions: () => [session], loadChatMessages: () => history, isBackgroundGenerationCancelled: () => false,
        scheduleFollowUp: noop, flattenCompletionResult: result => result.parts.map(p => p.text).join(''),
        window: { dispatchEvent: event => events.push(event) }, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
        BACKGROUND_MESSAGE_STAGGER_MS: 800, MAX_FOLLOW_UPS: 3, delay: async ms => { delays.push(ms); },
        parseAIResponse: () => ({ parts: [1, 2, 3].map(i => ({ content: 'PRIVATE_RESPONSE_' + i })), stateValues: [], freshStateValues: [], statusPanel: '', innerMonologue: '' }),
        isCustomStatusRegionActive: () => false, resolveFollowUpSenderName: () => 'PRIVATE_CARD', canCarryFollowUpPanel: () => true,
        createResponseBatchId: () => 'synthetic-batch',
        buildGeneratedFollowUpImageMessage: identity, isPendingChatGeneratedImageMessage: () => false,
        pushChatMessage: message => { const row = { ...message, id: 'saved-' + saved.length }; saved.push(row); return row; },
        bgSetTimeout: noop, dispatchChatMessageNotice: noop,
        require: file => { if (file.includes('push-bailout-client')) return { armReplyBailout: async () => null }; if (file.includes('browser-notification')) return { sendBrowserNotification: noop }; throw Error(file); },
    });
    vm.runInContext('class ChatEngineError extends Error {}', ctx);
    bind('lib/llm-http.ts', ['fetchLlmPayload'], ctx, baseline);
    bind('lib/chat-engine.ts', ['buildChatPromptMessages', 'sendLLMRequest', 'sendLLMStreamRequest', 'sendLLMToolRequest', 'generateChatCompletion', 'generateChatCompletionCore'], ctx, baseline);
    bind('lib/follow-up-service.ts', ['startBackgroundDiagnostic', 'requestBackgroundChatReply', 'fireFollowUp', 'generateBackgroundCompletionRounds', 'saveBackgroundCompletionRounds', 'parseAndSaveResponse', 'dispatchBackgroundMessagesOneByOne'], ctx);
    const start = id => { diag.api.startGenerationDiagnostic(id, session.id, false); diag.api.markGenerationDiagnostic(id, 'HISTORY_LOADED', { historyCount: history.length }); };
    const run = id => ctx.generateChatCompletion(session, history, { diagnosticRunId: id, appTags: ['chat', 'text'] }, { onTextPart: text => diag.api.markGenerationDiagnostic(id, 'RESPONSE_RECEIVED', { rawLength: text.length }) });
    return { ctx, diag, bodies, events, saved, delays, session, history, config, start, run };
}
async function main() {
    const f = fixture(); f.start('success');
    const result = await f.run('success');
    const r = f.diag.api.readGenerationDiagnostics().current;
    check('actual single-chat prompt/request succeeds with 6906-row history', () => {
        assert.equal(result.parts.length, 1); assert.equal(r.historyCount, 6906); assert.equal(r.survivingHistoryCount, 10);
        assert.equal(r.survivingRecentItemCount, 12); assert.equal(r.longTermSelectedCount, 2); assert.equal(r.coreMemorySelectedCount, 1);
        assert.equal(r.shortTermBudget, 50000); assert.equal(r.providerRequestStarted, true); assert.equal(r.streaming, false); assert.equal(r.llmMessageCount, 11);
        for (const stage of ['CONTEXT_PREP_BEGIN', 'SHORT_TERM_READY', 'LONG_TERM_READY', 'CORE_MEMORY_READY', 'PROMPT_ASSEMBLED', 'PROVIDER_PAYLOAD_BEGIN', 'PROVIDER_REQUEST_BEGIN', 'PROVIDER_RESPONSE_RECEIVED']) assert.equal(typeof r.stageTimes[stage], 'number');
    });
    const old = fixture(true); old.start('baseline');
    const oldResult = await old.run('baseline');
    check('HEAD comparison: exact provider body and generated result unchanged', () => { assert.deepEqual(f.bodies, old.bodies); assert.deepEqual(json(result), json(oldResult)); });
    for (const x of [f, old]) {
        x.start('proxy');
        const build = x.ctx.buildProviderRequest;
        x.ctx.buildProviderRequest = (...args) => ({ ...build(...args), serverProxy: true });
        await x.run('proxy');
    }
    check('server-proxy HEAD comparison: serialized envelope unchanged', () => assert.deepEqual(f.bodies, old.bodies));
    const native = fixture(), nativeOld = fixture(true); native.start('native'); nativeOld.start('native-old');
    const nativeResult = await native.ctx.sendLLMToolRequest(native.config, null, [{ role: 'user', content: 'PRIVATE_CHAT_BODY' }], [], [], {}, { diagnosticRunId: 'native' });
    const nativeOldResult = await nativeOld.ctx.sendLLMToolRequest(nativeOld.config, null, [{ role: 'user', content: 'PRIVATE_CHAT_BODY' }], [], [], {}, { diagnosticRunId: 'native-old' });
    check('native request boundary and HEAD payload/result compatibility', () => {
        assert.deepEqual(native.bodies, nativeOld.bodies); assert.deepEqual(json(nativeResult), json(nativeOldResult));
        assert.equal(native.diag.api.readGenerationDiagnostics().current.providerRequestStarted, true);
    });

    for (const [failure, expected, started] of [
        ['character', 'CONTEXT_PREP_BEGIN', false], ['context', 'SHORT_TERM_BEGIN', false],
        ['plugins', 'PROMPT_ASSEMBLED', false], ['body', 'PROVIDER_PAYLOAD_BEGIN', false],
        ['network', 'PROVIDER_REQUEST_BEGIN', true], ['parse', 'PROVIDER_RESPONSE_RECEIVED', true],
    ]) {
        const x = fixture(); x.start(failure);
        const error = () => { throw Error('PRIVATE_ERROR_BODY'); };
        if (failure === 'character') x.ctx.loadCharacters = error;
        if (failure === 'context') x.ctx.prepareShortTermContext = error;
        if (failure === 'plugins') x.ctx.applyChatPluginLlmRequest = error;
        if (failure === 'body') x.ctx.protectProviderBody = error;
        if (failure === 'network') x.ctx.fetch = async () => error();
        if (failure === 'parse') x.ctx.parseProviderResponse = error;
        await assert.rejects(x.run(failure));
        x.diag.api.markGenerationDiagnostic(failure, 'GEN_ERROR', { errorName: 'Error' });
        x.diag.api.markGenerationDiagnostic(failure, 'GEN_FINALLY', { completed: true });
        check('failure boundary ' + failure, () => { const r = x.diag.api.readGenerationDiagnostics().current; assert.equal(r.errorStage, expected); assert.equal(r.providerRequestStarted, started); });
    }
    const streamed = fixture(); streamed.start('stream'); streamed.ctx.isSessionStreamingEnabled = () => true;
    await streamed.run('stream');
    check('100 streaming deltas: one first-delta boundary, unchanged text', () => {
        const writes = streamed.diag.writes.filter(w => w.key.endsWith('current_v1')).map(w => JSON.parse(w.value));
        assert.equal(writes.filter(r => r.lastStage === 'API_FIRST_DELTA').length, 1);
        assert.equal(writes.at(-1).streaming, true); assert.equal(writes.at(-1).rawLength, 'PRIVATE_RESPONSE'.length);
    });
    const bg = fixture();
    const bgResult = await bg.ctx.requestBackgroundChatReply(bg.session.id);
    assert.equal(bgResult.ok, true, JSON.stringify(bg.saved));
    check('actual background reply covers history, context, provider, parse/save/dispatch/finally', () => {
        const r = bg.diag.api.readGenerationDiagnostics().current;
        assert.equal(r.source, 'background'); assert.equal(r.lastStage, 'GEN_FINALLY'); assert.equal(r.completed, true);
        assert.equal(r.draftCount, 3); assert.equal(r.publishedCount, 3); assert.equal(r.dispatchedCount, 3);
        assert.equal(bg.saved.length, 3); assert.deepEqual(bg.delays, [800, 800]);
        for (const stage of ['HISTORY_LOAD_BEGIN', 'HISTORY_LOADED', 'PARSE_DONE', 'PUBLISHING', 'PUBLISH_DONE', 'MESSAGE_DISPATCH_BEGIN', 'MESSAGE_DISPATCH_DONE']) assert.equal(typeof r.stageTimes[stage], 'number');
    });
    const follow = fixture();
    await follow.ctx.fireFollowUp({ sessionId: follow.session.id, count: 0, delaySec: 60 });
    check('actual scheduled follow-up includes diagnostics through staged dispatch', () => {
        const r = follow.diag.api.readGenerationDiagnostics().current;
        assert.equal(r.errorName, undefined); assert.equal(r.source, 'background'); assert.equal(r.publishedCount, 3);
        assert.equal(r.dispatchedCount, 3); assert.equal(r.lastStage, 'GEN_FINALLY'); assert.equal(r.completed, true);
        assert.deepEqual(follow.delays, [800, 800]);
    });
    for (const published of [0, 1, 2, 3]) {
        const x = fixture(); x.start('publish-' + published);
        x.ctx.pushChatMessage = message => {
            if (x.saved.length === published) throw Error('Synthetic stop');
            const row = { ...message, id: 'saved-' + x.saved.length }; x.saved.push(row); return row;
        };
        if (published === 3) x.ctx.dispatchBackgroundMessagesOneByOne = async () => { throw Error('Synthetic dispatch stop'); };
        await assert.rejects(x.ctx.parseAndSaveResponse('PRIVATE_RESPONSE', x.session.id, 0, undefined, x.history, { diagnosticRunId: 'publish-' + published }));
        check('actual parse/save interruption after ' + published + ' of 3 drafts', () => {
            const r = x.diag.api.readGenerationDiagnostics().current;
            assert.equal(r.draftCount, 3); assert.equal(r.publishedCount, published); assert.equal(r.completed, false);
            assert.equal(r.lastStage, published === 0 ? 'PARSE_DONE' : published === 3 ? 'MESSAGE_DISPATCH_BEGIN' : 'PUBLISHING');
            if (published === 3) assert.ok(x.diag.writes.some(w => JSON.parse(w.value).lastStage === 'PUBLISH_DONE'));
        });
    }
    const parallel = fixture(), pending = [];
    parallel.ctx.fetch = () => new Promise(resolve => pending.push(resolve));
    parallel.start('parallel-a'); const a = parallel.run('parallel-a');
    parallel.diag.api.startGenerationDiagnostic('parallel-b', 'other-session', false, 'background');
    const b = parallel.ctx.generateChatCompletion({ ...parallel.session, id: 'other-session' }, parallel.history, { diagnosticRunId: 'parallel-b', appTags: ['chat', 'text'] });
    for (let i = 0; pending.length < 2 && i < 100; i++) await new Promise(resolve => setImmediate(resolve));
    assert.equal(pending.length, 2);
    pending[1]({ ok: true, json: async () => ({ content: 'PRIVATE_RESPONSE' }) }); await b;
    parallel.diag.api.markGenerationDiagnostic('parallel-b', 'GEN_FINALLY', { completed: true });
    pending[0]({ ok: true, json: async () => ({ content: 'PRIVATE_RESPONSE' }) }); await a;
    check('concurrent requests completed out of order retain their own session/run IDs', () => {
        const records = parallel.diag.api.readGenerationDiagnostics();
        assert.equal(records.current.runId, 'parallel-b'); assert.equal(records.current.sessionId, 'other-session');
        const first = records.runs.find(r => r.runId === 'parallel-a');
        assert.equal(first.sessionId, parallel.session.id); assert.equal(first.lastStage, 'RESPONSE_RECEIVED');
        assert.equal(first.providerRequestStarted, true);
        assert.notEqual(records.previous.lastStage, first.lastStage); // previous is an intentional frozen snapshot
    });
    const legacy = diagnostic();
    legacy.records.set('ai_phone_chat_generation_diag_current_v1', JSON.stringify({ version: 1, runId: 'legacy', sessionId: 'old-session', isGroup: false, startedAt: 1, lastStageAt: 2, lastStage: 'API_BEGIN', completed: false, historyCount: 6906, privateUnknownField: 'PRIVATE_IGNORED' }));
    check('legacy API_BEGIN reads safely; unknown fields are not exposed', () => {
        const r = legacy.api.readGenerationDiagnostics().current;
        assert.equal(r.lastStage, 'API_BEGIN'); assert.equal(r.historyCount, 6906); assert.equal(r.providerRequestStarted, undefined); assert.ok(!JSON.stringify(r).includes('PRIVATE_'));
    });
    const saturated = diagnostic();
    for (let i = 0; i < 9; i++) saturated.api.startGenerationDiagnostic('capacity-' + i, 'session-' + i, false);
    check('fixed eight slots never overwrite an active run on overflow', () => {
        const r = saturated.api.readGenerationDiagnostics(); assert.equal(r.runs.length, 8); assert.equal(r.current.runId, 'capacity-7');
        saturated.api.markGenerationDiagnostic('capacity-0', 'GEN_FINALLY', { completed: true });
        saturated.api.startGenerationDiagnostic('capacity-next', 'next', false); assert.equal(saturated.api.readGenerationDiagnostics().current.runId, 'capacity-next');
    });
    const disabled = fixture(); disabled.diag.disable(); disabled.start('storage-disabled');
    await disabled.run('storage-disabled');
    check('throwing localStorage does not change provider behavior', () => assert.deepEqual(disabled.bodies, [f.bodies[0]]));
    check('privacy allowlist and small bounded records', () => {
        for (const x of [f, streamed, bg]) for (const { value } of x.diag.writes) {
            assert.ok(!/PRIVATE_|data:image|https:|Authorization/.test(value)); assert.ok(value.length < 4096);
        }
    });
    console.log(JSON.stringify({ checks, successWrites: f.diag.writes.length, backgroundWrites: bg.diag.writes.length,
        maxRecordChars: Math.max(...bg.diag.writes.map(w => w.value.length)) }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
