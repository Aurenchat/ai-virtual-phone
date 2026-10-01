import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const repo = process.cwd();
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'float-status-renderers-'));
const output = path.join(repo, 'themes/imessage-native-day/verification/status-renderer-persistence');
await fs.mkdir(output, { recursive: true });

const JSZip = require('jszip');
const monologueZip = await JSZip.loadAsync(await fs.readFile('D:/系统文件/iMessage-%E7%8B%AC%E7%99%BD%E7%8A%B6%E6%80%81%E6%A0%8F-v0.3-%E5%AF%BC%E5%85%A5%E5%8C%85.zip'));
const monologueEntry = Object.values(monologueZip.files).find(entry => !entry.dir && entry.name.endsWith('.json'));
if (!monologueEntry) throw new Error('v0.3 scheme JSON is missing from the import package');
const monologueScheme = JSON.parse(await monologueEntry.async('string'));
const readingScheme = JSON.parse(await fs.readFile('D:/系统文件/微信读书日间_修复版_蓝色高亮.json', 'utf8'));

const entry = path.join(temp, 'entry.ts');
await fs.writeFile(entry, [
  `import ${JSON.stringify(path.join(repo, 'scripts/imessage-theme/fixture.tsx').replaceAll('\\', '/'))};`,
  `import * as status from ${JSON.stringify(path.join(repo, 'lib/chat-status-region.ts').replaceAll('\\', '/'))};`,
  `import { hydrateKvDb } from ${JSON.stringify(path.join(repo, 'lib/kv-db.ts').replaceAll('\\', '/'))};`,
  `Object.assign(window, { imStatus: status, imHydrateStatusTest: hydrateKvDb });`,
].join('\n'));

const wp = require('next/dist/compiled/webpack/webpack');
wp.init();
await new Promise((resolve, reject) => wp.webpack({
  mode: 'development', target: 'web', devtool: false, context: repo, entry,
  output: { path: temp, filename: 'fixture.js' },
  resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': repo }, fallback: { fs: false, path: false, crypto: false } },
  module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(repo, 'scripts/anonymous-xhs-phase0/ts-loader.cjs') }] },
  plugins: [new wp.webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('development') })],
}, (error, stats) => error || stats.hasErrors()
  ? reject(error || Error(stats.toString({ all: false, errors: true })))
  : resolve()));

