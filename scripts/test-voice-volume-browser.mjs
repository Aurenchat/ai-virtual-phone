import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = await fs.mkdtemp(path.join(os.tmpdir(), "float-voice-volume-"));
const wp = require("next/dist/compiled/webpack/webpack");
wp.init();
await new Promise((resolve, reject) => wp.webpack({
    mode: "development", target: "web", devtool: false, context: repo,
    entry: path.join(repo, "scripts/voice-volume/fixture.tsx"),
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
    page.setDefaultTimeout(12000);
    await page.goto(origin);
    await page.evaluate(async () => { await window.voiceVolumeTest.ready(); window.voiceVolumeTest.mount(); });
    await page.getByRole("button", { name: "编辑 旧版 MiniMax" }).click();
    const volume = page.getByLabel("Minimax 音量");
    await volume.waitFor();
    check(await volume.inputValue() === "1", "legacy config displays 1.0x volume");
    check((await page.evaluate(() => window.voiceVolumeTest.configs().find(item => item.id === "legacy-minimax").speechVolume)) === undefined, "opening legacy config does not migrate or rewrite stored JSON");
    check((await volume.getAttribute("min")) === "0.1" && (await volume.getAttribute("max")) === "2" && (await volume.getAttribute("step")) === "0.1", "volume slider uses 0.1x to 2.0x range");
    check((await page.locator("text=1.0× 默认").count()) > 0, "volume UI labels 1.0x as default");
    await volume.fill("1.4");
    check((await page.evaluate(() => window.voiceVolumeTest.configs().find(item => item.id === "legacy-minimax").speechVolume)) === 1.4, "volume slider persists into VoiceApiConfig");
    await page.evaluate(() => window.voiceVolumeTest.mount());
    await page.getByRole("button", { name: "编辑 旧版 MiniMax" }).click();
    check(await page.getByLabel("Minimax 音量").inputValue() === "1.4", "saved volume restores after reopening settings");
    await page.locator(".modal-header-btn-muted").click();
    await page.getByRole("button", { name: "编辑 OpenAI" }).click();
    check(await page.getByLabel("Minimax 音量").count() === 0, "provider without synthesis volume is unaffected");
    console.log(`PASS ${passed} voice volume browser assertions`);
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
