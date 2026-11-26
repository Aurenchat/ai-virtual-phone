import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), repo = process.cwd();
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'float-onset-'));
const wp = require('next/dist/compiled/webpack/webpack'); wp.init();
await new Promise((resolve, reject) => wp.webpack({
    mode: 'development', target: 'web', devtool: false, context: repo,
    entry: path.join(repo, 'scripts/elevenlabs/playback-onset-fixture.ts'), output: { path: output, filename: 'fixture.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': repo }, fallback: { fs: false, path: false, crypto: false } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(repo, 'scripts/anonymous-xhs-phase0/ts-loader.cjs') }] },
    plugins: [new wp.webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('development') })],
}, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString({ all: false, errors: true }))) : resolve()));
const worklet = `class Tap extends AudioWorkletProcessor {
 process(inputs,outputs) { const samples=inputs[0]?.[0];
  for(let i=0;i<outputs[0].length;i++) if(inputs[0]?.[i]) outputs[0][i].set(inputs[0][i]);
  if(samples) this.port.postMessage({time:currentTime, samples:Array.from(samples)}); return true;
 }} registerProcessor('tap',Tap);`;
const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', (req.url === '/' ? 'text/html' : 'text/javascript') + '; charset=utf-8');
    res.end(req.url === '/fixture.js' ? await fs.readFile(path.join(output, 'fixture.js')) : req.url === '/tap.js' ? worklet : '<button id="gesture">gesture</button><div id="app"></div><script>window.process={env:{NODE_ENV:"development"}};</script><script src="/fixture.js"></script>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let pw; try { pw = require('playwright'); } catch { pw = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const browser = await pw.chromium.launch({ headless: true, channel: process.env.READING_TEST_BROWSER_CHANNEL || 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const reports = [];
try {
    const page = await browser.newPage();
    page.on('pageerror', error => console.error('BROWSER', error.stack));
    page.on('console', message => { if (message.type() === 'warning') console.error('BROWSER', message.text()); });
    // No network synthesis is possible in this test.
    await page.route('https://**/*', route => route.abort());
    await page.addInitScript(() => {
        const NativeContext = AudioContext, nativeConnect = AudioNode.prototype.connect;
        const context = new NativeContext(), audio = [], records = [], trace = [];
        const NativeAudio = Audio;
        window.Audio = function (...args) { const element = new NativeAudio(...args); audio.push(element); return element; };
        window.Audio.prototype = NativeAudio.prototype;
        Object.defineProperty(HTMLMediaElement.prototype, 'volume', { configurable: true, get: () => 1, set() {} });
        const nativeSuspend = context.suspend.bind(context), nativeResume = context.resume.bind(context);
        const audit = window.onsetAudit = { context, audio, records, trace, gateSuspend: false, gateResume: false, pending: [], controls: 0,
            release() { this.gateSuspend = this.gateResume = false; this.pending.splice(0).forEach(fn => fn()); },
        };
        context.suspend = () => {
            audit.controls++;
            trace.push({ event: 'suspend-request', state: context.state, media: audio.at(-1)?.currentTime });
            return (audit.gateSuspend ? new Promise(resolve => audit.pending.push(() => resolve(nativeSuspend()))) : nativeSuspend())
                .then(() => { trace.push({ event: 'suspend-complete', state: context.state, media: audio.at(-1)?.currentTime }); }).finally(() => audit.controls--);
        };
        context.resume = () => { audit.controls++; trace.push({ event: 'resume-request', state: context.state }); return (audit.gateResume ? new Promise(resolve => audit.pending.push(() => resolve(nativeResume()))) : nativeResume()).then(() => { trace.push({ event: 'resume-complete', state: context.state }); }).finally(() => audit.controls--); };
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () { trace.push({ event: 'media-play', state: context.state, media: this.currentTime }); return play.call(this); };
        window.AudioContext = function () { return context; };
        audit.ready = context.audioWorklet.addModule('/tap.js').then(() => {
            const tap = new AudioWorkletNode(context, 'tap'); nativeConnect.call(tap, context.destination);
            tap.port.onmessage = ({data}) => records.push({ ...data, media: audio.at(-1)?.currentTime, state: context.state });
            AudioNode.prototype.connect = function (target, ...args) { return nativeConnect.call(this, target === context.destination ? tap : target, ...args); };
        });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => onsetAudit.ready);
    async function measure(label, run) {
        await page.evaluate(() => { onsetAudit.records.length = 0; onsetAudit.trace.length = 0; });
        await run();
        await page.waitForTimeout(950);
        const report = await page.evaluate(label => {
            const { records, trace } = onsetAudit;
            const voiced = records.filter(r => r.samples.some(v => Math.abs(v) > .005));
            // Count 1200Hz prefix energy vs 400Hz body energy at the actual destination tap.
            let prefixFrames = 0, bodyFrames = 0, sum = 0, count = 0;
            for (const record of voiced) {
                const samples = record.samples;
                const energy = hz => {
                    let re = 0, im = 0; samples.forEach((v, i) => { re += v * Math.cos(2 * Math.PI * hz * i / onsetAudit.context.sampleRate); im += v * Math.sin(2 * Math.PI * hz * i / onsetAudit.context.sampleRate); });
                    return re * re + im * im;
                };
                if (energy(1200) > energy(400) * 2) prefixFrames += samples.length; else bodyFrames += samples.length;
                samples.forEach(v => { sum += v * v; count++; });
            }
            return { label, prefixMs: prefixFrames / onsetAudit.context.sampleRate * 1000, bodyMs: bodyFrames / onsetAudit.context.sampleRate * 1000,
                rms: Math.sqrt(sum / count), firstOutputMedia: voiced[0]?.media, trace };
        }, label);
        reports.push(report); console.log(JSON.stringify(report));
        return report;
    }
    const complete = report => {
        assert.ok(report.prefixMs >= 150 && report.prefixMs <= 170, `${report.label}: complete prefix ${report.prefixMs}ms`);
        assert.ok(report.bodyMs >= 625 && report.bodyMs <= 655, `${report.label}: complete body ${report.bodyMs}ms`);
        assert.ok(report.firstOutputMedia < .06, `${report.label}: output ready near media start ${report.firstOutputMedia}`);
    };
    for (const gain of [.5, 1, 1.5]) {
        await page.evaluate(gain => { onsetFixture.fresh(); onsetFixture.volume(gain); }, gain);
        if (gain === 1) {
            // A non-unity -> unity player remains connected to Web Audio permanently.
            await page.evaluate(() => { onsetFixture.volume(.5); onsetFixture.prime(); });
            await page.waitForFunction(() => !onsetAudit.controls && onsetAudit.audio.at(-1).paused && !onsetAudit.audio.at(-1).getAttribute('src') && onsetAudit.context.state === 'suspended');
            await page.evaluate(() => onsetFixture.volume(1));
        }
        await page.evaluate(() => onsetAudit.context.suspend());
        complete(await measure(`cold graph ${gain}`, () => page.evaluate(() => onsetFixture.play())));
        complete(await measure(`idle cache replay ${gain}`, () => page.evaluate(() => onsetFixture.play())));
        await page.evaluate(async () => { await onsetFixture.play(); onsetAudit.gateSuspend = true; onsetFixture.stop(); });
        const raced = await measure(`pending suspend then cache replay ${gain}`, async () => {
            await page.evaluate(() => { window.startAttempt = onsetFixture.play(); });
            await page.waitForTimeout(25);
            assert.ok(await page.evaluate(() => onsetAudit.audio.at(-1).paused && onsetAudit.audio.at(-1).currentTime === 0), 'content transport waits for pending suspend');
            await page.evaluate(() => onsetAudit.release());
            await page.waitForTimeout(350);
            const state = await page.evaluate(() => ({ state: onsetAudit.context.state, media: onsetAudit.audio.at(-1).currentTime }));
            assert.equal(state.state, 'running', 'new clip cannot be suspended by old idle operation');
            await page.evaluate(() => window.startAttempt);
        });
        complete(raced);
        complete(await measure(`delayed resume ${gain}`, async () => {
            await page.evaluate(() => { onsetAudit.gateResume = true; window.startAttempt = onsetFixture.play(); });
            await page.waitForTimeout(25);
            assert.ok(await page.evaluate(() => onsetAudit.audio.at(-1).paused && onsetAudit.audio.at(-1).currentTime === 0), 'content transport waits for resume');
            await page.evaluate(() => onsetAudit.release()); await page.evaluate(() => window.startAttempt);
        }));
        complete(await measure(`rapid stop replay ${gain}`, () => page.evaluate(async () => { const old = onsetFixture.play(); onsetFixture.stop(); await onsetFixture.play(); await old; })));
        complete(await measure(`late gesture and stop replay ${gain}`, async () => {
            await page.evaluate(() => { onsetAudit.gateResume = true; onsetFixture.unlock(); window.oldStart = onsetFixture.play(); onsetFixture.stop(); window.startAttempt = onsetFixture.play(); });
            await page.waitForTimeout(25); await page.evaluate(() => onsetAudit.release());
            await page.evaluate(async () => { await window.startAttempt; await window.oldStart; });
        }));
        for (const buffer of [false, true]) complete(await measure(`${buffer ? 'buffer/iOS' : 'media/group/video'} call ${gain}`, () => page.evaluate(buffer => { void onsetFixture.call(buffer); }, buffer)));
        await page.waitForFunction(() => onsetAudit.context.state === 'suspended');
    }
    complete(await measure('rapid switch between independent players', async () => {
        await page.evaluate(() => {
            onsetAudit.gateResume = true;
            onsetFixture.fresh(); onsetFixture.volume(.5); window.oldStart = onsetFixture.play();
            onsetFixture.fresh(); onsetFixture.volume(1.5); window.startAttempt = onsetFixture.play();
        });
        await page.waitForTimeout(25); await page.evaluate(() => onsetAudit.release());
        await page.evaluate(async () => { await window.oldStart; await window.startAttempt; });
    }));
    await page.evaluate(() => playbackVolumeTest.ready(onsetFixture.blob));
    const bytes = Buffer.from(await page.evaluate(async () => Array.from(new Uint8Array(await onsetFixture.blob.arrayBuffer()))));
    const requests = [];
    let holdNext = false, heldRoute;
    await page.route('https://api.elevenlabs.io/**', async route => {
        requests.push(route.request().postDataJSON());
        if (holdNext) { holdNext = false; heldRoute = route; return; }
        await route.fulfill({ contentType: 'audio/wav', body: bytes });
    });
    async function transitionUnity(gain, action) {
        if (gain === 1) {
            if (await page.getByLabel('ElevenLabs 播放音量').count()) await page.getByLabel('ElevenLabs 播放音量').fill('0.5');
            else await page.evaluate(() => playbackVolumeTest.setVolume('a', .5));
            holdNext = true;
        }
        await action();
        if (gain === 1) {
            const deadline = Date.now() + 5000;
            while (!heldRoute && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
            assert.ok(heldRoute, 'synthesis waits while retained graph changes to unity');
            await page.evaluate(() => playbackVolumeTest.setVolume('a', 1));
            await heldRoute.fulfill({ contentType: 'audio/wav', body: bytes }); heldRoute = null;
        }
    }
    for (const gain of [.5, 1, 1.5]) {
        // Start a non-unity graph for 1x as well, then retain it on the same bubble.
        await page.evaluate(gain => { playbackVolumeTest.setVolume('a', gain === 1 ? .5 : gain); playbackVolumeTest.mountBubbles(); }, gain);
        const bubble = page.locator('[data-case="a"] .voice-msg-bubble');
        complete(await measure(`real cached bubble ${gain === 1 ? '.5 before unity' : gain}`, () => bubble.click()));
        await page.evaluate(gain => playbackVolumeTest.setVolume('a', gain), gain);
        const before = requests.length;
        complete(await measure(`real cached bubble replay ${gain}`, () => bubble.click()));
        assert.equal(requests.length, before, 'cached bubble never synthesizes');
        await page.evaluate(() => playbackVolumeTest.mountBubbles(true));
        complete(await measure(`real first synthesis bubble ${gain}`, () => transitionUnity(gain, () => bubble.click())));
        assert.equal(requests.length, before + 1, 'first bubble uses one synthetic response');
        await page.evaluate(() => { playbackVolumeTest.unmount(); playbackVolumeTest.mountSettings(); });
        await page.getByRole('button', { name: '编辑 Eleven A', exact: true }).click();
        complete(await measure(`real preview ${gain}`, () => transitionUnity(gain, () => page.getByRole('button', { name: '试听音色', exact: true }).click())));
        await page.evaluate(gain => { playbackVolumeTest.unmount(); if (gain === 1) playbackVolumeTest.setVolume('a', .5); playbackVolumeTest.mountReader(true); }, gain);
        complete(await measure(`real reading ${gain}`, () => transitionUnity(gain, () => page.getByRole('button', { name: 'reader start', exact: true }).click())));
        await page.evaluate(() => playbackVolumeTest.unmount());
    }
    console.log(`PASS ${reports.length} real destination onset measurements (synthetic fixture; no paid API)`);
    if (process.env.ONSET_REPORT) await fs.writeFile(process.env.ONSET_REPORT, JSON.stringify(reports, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
