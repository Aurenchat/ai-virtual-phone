import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function load(file, require = () => { throw Error("Unexpected dependency"); }) {
    const source = await readFile(new URL(`../lib/${file}.ts`, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const loaded = { exports: {} };
    new Function("module", "exports", "require", compiled)(loaded, loaded.exports, require);
    return loaded.exports;
}
const { ReadingTtsController, ReadingAudioCache, readingTtsCacheKey } = await load("reading-tts");
const { pdfParagraphAt } = await load("reading-tts-location");
const turn = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const voice = { id: "v", provider: "Minimax", apiKey: "fixture", enableTTS: true, defaultVoice: "narrator", model: "speech-02-hd" };
const pos = (paragraphIndex = 0, chapterIndex = 0) => ({ bookId: "book", chapterIndex, paragraphIndex });
let passed = 0;
const check = (condition, label) => { assert.ok(condition, label); console.log(`PASS ${label}`); passed++; };
check(pdfParagraphAt([{ paragraphIndex: 0, yRatio: .1 }, { paragraphIndex: 1, yRatio: .3 }], .26).paragraphIndex === 0, "PDF multiline paragraph keeps lines before next block together");
function fixture(texts = [["a", "b", "c"], ["d", "", "e"]], slow = false) {
    const calls = [], clips = [];
    const chapters = texts.map((paragraphs, index) => ({ index, paragraphs }));
    const controller = new ReadingTtsController({ bookId: "book", chapterCount: () => chapters.length,
        getChapter: async index => chapters[index], onChange() {},
        synthesize(text, config, options) {
            const result = deferred(); calls.push({ text, config, options, ...result });
            return slow ? result.promise : Promise.resolve(new Blob([text]));
        },
        player: { unlock() {}, dispose() {}, play(blob) {
            const end = deferred();
            const clip = { blob, started: Promise.resolve(), ended: end.promise, paused: false, stops: 0,
                finish: () => end.resolve(), pause() { this.paused = true; }, resume() { this.paused = false; return Promise.resolve(); }, stop() { this.stops++; end.resolve(); } };
            clips.push(clip); return clip;
        } },
    });
    controller.configure({ voice });
    return { controller, calls, clips, chapters };
}
{
    const { controller: c, calls, clips } = fixture();
    c.start(pos(1)); await turn();
    check(c.state.position.paragraphIndex === 1 && clips.length === 1, "start at requested current paragraph");
    check(calls.map(item => item.text).join() === "b,c,d", "bounded N+1 and N+2 prefetch crosses chapter");
    c.pause(); const count = calls.length; check(c.state.status === "paused" && clips[0].paused, "pause retains current clip");
    c.resume(); await turn(); check(c.state.status === "playing" && calls.length === count && clips.length === 1, "resume uses same clip without synthesis");
    clips[0].finish(); await turn(); check(c.state.position.paragraphIndex === 2 && clips.length === 2 && calls.filter(item => item.text === "c").length === 1, "ended uses prefetched next clip once");
    clips[1].finish(); await turn(); check(c.state.position.chapterIndex === 1 && c.state.position.paragraphIndex === 0, "continuous chapter transition");
    c.move(-1); await turn(); check(c.state.position.chapterIndex === 0 && c.state.position.paragraphIndex === 2, "previous enters preceding chapter last paragraph");
    c.start(pos(2, 1)); await turn(); clips.at(-1).finish(); await turn();
    check(c.state.status === "ended" && c.state.position.paragraphIndex === 2, "whole book ends naturally and retains last paragraph");
    c.stop(); check(c.state.status === "idle" && c.state.position.chapterIndex === 1, "stop keeps last position without continuation"); c.dispose();
}
{
    const { controller: c, calls, clips } = fixture(undefined, true);
    c.start(pos()); await turn(); calls[0].resolve(new Blob(["a"])); await turn();
    clips[0].finish(); await turn(); check(c.state.status === "loading" && clips.length === 1, "unfinished prefetch waits in loading state");
    calls.find(item => item.text === "b").resolve(new Blob(["b"])); await turn();
    check(c.state.status === "playing" && clips.length === 2 && calls.filter(item => item.text === "b").length === 1, "inflight prefetch is shared with foreground");
    c.stop(); const count = clips.length;
    for (const call of calls) call.resolve(new Blob(["late"])); await turn();
    check(clips.length === count && c.state.status === "idle", "late results after stop cannot resurrect audio"); c.dispose();
}
{
    const { controller: c, calls, clips } = fixture(undefined, true);
    c.start(pos()); await turn(); c.move(1); c.move(1); await turn();
    for (const call of calls) call.resolve(new Blob([call.text])); await turn();
    check(c.state.position.paragraphIndex === 2 && clips.length === 1 && await clips[0].blob.text() === "c", "rapid next ignores stale requests and plays only latest target");
    c.start(pos(0, 1)); await turn(); c.dispose();
    for (const call of calls) call.resolve(new Blob(["late"])); await turn();
    check(c.state.status === "idle" && clips.every(clip => clip.stops === 1), "chapter jump and unmount cancel playback and inflight work");
}
{
    const { controller: c, calls, clips } = fixture(undefined, true);
    c.start(pos()); await turn(); c.pause(); calls[0].resolve(new Blob(["a"])); await turn();
    check(c.state.status === "paused" && clips.length === 0, "pause during synthesis prevents autoplay");
    const count = calls.length; c.resume(); await turn(); check(clips.length === 1 && calls.length === count, "resume prepared clip does not resynthesize");
    c.configure({ voice: { ...voice, id: "other", speechVolume: 1.4, speechPitch: 2 }, speed: 1.5, emotion: "calm", characterId: "new" }); await turn();
    check(calls.at(-1).options.speed === 1.5 && calls.at(-1).config.id === "other" && calls.at(-1).config.speechVolume === 1.4 && calls[0].options.signal.aborted === false, "reading restart keeps saved voice volume with runtime parameters");
    check(clips[0].stops === 1 && calls.filter(item => item.text === "a").length === 2, "new parameters invalidate old audio cache"); c.dispose();
}
{
    const { controller: c, calls, clips } = fixture(undefined, true);
    c.start(pos()); await turn(); calls[0].reject(Error("provider failure")); await turn();
    check(c.state.status === "error" && c.state.error === "provider failure", "single paragraph failure pauses without infinite retry");
    const count = calls.length; await turn(); check(calls.length === count, "failure does not spend more API calls");
    c.retry(); await turn(); calls.findLast(item => item.text === "a").resolve(new Blob(["retry"])); await turn();
    check(clips.length === 1 && c.state.status === "playing", "explicit retry recovers failed paragraph"); c.dispose();
}
{
    const { controller: c, clips } = fixture([[" ", "", "one"]]); c.start(pos()); await turn();
    check(c.state.position.paragraphIndex === 2 && clips.length === 1, "empty paragraphs are skipped"); c.dispose();
    const scan = fixture([[]]); scan.controller.start(pos()); await turn();
    check(scan.controller.state.status === "error" && scan.controller.state.error.includes("OCR"), "scanned PDF has a clear no-text fallback"); scan.controller.dispose();
    const missing = fixture(); missing.controller.configure({ voice: null }); missing.controller.start(pos()); await turn();
    check(missing.controller.state.status === "error" && missing.calls.length === 0, "missing config reports settings hint without API call"); missing.controller.dispose();
}
{
    const cache = new ReadingAudioCache(2, 5); cache.set("a", new Blob(["aa"])); cache.set("b", new Blob(["bb"])); cache.get("a"); cache.set("c", new Blob(["cc"]));
    check(!cache.get("b") && cache.get("a") && cache.size === 2, "LRU evicts old audio by count and bytes");
    cache.set("oversize", new Blob(["123456"])); check(cache.size === 2, "oversized clip is not retained");
    const key = readingTtsCacheKey(pos(), "a", { voice });
    for (const [label, position, text, options] of [
        ["book", { ...pos(), bookId: "b" }, "a", { voice }], ["paragraph", pos(1), "a", { voice }], ["text", pos(), "edited", { voice }],
        ...["id", "provider", "model", "defaultVoice", "speechVolume", "speechPitch"].map(field => [field, pos(), "a", { voice: { ...voice, [field]: field === "speechVolume" ? 1.4 : "changed" } }]),
        ["speed", pos(), "a", { voice, speed: 2 }], ["emotion", pos(), "a", { voice, emotion: "happy" }],
    ]) check(key !== readingTtsCacheKey(position, text, options), `cache key changes with ${label}`);
}
// Exercise real provider adapters (no external network): defaults, overrides, errors, abort and timeout.
const service = await load("tts-service", () => ({ loadVoiceConfigs: () => [voice], loadBindingConfig: () => ({}), resolveBinding: () => ({ voiceConfigId: "v" }) }));
check(service.resolveVoiceConfig(undefined, "reading").id === "v", "voice resolver accepts app defaults without a character");
const { resolveBinding } = await load("settings-storage", () => ({ registerKvMigration() {} }));
const bindings = { globalDefaults: { voiceConfigId: "global" }, appDefaults: { reading: { voiceConfigId: "app" } }, characterBindings: [{ characterId: "char", defaults: { voiceConfigId: "character" }, appOverrides: { reading: { voiceConfigId: "override" } } }] };
check(resolveBinding(bindings, "char", "reading").voiceConfigId === "override", "character reading override retains highest priority");
check(resolveBinding(bindings, undefined, "reading").voiceConfigId === "app", "no-character reading uses app binding");
check(resolveBinding(bindings, "char", "chat").voiceConfigId === "character" && resolveBinding(bindings).voiceConfigId === "global", "existing character and global fallback remain compatible");
const originalFetch = globalThis.fetch;
const originalSetTimeout = globalThis.setTimeout;
try {
    let body;
    globalThis.fetch = async (_url, init) => { body = JSON.parse(init.body); return new Response(JSON.stringify({ data: { audio: "010203" } }), { status: 200 }); };
    await service.synthesizeSpeech("书中文字", voice);
    check(!("emotion" in body.voice_setting) && body.voice_setting.speed === 1 && body.voice_setting.vol === 1, "legacy MiniMax config defaults speed and volume to 1.0");
    await service.synthesizeSpeech("书中文字", { ...voice, speechVolume: 1.4 });
    check(body.voice_setting.vol === 1.4, "MiniMax uses saved speech volume");
    await service.synthesizeSpeech("书中文字", { ...voice, speechVolume: 9 });
    check(body.voice_setting.vol === 2, "MiniMax volume clamps above configured range");
    await service.synthesizeSpeech("书中文字", { ...voice, speechVolume: -2 });
    check(body.voice_setting.vol === 0.1, "MiniMax volume clamps below configured range");
    await service.synthesizeSpeech("书中文字", { ...voice, speechVolume: Number.NaN });
    check(body.voice_setting.vol === 1, "invalid MiniMax volume falls back to 1.0");
    await service.synthesizeSpeech("书中文字", { ...voice, speechVolume: "loud" });
    check(body.voice_setting.vol === 1, "non-numeric persisted volume falls back to 1.0");
    await service.synthesizeSpeech("书中文字", voice, { speed: 1.5, pitch: 3, emotion: "calm" });
    check(body.voice_setting.speed === 1.5 && body.voice_setting.pitch === 3 && body.voice_setting.emotion === "calm" && voice.speechSpeed === undefined, "MiniMax runtime overrides do not mutate saved config");
    globalThis.fetch = async (_url, init) => { body = JSON.parse(init.body); return new Response(new Blob(["audio"])); };
    await service.synthesizeSpeech("words", { ...voice, provider: "OpenAI", speechVolume: 1.4 }, { speed: 1.25, emotion: "sad" });
    check(body.speed === 1.25 && !("emotion" in body) && !("volume" in body) && !("vol" in body), "OpenAI synthesis ignores unsupported volume and emotion");
    const abort = new AbortController();
    globalThis.fetch = async (_url, init) => ({ ok: true, blob: () => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true })) });
    const pending = service.synthesizeSpeech("words", { ...voice, provider: "OpenAI" }, { signal: abort.signal });
    await turn(); abort.abort(); await assert.rejects(pending, { name: "AbortError" }); check(true, "external abort stays active through response-body consumption");
    globalThis.setTimeout = (fn, delay, ...args) => originalSetTimeout(fn, delay === 120000 ? 5 : delay, ...args);
    await assert.rejects(service.synthesizeSpeech("words", { ...voice, provider: "OpenAI" }), /超时/); check(true, "provider timeout still works with external cancellation extension");
    globalThis.fetch = async () => new Response("bad key", { status: 401 });
    await assert.rejects(service.synthesizeSpeech("words", { ...voice, provider: "OpenAI" }), /401/); check(true, "provider authentication errors surface safely");
} finally { globalThis.fetch = originalFetch; globalThis.setTimeout = originalSetTimeout; }
{
    const OriginalAudio = globalThis.Audio;
    const elements = [];
    globalThis.Audio = class {
        constructor() { elements.push(this); this.currentTime = 0; }
        setAttribute() {}
        removeAttribute() { this.src = ""; }
        load() {}
        play() { this.request = deferred(); return this.request.promise; }
        pause() { this.request?.reject(new DOMException("interrupted by pause", "AbortError")); }
    };
    try {
        const player = service.createSpeechMediaPlayer();
        const clip = player.play(new Blob(["audio"]));
        const element = elements.at(-1);
        clip.pause(); await clip.started;
        check(true, "pause while media play promise is pending is not a playback error");
        const resume = clip.resume(); element.request.resolve(); await resume;
        element.currentTime = 2; clip.pause(); const next = clip.resume(); element.request.resolve(); await next;
        check(element.currentTime === 2, "media helper resumes exact retained time");
        clip.stop(); await clip.ended;
        check(!element.src && element.onended === null && element.onerror === null, "media stop clears handlers and active object URL");
        player.dispose();
    } finally { globalThis.Audio = OriginalAudio; }
}
{
    const { controller: c, calls, clips } = fixture();
    const sourceReady = deferred();
    c.start(async signal => { await sourceReady.promise; signal.throwIfAborted(); return pos(1); });
    c.configure({ voice, speed: 2 }); sourceReady.resolve(); await turn();
    check(clips.length === 1 && calls[0].options.speed === 2 && c.state.position.paragraphIndex === 1, "parameter change during lazy position resolution restarts only latest session"); c.dispose();
}
console.log(`PASS ${passed} reading TTS unit assertions`);