const css = (await require('postcss')([require('@tailwindcss/postcss')({ base: repo })])
  .process(await fs.readFile('app/globals.css', 'utf8'), { from: path.join(repo, 'app/globals.css') })).css;
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/fixture.js') response.end(await fs.readFile(path.join(temp, 'fixture.js')));
    else if (url.pathname === '/style.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); }
    else if (url.pathname.startsWith('/theme/')) response.end(await fs.readFile(path.join(repo, 'themes/imessage-native-day', url.pathname.split('/').at(-1)), 'utf8'));
    else if (url.pathname === '/') response.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="/style.css"><style>html,body,#app{margin:0;width:100%;height:100%;overflow:hidden}#app{--page-header-safe-top:62px;--safe-area-top:62px}</style><div id="app"></div><script>window.process={env:{NODE_ENV:"development"}}</script><script src="/fixture.js"></script>');
    else { response.writeHead(404); response.end(); }
  } catch (error) { response.writeHead(500); response.end(String(error)); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const deps = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = require(path.join(deps, 'playwright'));
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const checks = [];
const check = (condition, name) => { assert.ok(condition, name); checks.push(name); console.log(`PASS ${name}`); };

try {
  const context = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.waitForFunction(() => window.imTest && window.imStatus);
  await page.evaluate(() => window.imTest.mount());
  await page.locator('.im-composer').waitFor();
  await page.evaluate(() => window.imTest.scene([]));

  const schemes = {
    monologue: { mode: 'custom', contract: monologueScheme.contract, renderHtml: monologueScheme.renderHtml, previewRaw: monologueScheme.previewRaw },
    reading: { mode: 'custom', contract: readingScheme.contract, renderHtml: readingScheme.renderHtml, previewRaw: readingScheme.previewRaw },
    native: { mode: 'native', contract: '', renderHtml: '', previewRaw: '' },
    off: { mode: 'off', contract: '', renderHtml: '', previewRaw: '' },
  };
  const raw = {
    monologue: '角色=王宇昊\n[内心]The renderer must stay here.|渲染器必须保持不变。[/内心]',
    reading: '书名=Letters to a Young Poet\n作者=Rainer Maria Rilke\n书摘=For one human being to love another.\n划线高亮=For one human being to love another.\n书摘翻译=人与人相爱。\n评述人=noreply\n书评长文=Distance cannot dilute the need to be seen.\n书评翻译=距离无法冲淡渴望被看见的需要。',
  };

  const addWithScheme = async (scheme, content, statusPanel) => page.evaluate(({ scheme, content, statusPanel }) => {
    const sessionId = window.imTest.chat.loadChatSessions()[0].id;
    window.imStatus.saveStatusRegionConfig(sessionId, scheme);
    const message = window.imTest.add({ content, statusPanel, statusRegionMode: 'custom' });
    window.imTest.remount();
    return { id: message.id, sessionId: message.sessionId, rendererId: message.statusRendererId };
  }, { scheme, content, statusPanel });

  const a = await addWithScheme(schemes.monologue, 'message A monologue', raw.monologue);
  const b = await addWithScheme(schemes.reading, 'message B reading', raw.reading);
  const c = await addWithScheme(schemes.monologue, 'message C monologue', raw.monologue.replace('stay here', 'stay on C'));
  await page.evaluate(scheme => {
    const sessionId = window.imTest.chat.loadChatSessions()[0].id;
    window.imStatus.saveStatusRegionConfig(sessionId, scheme);
  }, schemes.native);
  const d = await addWithScheme(schemes.reading, 'message D reading', raw.reading.replace('Distance', 'Time'));
  const silent = await addWithScheme(schemes.monologue, '', raw.monologue.replace('stay here', 'stay silent'));
  await page.evaluate(scheme => {
    const sessionId = window.imTest.chat.loadChatSessions()[0].id;
    window.imStatus.saveStatusRegionConfig(sessionId, scheme);
    window.imTest.remount();
  }, schemes.native);

  check(Boolean(a.rendererId && b.rendererId && c.rendererId && d.rendererId), 'new custom status messages persist renderer references');
  check(a.rendererId === c.rendererId, 'same monologue renderer deduplicates to one immutable snapshot');
  check(b.rendererId === d.rendererId && a.rendererId !== b.rendererId, 'reading and monologue keep distinct renderer versions');

  const rebuilt = await page.evaluate(({ scheme, statusPanel }) => {
    const sessionId = window.imTest.chat.loadChatSessions()[0].id;
    window.imStatus.saveStatusRegionConfig(sessionId, scheme);
    const splitSource = window.imTest.add({ content: 'split source', statusPanel, statusRegionMode: 'custom' });
    const split = window.imTest.chat.replaceMessageWithParts(splitSource.id, [{ content: 'split result' }]);
    const batchSource = window.imTest.add({ content: 'batch source', responseBatchId: 'status_batch_test', rawResponseText: 'batch source', statusPanel, statusRegionMode: 'custom' });
    const batch = window.imTest.chat.replaceResponseBatchWithParts(sessionId, 'status_batch_test', 'batch result', [{ content: 'batch result' }], {
      statusPanel, statusRegionMode: 'custom', statusRendererId: batchSource.statusRendererId,
    });
    const groupSource = window.imTest.add({ content: 'group source', responseRoundId: 'status_round_test', statusPanel, statusRegionMode: 'custom', senderCharacterId: 'im-reference', senderName: 'dickhead' });
    const group = window.imTest.chat.replaceGroupResponseRound(sessionId, 'status_round_test', 'group result', [{
      content: 'group result', statusPanel, statusRegionMode: 'custom', statusRendererId: groupSource.statusRendererId, senderCharacterId: 'im-reference', senderName: 'dickhead',
    }]);
    window.imTest.remount();
    return {
      source: splitSource.statusRendererId,
      split: split[0]?.statusRendererId,
      batch: batch[0]?.statusRendererId,
      group: group[0]?.statusRendererId,
    };
  }, { scheme: schemes.monologue, statusPanel: raw.monologue });
  check(rebuilt.source === rebuilt.split && rebuilt.source === rebuilt.batch && rebuilt.source === rebuilt.group, 'split, edited batch and edited group preserve renderer identity');

  const insertLegacy = (id, content, statusPanel, statusRendererId) => page.evaluate(({ id, content, statusPanel, statusRendererId }) => {
    const sessionId = window.imTest.chat.loadChatSessions()[0].id;
    window.imTest.chat.upsertImportedChatMessage({
      id, sessionId, role: 'assistant', content, status: 'sent', createdAt: new Date().toISOString(),
      statusPanel, statusRegionMode: 'custom', statusRendererId,
    });
    window.imTest.remount();
  }, { id, content, statusPanel, statusRendererId });
  await insertLegacy('legacy_monologue', 'legacy monologue', raw.monologue);
  await insertLegacy('legacy_reading', 'legacy reading', raw.reading);
  await insertLegacy('legacy_unknown', 'legacy unknown', 'alpha=1\nbeta=2');
  await insertLegacy('legacy_missing_ref', 'missing snapshot', raw.monologue, 'status_renderer_missing');
  const legacyAudit = await page.evaluate(({ monologueRaw, readingRaw }) => {
    const sessionId = window.imTest.chat.loadChatSessions()[0].id;
    const before = window.imStatus.listStatusRendererSnapshots().length;
    const first = window.imStatus.getLegacyStatusRendererCandidates(monologueRaw);
    const second = window.imStatus.getLegacyStatusRendererCandidates(monologueRaw);
    const reading = window.imStatus.getLegacyStatusRendererCandidates(readingRaw);
    const legacy = window.imTest.chat.loadChatMessages(sessionId).find(message => message.id === 'legacy_monologue');
    return { before, after: window.imStatus.listStatusRendererSnapshots().length, first, second, reading, persistedId: legacy?.statusRendererId };
  }, { monologueRaw: raw.monologue, readingRaw: raw.reading });
  check(legacyAudit.first.length === 1 && legacyAudit.reading.length === 1 && legacyAudit.first[0] !== legacyAudit.reading[0], 'legacy audit identifies each known schema uniquely');
  check(JSON.stringify(legacyAudit.first) === JSON.stringify(legacyAudit.second) && legacyAudit.before === legacyAudit.after && !legacyAudit.persistedId, 'legacy audit is idempotent and does not rewrite message data');
  await page.evaluate(scheme => {
    const sessionId = window.imTest.chat.loadChatSessions()[0].id;
    window.imStatus.saveStatusRegionConfig(sessionId, scheme);
    window.imTest.remount();
  }, schemes.off);

  const openStatus = async (id) => {
    const block = page.locator('.im-message-block').filter({ has: page.locator(`[data-msg-id="${id}"]`) });
    const heart = block.locator('.im-message-row > button.chat-monologue-heart');
    await heart.scrollIntoViewIfNeeded();
    await heart.click();
    await page.waitForTimeout(180);
    const frame = block.locator('iframe[title="自定义状态栏"]');
    return { block, heart, frame };
  };
  const assertRenderer = async (id, marker, label) => {
    const opened = await openStatus(id);
    check(await opened.frame.count() === 1, `${label}: custom frame renders`);
    check((await opened.frame.getAttribute('srcdoc')).includes(marker), `${label}: expected immutable renderer HTML is used`);
    await opened.heart.click();
  };
  await assertRenderer(a.id, 'id="statusCard"', 'A monologue after switching status off');
  await assertRenderer(b.id, 'id="quoteCard"', 'B reading after switching status off');
  await assertRenderer(c.id, 'id="statusCard"', 'C monologue after switching status off');
  await assertRenderer(d.id, 'id="quoteCard"', 'D reading after switching status off');
  await assertRenderer('legacy_monologue', 'id="statusCard"', 'legacy monologue unique schema recovery');
  await assertRenderer('legacy_reading', 'id="quoteCard"', 'legacy reading unique schema recovery');

  for (const id of ['legacy_unknown', 'legacy_missing_ref']) {
    const opened = await openStatus(id);
    check(await opened.frame.count() === 0, `${id}: unresolved history never borrows current renderer`);
    check(await opened.block.getByText('历史状态栏样式不可用，已显示原始内容', { exact: true }).count() === 1, `${id}: explicit safe fallback is shown`);
    await opened.heart.click();
  }

  const firstBlock = page.locator('.im-message-block').filter({ has: page.locator(`[data-msg-id="${a.id}"]`) });
  const firstHeart = firstBlock.locator('.im-message-row > button.chat-monologue-heart');
  const collapsedPlain = await firstHeart.evaluate(element => getComputedStyle(element).color);
  check(collapsedPlain !== 'rgb(0, 122, 255)', 'plain collapsed heart is not blue');
  await firstHeart.click();
  await page.waitForTimeout(250);
  const expandedPlain = await firstHeart.evaluate(element => ({ color: getComputedStyle(element).color, active: element.hasAttribute('data-active') }));
  check(expandedPlain.active && expandedPlain.color === 'rgb(0, 122, 255)', `expanded heart is iMessage blue (${JSON.stringify(expandedPlain)})`);
  await page.screenshot({ path: path.join(output, 'plain-expanded.png') });
  await firstHeart.click();
  await page.waitForTimeout(250);
  check(await firstHeart.evaluate(element => getComputedStyle(element).color) === collapsedPlain, 'collapse restores plain heart color');
  const silentHeart = page.locator('.im-message-row > div.chat-monologue-heart').first();
  const silentIcon = silentHeart.locator(':scope > span.chat-monologue-heart');
  check(await silentIcon.evaluate(element => getComputedStyle(element).color) === collapsedPlain, 'status-only history uses the same plain collapsed color');
  await silentHeart.click();
  await page.waitForTimeout(250);
  check(await silentIcon.evaluate(element => getComputedStyle(element).color) === 'rgb(0, 122, 255)', 'status-only expanded heart is iMessage blue');
  await silentHeart.click();
  await page.waitForTimeout(250);
  await page.evaluate(() => window.imTest.wallpaper(true));
  await page.waitForTimeout(250);
  const wallpaperBlock = page.locator('.im-message-block').filter({ has: page.locator(`[data-msg-id="${a.id}"]`) });
  const wallpaperHeart = wallpaperBlock.locator('.im-message-row > button.chat-monologue-heart');
  const collapsedWallpaper = await wallpaperHeart.evaluate(element => getComputedStyle(element).color);
  check(collapsedWallpaper !== 'rgb(0, 122, 255)' && collapsedWallpaper !== collapsedPlain, 'wallpaper collapsed heart uses the light neutral state');
  const silentWallpaperIcon = page.locator('.im-message-row > div.chat-monologue-heart > span.chat-monologue-heart').first();
  check(await silentWallpaperIcon.evaluate(element => getComputedStyle(element).color) === collapsedWallpaper, 'status-only history uses the same wallpaper collapsed color');
  await wallpaperHeart.click();
  await page.waitForTimeout(250);
  check(await wallpaperHeart.evaluate(element => getComputedStyle(element).color) === 'rgb(0, 122, 255)', 'wallpaper expanded heart is iMessage blue');
  await page.screenshot({ path: path.join(output, 'wallpaper-expanded.png') });
  await wallpaperHeart.click();
  check(Boolean(silent.id), 'status-only message remains persisted');

  await page.evaluate(() => { for (let index = 0; index < 60; index += 1) window.imTest.add({ content: `paging filler ${index}` }); window.imTest.remount(); });
  check(await page.locator(`[data-msg-id="${a.id}"]`).count() === 0, 'old renderer-bound message starts outside the initial page');
  await page.getByRole('button', { name: '查看更多消息' }).click();
  await page.waitForTimeout(250);
  check(await page.locator(`[data-msg-id="${a.id}"]`).count() === 1, 'history pagination restores the bound message');
  await assertRenderer(a.id, 'id="statusCard"', 'paginated A monologue');

  await page.evaluate(() => window.imTest.leave());
  await page.evaluate(() => window.imTest.remount());
  await page.waitForTimeout(250);
  check((await page.evaluate(id => window.imTest.chat.loadChatMessages(window.imTest.chat.loadChatSessions()[0].id).find(message => message.id === id)?.statusRendererId, a.id)) === a.rendererId, 'leaving and re-entering preserves the message renderer id');

  await page.reload();
  await page.waitForFunction(() => window.imTest && window.imStatus && window.imHydrateStatusTest);
  await page.evaluate(async () => { await window.imHydrateStatusTest(); await window.imTest.chat.hydrateChatStorage(); });
  const afterReload = await page.evaluate(({ aId, bId }) => {
    const messages = window.imTest.chat.loadChatMessages(window.imTest.chat.loadChatSessions()[0].id);
    const aMessage = messages.find(message => message.id === aId);
    const bMessage = messages.find(message => message.id === bId);
    return {
      aId: aMessage?.statusRendererId,
      bId: bMessage?.statusRendererId,
      aSource: window.imStatus.resolveStatusRendererForMessage(aMessage?.statusRendererId, aMessage?.statusPanel || '').source,
      bSource: window.imStatus.resolveStatusRendererForMessage(bMessage?.statusRendererId, bMessage?.statusPanel || '').source,
      rendererCount: window.imStatus.listStatusRendererSnapshots().length,
    };
  }, { aId: a.id, bId: b.id });
  check(afterReload.aId === a.rendererId && afterReload.bId === b.rendererId, 'refresh preserves renderer references in message storage');
  check(afterReload.aSource === 'message' && afterReload.bSource === 'message' && afterReload.rendererCount >= 2, 'refresh restores the immutable renderer registry');

  const modulesSource = await fs.readFile(path.join(repo, 'lib/data-management/modules.ts'), 'utf8');
  check(modulesSource.includes('"ai_phone_chat_status_renderers_v1"'), 'full and cloud backup chat module includes the renderer registry');
  check(errors.length === 0, 'real ChatRoom run has no uncaught browser errors');
  await fs.writeFile(path.join(output, 'browser-results.json'), JSON.stringify({ checks, errors, rendererIds: { a: a.rendererId, b: b.rendererId } }, null, 2));
  console.log(`${checks.length} passed / 0 failed`);
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
