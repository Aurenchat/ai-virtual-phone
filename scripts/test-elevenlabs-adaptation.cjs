// Float adaptation checks. Synthetic responses only; no credentials or external network.
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), assert = require('node:assert/strict');
const cache = new Map();
let fetcher, provider = 'ElevenLabs', enabled = true, model = 'eleven_v4';
const config = () => ({ id: 'voice', provider, model, apiKey: 'fixture-only', defaultVoice: 'voice/test', enableTTS: enabled });
const storage = { loadBindingConfig: () => ({}), loadVoiceConfigs: () => [config()], resolveBinding: (_, id) => ({ voiceConfigId: id === 'char' ? 'voice' : undefined }) };
function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const dependencies = name => name === './settings-storage' ? storage
        : name === './voice-expression' ? load('lib/voice-expression.ts')
        : name === './elevenlabs-tts' ? load('lib/elevenlabs-tts.ts')
        : name === './speech-playback-volume' ? load('lib/speech-playback-volume.ts')
        : name === './voice-guides/elevenlabs' ? load('lib/voice-guides/elevenlabs.ts')
        : name === './macro-engine' ? load('lib/macro-engine.ts')
        : name === './prompt-time' ? { resolvePromptTimeAware: () => false, getPromptTimestampOptionsForTimeContext: () => ({}) }
        : name === './character-time' ? { buildCharacterTimeContext: () => ({}), buildGroupTimeContext: () => ({}) }
        : {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
        { exports, require: dependencies, Blob, URL, URLSearchParams, AbortController, DOMException, TypeError, console,
            fetch: (...args) => fetcher(...args), setTimeout, clearTimeout, Intl });
    return exports;
}
let passed = 0;
const check = (value, message) => { assert.ok(value, message); passed++; console.log('PASS '+message); };
const turn = () => new Promise(resolve => setImmediate(resolve));
(async () => {
    const service = load('lib/tts-service.ts'), eleven = load('lib/elevenlabs-tts.ts');
    const request = eleven.elevenLabsSpeechRequest('[whispers] Hello.', { ...config(), elevenLabs: { languageCode: ' ZH ', stability: .8, similarity: .6, style: 1, speakerBoost: true }, speechSpeed: 1.2 });
    assert.deepEqual(JSON.parse(JSON.stringify(request.body)), { text: '[whispers] Hello.', model_id: 'eleven_v4', language_code: 'zh', voice_settings: { stability: .8, similarity_boost: .6 } });
    check(true, 'v4 preserves authored text and sends only supported parameters');
    for (const operation of ['speech', 'voices']) {
        const aborted = new AbortController(); aborted.abort(); let calls = 0;
        fetcher = async () => { calls++; throw Error('Unexpected'); };
        await assert.rejects(operation === 'speech' ? service.synthesizeSpeech('Hello', config(), { signal: aborted.signal }) : eleven.listElevenLabsVoices(config(), aborted.signal), { name: 'AbortError' });
        check(calls === 0, operation+' pre-abort makes no network request');
        const controller = new AbortController(); let signal;
        fetcher = async (_, init) => {
            signal = init.signal;
            const stalled = () => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true }));
            return { ok: true, headers: new Headers({ 'content-type': 'audio/mpeg' }), blob: stalled, json: stalled };
        };
        const pending = operation === 'speech' ? service.synthesizeSpeech('Hello', config(), { signal: controller.signal }) : eleven.listElevenLabsVoices(config(), controller.signal);
        await turn(); controller.abort(); await assert.rejects(pending, { name: 'AbortError' });
        check(signal.aborted, operation+' caller cancellation stays active through response body');
    }
    let body;
    fetcher = async (_, init) => { body = JSON.parse(init.body); return new Response('audio', { headers: { 'content-type': 'audio/mpeg' } }); };
    await service.synthesizeSpeech('{voice:whispers} Hello.', config());
    check(body.text === '[whispers] Hello.', 'expressive model receives converted voice marker');
    await service.synthesizeSpeech('Hello [appendix].', { ...config(), model: 'eleven_multilingual_v2' });
    check(body.text === 'Hello [appendix].', 'literal reading brackets survive nonexpressive synthesis');
    await service.synthesizeSpeech('[whispers] Hello.', { ...config(), model: 'eleven_multilingual_v2' }, { authoredDirections: true });
    check(body.text === 'Hello.', 'switching to nonexpressive model removes saved audio directions');
    const reading = load('lib/reading-tts.ts'), position = { bookId: 'b', chapterIndex: 0, paragraphIndex: 0 };
    const key = reading.readingTtsCacheKey(position, 'text', { voice: config() });
    for (const [field, value] of Object.entries({ stability: .9, similarity: .8, style: .2, speakerBoost: false, languageCode: 'zh' })) {
        check(key !== reading.readingTtsCacheKey(position, 'text', { voice: { ...config(), elevenLabs: { [field]: value } } }), 'reader cache invalidates on '+field);
    }
    const assembler = load('lib/llm-prompt-assembler.ts');
    const input = { character: { id: 'char', name: 'Character' }, history: [], preset: null, worldBooks: [], regexes: [], appTags: ['chat'] };
    const guidance = payload => payload.filter(item => item._debugMeta?.marker === 'voice_expression');
    check(guidance(assembler.assemblePromptPayload(input)).length === 1, 'final direct-chat payload contains bound ElevenLabs guide');
    check(guidance(assembler.assemblePromptPayload({ ...input, appTags: ['chat', 'voice'] }))[0].content.includes('当前为通话'), 'final call payload uses call expression guide');
    enabled = false;
    check(guidance(assembler.assemblePromptPayload(input)).length === 0, 'disabled TTS injects no guide'); enabled = true;
    provider = 'Minimax';
    check(guidance(assembler.assemblePromptPayload(input)).length === 0, 'other providers inject no ElevenLabs guide'); provider = 'ElevenLabs';
    model = 'eleven_multilingual_v2';
    check(guidance(assembler.assemblePromptPayload(input)).length === 0, 'nonexpressive model injects no guide'); model = 'eleven_v4';
    check(guidance(assembler.assemblePromptPayload({ ...input, isolatedContext: true })).length === 0, 'isolated prompt assembly avoids implicit voice settings reads');
    check(guidance(assembler.assemblePromptPayload({ ...input, appTags: ['reading'] })).length === 0, 'reading discussion receives no chat voice guide');
    const group = assembler.assembleGroupPromptPayload({ members: [{ character: input.character, worldBooks: [] }], history: [], preset: null, regexes: [], groupName: 'Group', memberNames: ['Character'] });
    check(guidance(group).length === 1 && guidance(group)[0].content.includes('角色ID：char'), 'final group payload limits guide to bound member IDs');
    console.log(`PASS ${passed} Float adaptation assertions`);
})().catch(error => { console.error(error); process.exitCode = 1; });
