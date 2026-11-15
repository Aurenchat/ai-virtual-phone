import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = await fs.mkdtemp(path.join(os.tmpdir(), "float-elevenlabs-"));
const wp = require("next/dist/compiled/webpack/webpack");
wp.init();
await new Promise((resolve, reject) => wp.webpack({
    mode: "development", target: "web", devtool: false, context: repo,
    entry: path.join(repo, "scripts/elevenlabs/fixture.tsx"),
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
try {
    const page = await browser.newPage({ viewport: { width: 430, height: 850 } });
    const speech = [], requests = [], heldRoutes = [];
    let holdSpeech = false;
    await page.route("https://api.elevenlabs.io/**", async route => {
        const request = route.request(); requests.push(request.url());
        if (request.method() === "GET") {
            const second = new URL(request.url()).searchParams.has("next_page_token");
            await route.fulfill({ json: second ? { voices: [{ voice_id: "second", name: "Second voice" }], has_more: false }
                : { voices: [{ voice_id: "voice/test", name: "Test voice" }], has_more: true, next_page_token: "next" } });
        } else {
            speech.push(request.postDataJSON());
            if (holdSpeech) { heldRoutes.push(route); return; }
            // Browser playback receives a valid silent WAV; no real speech service or credentials.
            const wav = Buffer.alloc(48); wav.write("RIFF"); wav.writeUInt32LE(40,4); wav.write("WAVEfmt ",8);
            wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22); wav.writeUInt32LE(48000,24);
            wav.writeUInt32LE(96000,28); wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34); wav.write("data",36); wav.writeUInt32LE(4,40);
            await route.fulfill({ contentType: "audio/wav", body: wav });
        }
    });
    await page.goto(origin);
    await page.evaluate(async () => { await window.elevenTest.ready(); window.elevenTest.mount(); });
    await page.getByRole("button", { name: "编辑 Eleven fixture" }).click();
    check(await page.getByText("稳定性", { exact: false }).count() > 0, "v2 controls render");
    await page.getByRole("button", { name: "同步音色列表" }).click();
    await page.waitForFunction(() => window.elevenTest.configs()[0].customVoices?.length === 2);
    check(requests.filter(url => url.includes("/v2/voices?")).length === 2, "voice sync reads all pages");
    const voices = page.locator("select").filter({ has: page.locator('option[value="voice/test"]') });
    await voices.selectOption("second");
    const model = page.locator("select").filter({ has: page.locator('option[value="eleven_v3"]') });
    await model.selectOption("eleven_v4");
    await page.getByLabel("v4 稳定性").fill("0.8");
    await page.getByLabel("v4 语言代码").fill("zh");
    check((await page.evaluate(() => window.elevenTest.configs()[0])).elevenLabs.stability === .8, "v4 parameters persist");
    await page.evaluate(() => window.elevenTest.mount());
    await page.getByRole("button", { name: "编辑 Eleven fixture" }).click();
    check(await page.getByLabel("v4 语言代码").inputValue() === "zh", "saved model and language restore after remount");
    holdSpeech = true;
    await page.evaluate(() => {
        window.audioCreations = 0;
        const OriginalAudio = window.Audio;
        window.Audio = class extends OriginalAudio { constructor(...args) { super(...args); window.audioCreations++; } };
    });
    await page.getByRole("button", { name: "试听音色", exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="停止试听"]'));
    const previewDeadline = Date.now() + 5000;
    while (!heldRoutes.length && Date.now() < previewDeadline) await new Promise(resolve => setTimeout(resolve, 10));
    assert.ok(heldRoutes.length, "preview request started");
    await page.getByRole("button", { name: "停止试听", exact: true }).click();
    await heldRoutes.pop().abort().catch(() => {});
    check(await page.getByRole("button", { name: "试听音色", exact: true }).count() === 1, "stopping pending preview resets control");
    check(await page.evaluate(() => window.audioCreations === 0), "cancelled preview never creates an audio player");
    holdSpeech = false;
    await page.evaluate(() => window.elevenTest.bubble());
    check(speech.at(-1).text === "[soft, affectionate tone] Hello." && speech.at(-1).model_id === "eleven_v4", "parsed bilingual voice bubble reaches serialized ElevenLabs body with directions");
    check(speech.at(-1).language_code === "zh" && !Object.hasOwn(speech.at(-1).voice_settings,"speed"), "v4 request excludes unsupported speed");
    const provider = page.locator("select").filter({ has: page.locator('option[value="ElevenLabs"]') });
    await provider.selectOption("OpenAI");
    check((await page.getByPlaceholder("输入密钥...").inputValue()) === "", "provider switch clears former key");
    check((await page.evaluate(() => window.elevenTest.configs()[0])).customVoices.length === 0, "provider switch clears former voice list");
    await provider.selectOption("ElevenLabs");
    check(await page.getByPlaceholder("粘贴 ElevenLabs Voice ID").inputValue() === "", "ElevenLabs accepts manual Voice ID without unrelated defaults");
    console.log(`PASS ${passed} ElevenLabs browser assertions (synthetic, no paid calls)`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
