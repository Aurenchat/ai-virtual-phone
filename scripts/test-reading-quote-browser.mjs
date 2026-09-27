// Run with Node. Uses an installed Playwright (or READING_TEST_NODE_MODULES) and an isolated Chromium profile.
// Optional --pdf uses pdf.min.js and pdf.worker.min.js v3.11.174 in READING_TEST_PDFJS_DIR
// (default: the OS temp directory / float-reading-pdfjs-3.11.174). No external API calls are made.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runReadingTtsBrowser } from "./reading-quote/tts-scenarios.mjs";
const require = createRequire(import.meta.url);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = await fs.mkdtemp(path.join(os.tmpdir(), "float-reading-quote-"));
const pdfjsDir = process.env.READING_TEST_PDFJS_DIR || path.join(os.tmpdir(), "float-reading-pdfjs-3.11.174");
const testPdf = process.argv.includes("--pdf");
function pdfFixture() {
    const stream = "BT /F1 18 Tf 40 720 Td (PDF first line for native selection.) Tj 0 -32 Td (Second line across selectable text.) Tj ET";
    const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>", `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Contents 6 0 R >>", "<< /Length 0 >>\nstream\n\nendstream", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
    let pdf = "%PDF-1.4\n"; const offsets = [0];
    objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(offset => String(offset).padStart(10, "0") + " 00000 n \n").join("");
    return [...Buffer.from(pdf + `trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xref}\n%%EOF`)];
}
const wp = require("next/dist/compiled/webpack/webpack");
wp.init();
await new Promise((resolve, reject) => wp.webpack({
    mode: "development", target: "web", devtool: false, context: repo,
    entry: path.join(repo, "scripts/reading-quote/fixture.tsx"),
    output: { path: output, filename: "fixture.js" },
    resolve: { extensions: [".tsx", ".ts", ".js"], alias: { "@": repo }, fallback: { fs: false, path: false, crypto: false } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(repo, "scripts/anonymous-xhs-phase0/ts-loader.cjs") }] },
    plugins: [new wp.webpack.DefinePlugin({ "process.env.NODE_ENV": JSON.stringify("development") })],
}, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString({ all: false, errors: true }))) : resolve()));
const css = (await require("postcss")([require("@tailwindcss/postcss")({ base: repo })]).process(await fs.readFile(path.join(repo, "app/globals.css"), "utf8"), { from: path.join(repo, "app/globals.css") })).css;
const requests = [];
const server = http.createServer(async (req, res) => {
    if (req.method === "POST") {
        let raw = ""; for await (const part of req) raw += part;
        requests.push(JSON.parse(raw));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: "我看到了你引用的文字。" }, finish_reason: "stop" }] }));
    } else if (req.url === "/fixture.js") { res.setHeader("Content-Type", "text/javascript"); res.end(await fs.readFile(path.join(output, "fixture.js"))); }
    else if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); res.end(css); }
    else { res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="app" style="position:relative;width:100vw;height:100dvh"></div><script>window.process={env:{NODE_ENV:"development"}};</script><script src="/fixture.js"></script>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let playwright;
try { playwright = require("playwright"); } catch {
    playwright = require(path.join(process.env.READING_TEST_NODE_MODULES || path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"), "playwright"));
}
const browser = await playwright.chromium.launch({ headless: true, channel: process.env.READING_TEST_BROWSER_CHANNEL || "msedge" });
let passed = 0;
const check = (condition, label) => { assert.ok(condition, label); passed++; console.log(`PASS ${label}`); };
try {
    for (const mobile of [false, true]) {
        const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 960, height: 820 }, isMobile: mobile, hasTouch: mobile });
        await context.route("**/*", route => {
            const url = route.request().url();
            if (url.startsWith(origin)) return route.continue();
            if (testPdf && url.startsWith("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/")) return route.fulfill({ path: path.join(pdfjsDir, url.split("/").at(-1)), contentType: "text/javascript", headers: { "Access-Control-Allow-Origin": "*" } });
            return route.abort();
        });
        const page = await context.newPage();
        page.setDefaultTimeout(12000);
        page.on("pageerror", error => console.error("PAGE ERROR", error.message));
        await page.goto(origin);
        await page.evaluate(async () => { await window.readingQuoteTest.ready(); await window.readingQuoteTest.mount(); });
        if (process.argv.includes("--tts-only")) {
            await runReadingTtsBrowser({ page, mobile, check, pdfFixture, testPdf, output });
            await context.close(); continue;
        }
        const body = page.locator('[data-ui="body"]');
        const action = page.locator(".reading-quote-action");
        const input = page.locator('.reading-chat-float-input input');
        const draft = page.locator(".reading-quote-preview--draft");
        await page.locator('[data-reading-text="true"]').first().waitFor();
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        await page.waitForTimeout(250);
        if (!mobile) {
            const points = await page.locator('[data-reading-text="true"]').first().evaluate(el => {
                const node = el.firstChild;
                const range = document.createRange(); range.setStart(node, 2); range.setEnd(node, 10);
                const rect = range.getBoundingClientRect(); return { x: rect.x, y: rect.y + rect.height / 2, end: rect.right };
            });
            await page.mouse.move(points.x, points.y); await page.mouse.down();
            await page.mouse.move(points.end, points.y, { steps: 12 }); await page.mouse.up();
            try { await action.waitFor(); } catch (error) {
                await page.screenshot({ path: path.join(output, "drag-failure.png") });
                console.error("Drag failed", { output, points }, await page.evaluate(() => ({ selection: window.getSelection().toString(), rect: document.querySelector('[data-reading-text="true"]')?.getBoundingClientRect().toJSON() })));
                throw error;
            }
            check((await page.evaluate(() => window.getSelection().toString())).length > 0, "real mouse drag selects body text without navigation");
        }
        const select = async (from = 0, to = 0, a = 2, b = 9) => page.evaluate(({ from, to, a, b }) => {
            const paragraphs = document.querySelectorAll('[data-ui="body"] [data-reading-text="true"]');
            const range = document.createRange();
            range.setStart(paragraphs[from].firstChild, a); range.setEnd(paragraphs[to].firstChild, b);
            const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
            return selection.toString();
        }, { from, to, a, b });
        const selected = await select();
        await action.waitFor();
        if (mobile) await action.tap(); else await action.click();
        check(await draft.locator("blockquote").textContent() === selected, `partial native selection (${mobile ? "touch" : "desktop"})`);
        await input.fill("最初的问题");
        await page.getByRole("button", { name: "关闭聊天悬浮窗", exact: true }).click();
        await page.getByRole("button", { name: "打开聊天悬浮窗", exact: true }).click();
        await page.locator(".reading-chat-float-trigger").click();
        check(await input.inputValue() === "最初的问题" && await draft.count() === 1, "close/reopen preserves quote and input");
        await page.getByRole("button", { name: "取消引用" }).click();
        check(await input.inputValue() === "最初的问题" && await draft.count() === 0, "cancel preserves user text");
        await page.getByRole("button", { name: "关闭聊天悬浮窗", exact: true }).click();
        const across = await select(0, 1, 5, 12);
        check(!across.includes("批注"), "native cross-paragraph text excludes annotation");
        const crossMetadata = await page.evaluate(() => window.readingQuoteTest.readReadingSelection(document.querySelector('[data-ui="body"]'), window.getSelection(), "测试书").quote);
        check(crossMetadata.chapterIndex === 0 && crossMetadata.startParagraphIndex === 0 && crossMetadata.endParagraphIndex === 1, "cross-paragraph metadata uses native range endpoints");
        await action.click();
        check(await draft.locator("blockquote").textContent() === across, "cross-paragraph quote");
        await page.getByRole("button", { name: "关闭聊天悬浮窗", exact: true }).click();
        const replacement = await select(1, 1, 1, 7);
        await action.click();
        check(await draft.locator("blockquote").textContent() === replacement, "second selection replaces pending quote");
        await input.fill("修改后的问题");
        await page.getByRole("button", { name: "发送", exact: true }).click();
        await page.waitForFunction(() => window.readingQuoteTest.messages().some(m => m.role === "assistant"));
        const saved = await page.evaluate(() => window.readingQuoteTest.messages().find(m => m.content === "修改后的问题"));
        check(saved.mediaData.readingQuote.text === replacement && saved.mediaData.readingQuote.startParagraphIndex === 1, "send stores full quote/metadata and separate user content");
        check(await draft.count() === 0 && await input.inputValue() === "", "successful send clears draft");
        check(await page.locator('.chat-msg-wrapper .reading-quote-preview blockquote').textContent() === replacement, "sent bubble displays quote");
        for (const unified of [false, true]) {
            const prompt = await page.evaluate(unified => JSON.stringify(window.readingQuoteTest.prompt(unified)), unified);
            check(prompt.includes("[引用书中文字]") && prompt.includes(replacement) && prompt.includes("[用户]"), `assembler ${unified ? "unified" : "legacy"} history retains quote`);
        }
        const timeline = await page.evaluate(() => window.readingQuoteTest.timeline());
        check(timeline.some(entry => entry.sourceApp === "chat" && entry.content.includes(replacement)), "existing chat memory timeline retains quote");
        check(JSON.stringify(requests.at(-1)).includes("[引用书中文字]"), "actual reading request carries structured quote");
        const bubble = page.locator('.chat-msg-wrapper[data-role="user"]').filter({ hasText: "修改后的问题" });
        await bubble.click({ button: "right" });
        await page.locator('.reading-chat-context-menu').getByRole("button", { name: "编辑" }).click();
        await page.locator('.reading-discuss-edit-textarea').fill("编辑后的正文");
        await page.getByRole("button", { name: "保存", exact: true }).click();
        check((await page.evaluate(() => window.readingQuoteTest.messages().find(m => m.content === "编辑后的正文"))).mediaData.readingQuote.text === replacement, "edit preserves quote metadata");
        await page.locator('.chat-msg-wrapper[data-role="user"]').filter({ hasText: "编辑后的正文" }).click({ button: "right" });
        await page.locator('.reading-chat-context-menu').getByRole("button", { name: "删除" }).click();
        check(!(await page.evaluate(() => window.readingQuoteTest.messages())).some(m => m.id === saved.id), "delete removes whole quoted message");
        await input.fill("普通共读消息"); await page.getByRole("button", { name: "发送", exact: true }).click();
        await page.waitForFunction(() => window.readingQuoteTest.messages().some(m => m.content === "普通共读消息"));
        check(!(await page.evaluate(() => window.readingQuoteTest.messages().find(m => m.content === "普通共读消息"))).mediaData.readingQuote, "ordinary and legacy messages stay compatible");
        await page.getByRole("button", { name: "关闭聊天悬浮窗", exact: true }).click();
        await page.evaluate(() => window.getSelection().removeAllRanges());
        await page.waitForTimeout(40);
        check(await action.count() === 0, "empty selection hides action");
        await page.locator('.reading-annotation-text').first().evaluate(el => {
            const range = document.createRange(); range.selectNodeContents(el);
            window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
        });
        await page.waitForTimeout(50);
        check(await action.count() === 0, "annotation-only selection is rejected");
        await select(); await action.click();
        // Explicit chapter navigation must clear only the temporary selection, not the saved draft.
        await select(1, 1, 1, 6); await action.waitFor();
        await page.locator(".reading-header").evaluate(el => el.closest('.reading-app-surface').dataset.immersive = 'false');
        await page.getByRole("button", { name: "下一章", exact: true }).dispatchEvent("click");
        check(await draft.count() === 1 && await action.count() === 0, "chapter change preserves saved quote and clears temporary range");
        await page.evaluate(() => window.readingQuoteTest.mount("page", "epub", "other-book"));
        await page.locator('[data-reading-text="true"]').first().waitFor(); await page.waitForTimeout(300);
        check(await draft.count() === 0, "book change clears pending quote");
        const before = await page.locator('.reading-immersive-page').textContent();
        await select(); await action.waitFor();
        await body.dispatchEvent("click", { clientX: 940, clientY: 140 });
        check(await page.locator('.reading-immersive-page').textContent() === before, "selection prevents page-turn click in EPUB page mode");
        await action.click();
        await page.screenshot({ path: path.join(output, mobile ? "mobile.png" : "desktop.png") });
        await page.getByRole("button", { name: "关闭聊天悬浮窗", exact: true }).click();
        await page.getByRole("button", { name: "打开聊天悬浮窗", exact: true }).waitFor();
        const annotation = page.locator('.reading-annotation-interactive').first();
        await annotation.dispatchEvent('pointerdown', { pointerType: mobile ? 'touch' : 'mouse', pointerId: 1 });
        await page.waitForTimeout(550);
        check(await annotation.locator('.reading-annotation-menu').count() === 1, "annotation long press still works without selection");
        await annotation.dispatchEvent('pointerup', { pointerType: mobile ? 'touch' : 'mouse', pointerId: 1 });
        // First body tap dismisses the annotation menu, the next turns the page.
        const stage = page.locator('.reading-page-stage');
        const stageBox = await stage.boundingBox();
        await page.mouse.click(stageBox.x + stageBox.width - 12, stageBox.y + stageBox.height - 12);
        await page.mouse.click(stageBox.x + stageBox.width - 12, stageBox.y + stageBox.height - 12);
        await page.waitForTimeout(300);
        check(await page.locator('.reading-immersive-page').textContent() !== before, "normal page-turn click remains available");
        const longText = await page.evaluate(() => window.readingQuoteTest.longQuoteRequest());
        check(JSON.stringify(requests.at(-1)).includes(longText), "current long quote survives tiny history budget intact");
        if (testPdf) {
            await page.evaluate(async bytes => {
                await window.readingQuoteTest.reading.saveRawFile("pdf-test", new Uint8Array(bytes).buffer);
                await window.readingQuoteTest.mount("scroll", "pdf", "pdf-test");
            }, pdfFixture());
            await page.locator('.reading-pdf-text-layer span').first().waitFor();
            await page.waitForTimeout(400);
            const pdfText = await page.locator('.reading-pdf-text-layer span').first().evaluate(el => {
                const range = document.createRange(); range.setStart(el.firstChild, 4); range.setEnd(el.firstChild, 14);
                window.getSelection().removeAllRanges(); window.getSelection().addRange(range); return window.getSelection().toString();
            });
            await action.click();
            check(await draft.locator('blockquote').textContent() === pdfText, "real PDF.js text layer supports partial native quote");
            await page.evaluate(() => {
                const r = window.readingQuoteTest.reading;
                r.saveReadingInteractionConfig({ ...r.loadReadingInteractionConfig(), pdfPreloadRadius: 2 });
                window.dispatchEvent(new Event("reading-interaction-config-changed"));
            });
            await page.waitForTimeout(500);
            check(await page.locator('.reading-pdf-text-layer span').count() > 0, "PDF cached-page rebuild preserves selectable text");
            await page.evaluate(() => {
                const r = window.readingQuoteTest.reading;
                r.saveReadingInteractionConfig({ ...r.loadReadingInteractionConfig(), pdfZoom: 1.25 });
                window.dispatchEvent(new Event("reading-interaction-config-changed"));
            });
            await page.waitForTimeout(600);
            const aligned = await page.locator('.reading-pdf-text-layer').first().evaluate(layer => {
                const canvas = layer.parentElement.querySelector('canvas');
                return Math.abs(canvas.getBoundingClientRect().width - layer.getBoundingClientRect().width) < 1;
            });
            check(aligned, "PDF zoom aligns text layer and canvas");
            check(await page.locator('canvas[data-page="2"]').count() === 1, "PDF page without text still renders");
            await page.screenshot({ path: path.join(output, mobile ? "pdf-mobile.png" : "pdf-desktop.png") });
        }
        if (process.argv.includes("--tts")) await runReadingTtsBrowser({ page, mobile, check, pdfFixture, testPdf, output });
        await context.close();
    }
    console.log(`PASS ${passed} browser assertions; evidence: ${output}`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
