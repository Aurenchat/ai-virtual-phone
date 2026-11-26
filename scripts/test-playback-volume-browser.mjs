import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = await fs.mkdtemp(path.join(os.tmpdir(), "float-playback-gain-"));
const wp = require("next/dist/compiled/webpack/webpack");
wp.init();
await new Promise((resolve, reject) => wp.webpack({
    mode: "development", target: "web", devtool: false, context: repo,
    entry: path.join(repo, "scripts/elevenlabs/playback-volume-fixture.tsx"),
    output: { path: output, filename: "fixture.js" },
    resolve: { extensions: [".tsx", ".ts", ".js"], alias: { "@": repo }, fallback: { fs: false, path: false, crypto: false } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(repo, "scripts/anonymous-xhs-phase0/ts-loader.cjs") }] },
    plugins: [new wp.webpack.DefinePlugin({ "process.env.NODE_ENV": JSON.stringify("development") })],
}, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString({ all: false, errors: true }))) : resolve()));

const server = http.createServer(async (req, res) => {
    if (req.url === "/fixture.js") { res.setHeader("Content-Type", "text/javascript"); res.end(await fs.readFile(path.join(output, "fixture.js"))); return; }
    res.setHeader("Content-Type", "text/html");
    res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div><script>window.process={env:{NODE_ENV:"development"}};</script><script src="/fixture.js"></script>');
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let playwright;
try { playwright = require("playwright"); } catch {
    playwright = require(path.join(process.env.READING_TEST_NODE_MODULES || path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"), "playwright"));
}
const browser = await playwright.chromium.launch({ headless: true, channel: process.env.READING_TEST_BROWSER_CHANNEL || "msedge" });
let passed = 0;
const check = (condition, label) => { assert.ok(condition, label); console.log(`PASS ${label}`); passed++; };
const until = async fn => { const deadline = Date.now() + 10000; while (!await fn() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25)); assert.ok(await fn(), 'condition reached'); };
try {
    const page = await browser.newPage({ viewport: { width: 430, height: 850 } });
    page.setDefaultTimeout(12000);
    await page.addInitScript(() => {
        const audio = [], sources = [], contexts = [], edges = new WeakMap();
        const NativeAudio = window.Audio, NativeContext = window.AudioContext;
        window.Audio = function (...args) { const element = new NativeAudio(...args); audio.push(element); return element; };
        window.Audio.prototype = NativeAudio.prototype;
        // Exercise the iOS restriction instead of relying on Chromium's audio.volume support.
        Object.defineProperty(HTMLMediaElement.prototype, 'volume', { configurable: true, get() { return 1; }, set(_value) {} });
        window.AudioContext = class extends NativeContext {
            constructor(...args) { super(...args); contexts.push(this); }
            createMediaElementSource(element) { const source = super.createMediaElementSource(element); sources.push({ element, source }); return source; }
        };
        const connect = AudioNode.prototype.connect, disconnect = AudioNode.prototype.disconnect;
        AudioNode.prototype.connect = function (...args) { edges.set(this, [...(edges.get(this) || []), args[0]]); return connect.apply(this, args); };
        AudioNode.prototype.disconnect = function (...args) { edges.set(this, []); return disconnect.apply(this, args); };
        window.volumeAudit = {
            audio, sources, contexts,
            graph(element) {
                const start = sources.find(item => item.element === element)?.source, result = [];
                let node = start;
                while (node && result.length < 12) { result.push({ kind: node.constructor.name, gain: node.gain?.value, curve: node.curve?.length }); node = edges.get(node)?.[0]; }
                return result;
            },
        };
    });
    const requests = [], heldResponses = []; let toneBytes, holdNextResponse = false;
    await page.route('https://api.elevenlabs.io/**', async route => {
        requests.push(route.request().postDataJSON());
        if (holdNextResponse) { holdNextResponse = false; heldResponses.push(route); return; }
        await route.fulfill({ contentType: 'audio/wav', body: toneBytes });
    });
    await page.goto(origin);
    await page.evaluate(async () => { await window.playbackVolumeTest.ready(); window.playbackVolumeTest.mountSettings(); });
    toneBytes = Buffer.from((await page.evaluate(() => window.playbackVolumeTest.dataUrl())).split(',')[1], 'base64');
    await page.getByRole('button', { name: '编辑 Eleven A', exact: true }).click();
    const slider = page.getByLabel('ElevenLabs 播放音量');
    check(await slider.inputValue() === '1', 'legacy ElevenLabs config displays unity gain');
    check(await page.evaluate(() => window.playbackVolumeTest.configs()[0].playbackVolume === undefined), 'opening legacy config does not migrate/rewrite its value');
    check(await slider.getAttribute('min') === '0.1' && await slider.getAttribute('max') === '2' && await slider.getAttribute('step') === '0.1', 'slider range matches MiniMax visual control');
    await slider.fill('0.5');
    check(await page.evaluate(() => window.playbackVolumeTest.configs()[0].playbackVolume === .5 && window.playbackVolumeTest.configs()[1].playbackVolume === 2), 'config volumes are saved independently');
    await page.evaluate(() => window.playbackVolumeTest.mountSettings());
    await page.getByRole('button', { name: '编辑 Eleven A', exact: true }).click();
    check(await slider.inputValue() === '0.5', 'saved gain restores after settings remount');
    const model = page.locator('select').filter({ has: page.locator('option[value="eleven_v3"]') });
    await model.selectOption('eleven_v3');
    check(await slider.count() === 1 && await page.getByText('v3 使用音色默认参数。', { exact: true }).count() === 1, 'playback gain is independent of v3 generation controls');
    await model.selectOption('eleven_multilingual_v2');
    await page.getByRole('button', { name: '试听音色', exact: true }).click();
    await until(() => requests.length === 1);
    await page.waitForFunction(() => volumeAudit.audio.some(element => !element.paused && element.currentTime > .03));
    const previewBefore = await page.evaluate(() => { const element = volumeAudit.audio.find(element => !element.paused && element.currentTime > .03); window.testPreviewAudio = element; return { src: element.src, time: element.currentTime, graph: volumeAudit.graph(element) }; });
    check(previewBefore.graph.some(node => node.gain === .5), 'actual preview uses Web Audio gain with ignored volume writes');
    await slider.fill('2'); await page.waitForTimeout(100);
    const previewAfter = await page.evaluate(() => ({ src: testPreviewAudio.src, time: testPreviewAudio.currentTime, graph: volumeAudit.graph(testPreviewAudio) }));
    check(previewAfter.src === previewBefore.src && previewAfter.time >= previewBefore.time && requests.length === 1, 'live preview volume does not restart, replace audio or request synthesis');
    check(previewAfter.graph.some(node => node.curve === 8193), 'amplified preview includes soft limiter');
    const bodyBefore = JSON.stringify(requests[0]);
    await page.getByRole('button', { name: '停止试听', exact: true }).click();
    await page.getByRole('button', { name: '试听音色', exact: true }).click(); await until(() => requests.length === 2);
    check(JSON.stringify(requests[1]) === bodyBefore, 'new preview after gain change sends identical synthesis request');
    await page.getByRole('button', { name: '停止试听', exact: true }).click();
    holdNextResponse = true;
    await page.getByRole('button', { name: '试听音色', exact: true }).click();
    await until(() => heldResponses.length === 1);
    await page.getByRole('button', { name: '停止试听', exact: true }).click();
    await heldResponses.pop().fulfill({ contentType: 'audio/wav', body: toneBytes }).catch(() => {});
    await page.waitForTimeout(100);
    check(await page.evaluate(() => volumeAudit.audio.every(element => element.paused) && volumeAudit.contexts.every(context => context.state === 'suspended')), 'non-unity preview stop cancels late response and releases primed graph/session');
    const provider = page.locator('select').filter({ has: page.locator('option[value="ElevenLabs"]') });
    await provider.selectOption('MinimaxCN');
    check(await page.evaluate(() => window.playbackVolumeTest.configs()[0].playbackVolume === undefined), 'provider switch clears ElevenLabs local gain');
    check(await page.getByLabel('Minimax 音量').inputValue() === '1' && await slider.count() === 0, 'MiniMax keeps its own API-volume control');
    await provider.selectOption('ElevenLabs');
    check(await slider.inputValue() === '1', 'switching back to ElevenLabs defaults safely to unity');
    // Reset fixture after the intentional provider-isolation test.
    await page.evaluate(async () => { await playbackVolumeTest.ready(); playbackVolumeTest.setVolume('a', .5); playbackVolumeTest.mountBubbles(); });
    const beforeBubbles = requests.length;
    await page.locator('[data-case="a"] .voice-msg-bubble').click();
    await page.waitForFunction(() => volumeAudit.audio.some(element => !element.paused && element.src === playbackVolumeTest.dataUrl()));
    const cached = await page.evaluate(() => { const element = volumeAudit.audio.find(element => !element.paused && element.src === playbackVolumeTest.dataUrl()); window.cachedVoice = element; return { src: element.src, graph: volumeAudit.graph(element) }; });
    check(cached.graph.some(node => node.gain === .5) && requests.length === beforeBubbles, 'cached assistant bubble applies current gain without synthesis');
    await page.locator('[data-case="b"] .voice-msg-bubble').click();
    check(await page.evaluate(() => volumeAudit.audio.filter(element => !element.paused && element.src === playbackVolumeTest.dataUrl()).some(element => volumeAudit.graph(element).some(node => node.curve))), 'second role uses its own amplified graph');
    await page.evaluate(() => playbackVolumeTest.setVolume('b', .2));
    check(await page.evaluate(() => volumeAudit.graph(cachedVoice).some(node => node.gain === .5)), 'editing another role gain leaves first role unchanged');
    await page.locator('[data-case="a"] .voice-msg-bubble').click();
    check(await page.evaluate(() => volumeAudit.contexts.some(context => context.state === 'running')), 'stopping one role does not suspend another active media voice');
    const sourcesBeforeRecording = await page.evaluate(() => volumeAudit.sources.length);
    await page.locator('[data-case="user"] .voice-msg-bubble').click();
    check(await page.evaluate(n => volumeAudit.sources.length === n, sourcesBeforeRecording), 'user recording is never routed through ElevenLabs gain');
    check(requests.length === beforeBubbles && await page.evaluate(() => playbackVolumeTest.dataUrl() === cachedVoice.src || cachedVoice.src === ''), 'cache/recording playback preserves stored audio and spends no quota');
    await page.evaluate(() => { playbackVolumeTest.unmount(); playbackVolumeTest.setVolume('a', .5); playbackVolumeTest.global(.4); playbackVolumeTest.mountReader(); });
    const beforeReading = requests.length;
    await page.getByRole('button', { name: 'reader start', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="reader-state"]').textContent.includes('playing'));
    await until(() => requests.length >= beforeReading + 3);
    await page.waitForTimeout(100);
    const readerBefore = await page.evaluate(() => { const element = volumeAudit.audio.find(element => !element.paused && element.src); window.readerAudio = element; return { src: element.src, graph: volumeAudit.graph(element), state: document.querySelector('[data-testid="reader-state"]').textContent }; });
    check(readerBefore.graph.some(node => node.gain === .5) && readerBefore.graph.some(node => Math.abs(node.gain - .4) < .0001), 'real reading hook/player applies config and global gain once');
    const readingCount = requests.length;
    await page.evaluate(() => playbackVolumeTest.setVolume('a', 2)); await page.waitForTimeout(150);
    check(requests.length === readingCount && await page.evaluate(src => readerAudio.src === src && !readerAudio.paused, readerBefore.src), 'reading gain edit keeps audio cache, in-flight work and active clip');
    await page.getByRole('button', { name: 'reader pause', exact: true }).click();
    const pauseTime = await page.evaluate(() => readerAudio.currentTime);
    await page.evaluate(() => playbackVolumeTest.setVolume('a', .3));
    check(await page.evaluate(time => readerAudio.paused && readerAudio.currentTime === time, pauseTime), 'gain edit while reading paused preserves pause and position');
    await page.getByRole('button', { name: 'reader resume', exact: true }).click();
    await page.waitForFunction(() => !readerAudio.paused);
    check(requests.length === readingCount && await page.evaluate(src => readerAudio.src === src, readerBefore.src), 'reading resume after gain edit reuses current clip');
    await page.getByRole('button', { name: 'reader next', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="reader-state"]').textContent.includes('"paragraphIndex":1'));
    check(requests.filter(body => body.text === 'beta').length === 1, 'next reading paragraph consumes synthesis cache once');
    await page.getByRole('button', { name: 'reader chapter', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="reader-state"]').textContent.includes('"chapterIndex":1'));
    await page.getByRole('button', { name: 'reader stop', exact: true }).click();
    check(await page.evaluate(() => JSON.parse(document.querySelector('[data-testid="reader-state"]').textContent).status === 'idle'), 'reading stop after chapter jump returns idle');
    await page.evaluate(() => playbackVolumeTest.unmount()); await page.waitForTimeout(100);
    check(await page.evaluate(() => volumeAudit.audio.every(element => element.paused) && volumeAudit.contexts.every(context => context.state === 'suspended')), 'all media and audio sessions release after stop/unmount');
    const unity = await page.evaluate(() => playbackVolumeTest.renderGain(1, .4));
    const quiet = await page.evaluate(() => playbackVolumeTest.renderGain(.5, .4));
    const loud = await page.evaluate(() => playbackVolumeTest.renderGain(2, .4));
    const limited = await page.evaluate(() => playbackVolumeTest.renderGain(2, 1, .95));
    check(Math.abs(quiet.rms / unity.rms - .5) < .002 && Math.abs(loud.rms / unity.rms - 2) < .01, 'native OfflineAudioContext renders measured attenuation and amplification');
    check(limited.peak < 1 && limited.peak > .9, 'native amplified waveform retains headroom without hard clipping');
    console.log(`PASS ${passed} playback volume component/browser/audio assertions; synthetic responses only`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
