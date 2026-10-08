// Runs actual PhoneChatApp/ChatRoom. Extracts DesktopShell's mini hooks, mini JSX
// and full-chat branch verbatim; unrelated desktop apps/services are omitted.
// All storage belongs to a disposable localhost origin and browser context.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const ts = require('typescript');
const repo = path.resolve(__dirname, '..');

async function main() {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'float-runtime-memory-'));
    const source = await fs.readFile(path.join(repo, 'components/desktop-shell.tsx'), 'utf8');
    const ast = ts.createSourceFile('shell.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let mini, full;
    function visit(node) {
        if (ts.isJsxExpression(node) && node.expression?.getText(ast).includes('<MiniAppWindow')) mini = node.expression.getText(ast);
        if (ts.isIfStatement(node) && node.expression.getText(ast) === 'activeApp === "chat"' && node.thenStatement.getText(ast).includes('<PhoneChatApp')) full = node.getText(ast);
        ts.forEachChild(node, visit);
    }
    visit(ast);
    assert.ok(mini && full, 'DesktopShell chat mount branches found');
    const start = source.indexOf('  // Mini chat window state');
    const end = source.indexOf('  const openChatSessionFromNotice', start);
    assert.ok(start >= 0 && end > start, 'DesktopShell mini lifecycle hooks found');
    const phone = await fs.readFile(path.join(repo, 'components/chat/phone-chat-app.tsx'), 'utf8');
    assert.ok(!phone.includes('visitedSessions'), 'visited room cache removed');
    await fs.writeFile(path.join(temp, 'shell.tsx'), `
import React, {useState, useEffect, useRef, useCallback} from ${JSON.stringify(require.resolve('react'))};
import {PhoneChatApp} from ${JSON.stringify(path.join(repo, 'components/chat/phone-chat-app'))};
import MiniAppWindow from ${JSON.stringify(path.join(repo, 'components/music/mini-app-window'))};
type IconId = string;
export function Shell() {
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const activeAppRef = useRef(activeApp);
  useEffect(() => { activeAppRef.current = activeApp; }, [activeApp]);
  const [chatInitSessionId, setChatInitSessionId] = useState<string | null>(null);
  const [activeChatSession, setActiveChatSession] = useState(null);
  const musicOverlayControllerRef = useRef(null);
  ${source.slice(start, end)}
  function renderApp() { ${full} return null; }
  return <div data-ui="phone-screen" style={{position:'relative',height:'100%'}}>
    <button id="full-chat" onClick={() => setActiveApp('chat')}>Full chat</button>
    <button id="desktop" onClick={() => setActiveApp(null)}>Desktop</button>
    ${'{' + mini + '}'}{renderApp()}
  </div>;
}
`);
    await fs.writeFile(path.join(temp, 'entry.tsx'), `import {Shell} from './shell'; import {init} from ${JSON.stringify(path.join(repo, 'scripts/chat-runtime-memory/fixture'))}; init(Shell);`);
    // Observe entry into actual TTS functions without changing their behavior.
    await fs.writeFile(path.join(temp, 'tts-probe-loader.cjs'), `
const ts = require(${JSON.stringify(require.resolve('typescript'))});
const transpile = require(${JSON.stringify(path.join(repo, 'scripts/anonymous-xhs-phase0/ts-loader.cjs'))});
module.exports = function(source) {
 const ast = ts.createSourceFile(this.resourcePath, source, ts.ScriptTarget.Latest, true);
 const edits = ast.statements.filter(n => ts.isFunctionDeclaration(n) && ['resolveVoiceConfig','synthesizeSpeech'].includes(n.name?.text)).map(n => ({pos:n.body.getStart(ast)+1,name:n.name.text})).sort((a,b)=>b.pos-a.pos);
 if (edits.length !== 2) throw Error('Both TTS entry probes must be installed');
 for (const e of edits) source = source.slice(0,e.pos) + 'window.__ttsCalls.' + e.name + '++;' + source.slice(e.pos);
 return transpile.call(this,source);
};`);
    await fs.writeFile(path.join(temp, 'sticker-probe-loader.cjs'), `
const transpile = require(${JSON.stringify(path.join(repo, 'scripts/anonymous-xhs-phase0/ts-loader.cjs'))});
module.exports = function(source) {
 const original = 'findCustomStickerByName, resolveCustomStickerUrl';
 if (!source.includes(original)) throw Error('Sticker resolver import changed');
 source = source.replace(original, 'findCustomStickerByName, resolveCustomStickerUrl as storageResolveCustomStickerUrl');
 source += \`\nfunction resolveCustomStickerUrl(assetId: string): Promise<string | null> {
   const probe = (window as any).__stickerReadProbe;
   return probe ? probe(assetId, () => storageResolveCustomStickerUrl(assetId)) : storageResolveCustomStickerUrl(assetId);
 }
 export const __stickerCacheTest = {
   get: getCachedStickerUrl, set: cacheStickerUrl, resolve: resolveStickerAsset,
   maxEntries: STICKER_CACHE_MAX_ENTRIES, maxChars: STICKER_CACHE_MAX_CHARS,
   snapshot: () => ({keys: [..._stickerUrlCache.keys()], chars: stickerCacheChars, active: activeStickerResolves, queued: stickerResolveQueue.length, inFlight: stickerResolvesInFlight.size}),
   reset() { if(stickerResolvesInFlight.size) throw Error('Cannot reset pending reads'); _stickerUrlCache.clear(); stickerCacheChars = 0; }
 };\`;
 return transpile.call(this,source);
};`);
    // Also observe the real single/bulk asset APIs, so a hidden pack-wide read
    // cannot evade tests by bypassing StickerBubble's resolver.
    await fs.writeFile(path.join(temp, 'asset-probe-loader.cjs'), `
const ts = require(${JSON.stringify(require.resolve('typescript'))});
const transpile = require(${JSON.stringify(path.join(repo, 'scripts/anonymous-xhs-phase0/ts-loader.cjs'))});
module.exports = function(source) {
 const ast = ts.createSourceFile(this.resourcePath, source, ts.ScriptTarget.Latest, true);
 const edits = ast.statements.filter(n => ts.isFunctionDeclaration(n) && ['getThemeAssetDataUrl','getThemeAssetMap'].includes(n.name?.text)).map(n => ({pos:n.body.getStart(ast)+1,arg:n.parameters[0].name.getText(ast),single:n.name.text==='getThemeAssetDataUrl'})).sort((a,b)=>b.pos-a.pos);
 if(edits.length !== 2) throw Error('Single and bulk asset API probes required');
 for(const e of edits) {
   const ids = e.single ? '[' + e.arg + ']' : e.arg;
   source = source.slice(0,e.pos) + '(window as any).__stickerImageReadProbe?.(' + ids + ');' + source.slice(e.pos);
 }
 return transpile.call(this,source);
};`);
    const wp = require('next/dist/compiled/webpack/webpack'); wp.init();
    await new Promise((resolve, reject) => wp.webpack({
        mode: 'development', target: 'web', devtool: false, context: repo,
        entry: path.join(temp, 'entry.tsx'), output: { path: temp, filename: 'fixture.js' },
        resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': repo }, modules: [path.join(repo, 'node_modules')], fallback: { fs: false, path: false, crypto: false } },
        module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, oneOf: [
            { test: /[\\/]tts-service\.ts$/, use: path.join(temp, 'tts-probe-loader.cjs') },
            { test: /[\\/]message-bubble\.tsx$/, use: path.join(temp, 'sticker-probe-loader.cjs') },
            { test: /[\\/]theme-storage\.ts$/, use: path.join(temp, 'asset-probe-loader.cjs') },
            { use: path.join(repo, 'scripts/anonymous-xhs-phase0/ts-loader.cjs') },
        ] }] },
        plugins: [new wp.webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('development') })],
    }, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString({ all: false, errors: true }))) : resolve()));
    const css = (await require('postcss')([require('@tailwindcss/postcss')({ base: repo })]).process(await fs.readFile(path.join(repo, 'app/globals.css'), 'utf8'), { from: path.join(repo, 'app/globals.css') })).css;
    const pending = [];
    const server = http.createServer(async (req, res) => {
        try {
            const pathname = new URL(req.url, 'http://localhost').pathname;
            if (pathname === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(await fs.readFile(path.join(temp, 'fixture.js'))); }
            else if (pathname === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
            else if (pathname === '/api/llm-proxy' || pathname === '/v1/chat/completions') {
                req.resume(); pending.push(res); // Intentionally deferred until AFTER unmount.
            } else if (pathname === '/') {
                res.setHeader('Content-Type', 'text/html');
                res.end(`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><style>html,body,#app{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="app"></div><script>
window.process={env:{NODE_ENV:'development'}}; window.__ttsCalls={resolveVoiceConfig:0,synthesizeSpeech:0};
window.__urls={created:[],revoked:[]};
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=b=>{const u=create(b);window.__urls.created.push(u);return u};
URL.revokeObjectURL=u=>{window.__urls.revoked.push(u);return revoke(u)};
window.__played=[];const play=HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play=function(){window.__played.push(this.src);return play.call(this)};
</script><script src="/fixture.js"></script>`);
            } else { res.writeHead(404); res.end(); }
        } catch (error) { res.writeHead(500); res.end(String(error)); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
    let browser;
    const results = [], errors = [];
    const check = (condition, label) => { assert.ok(condition, label); results.push(label); console.log('PASS ' + label); };
    const resolveReply = text => {
        assert.ok(pending.length, 'generation reached deferred API');
        const res = pending.shift(); res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: text }, finish_reason: 'stop' }] }));
    };
    const waitForRequest = async () => {
        const deadline = Date.now() + 15000;
        while (!pending.length && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
        assert.ok(pending.length, 'API request starts within 15 seconds');
    };
    try {
        browser = await chromium.launch({ headless: true, channel: process.env.CHAT_TEST_BROWSER_CHANNEL || 'msedge' });
        const context = await browser.newContext({ viewport: { width: 430, height: 880 } });
        await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
        const page = await context.newPage(); page.setDefaultTimeout(15000);
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(origin); await page.waitForFunction(() => !!window.hostMemoryTest);
        await page.evaluate(async () => { await window.hostMemoryTest.ready(); window.hostMemoryTest.mount(); });
        await page.locator('#full-chat').waitFor();
        const count = () => page.locator('.chat-room-wrapper').count();
        const back = async () => { await page.locator('.chat-room-wrapper .page-back-btn[aria-label="返回"]').click(); await page.waitForFunction(() => !document.querySelector('.chat-room-wrapper')); };
        const open = async id => {
            await page.evaluate(id => window.hostMemoryTest.open(id), id);
            await page.waitForFunction(id => !!document.querySelector('.session-' + window.hostMemoryTest.sessions[id].id), id);
            check(await count() === 1, `session ${id}: exactly one ordinary ChatRoom`);
        };
        const openMini = async () => {
            await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-mini-chat')));
            await page.locator('.chat-app').waitFor();
        };
        const before = await page.evaluate(() => window.hostMemoryTest.snapshot());
        check(before.records.length === 112, '110 A messages and B/C persisted in IndexedDB');
        check(await page.locator('.chat-app').count() === 0, 'closed mini has no PhoneChatApp tree');
        await openMini(); check(await page.locator('.chat-app').count() === 1, 'open-mini-chat mounts one PhoneChatApp');
        await open('A');
        await page.waitForFunction(() => document.querySelectorAll('.chat-msg-wrapper[id^="message-"]').length === 50);
        check(true, '110 history: first mount shows 50');
        await page.getByText('查看更多消息', { exact: true }).click();
        await page.waitForFunction(() => document.querySelectorAll('.chat-msg-wrapper[id^="message-"]').length === 80);
        check(true, 'load more shows 80');
        await page.locator('.chat-room-wrapper textarea').fill('unsent local draft');
        await open('B'); check(await page.locator('.chat-room-wrapper textarea').inputValue() === '', 'A to B fresh component state');
        await open('C'); await back();
        for (const label of ['消息', '动态', '联系人', '主页']) {
            await page.locator('.chat-tab').filter({ hasText: label }).click();
            check(await count() === 0, `${label}: zero ordinary ChatRooms`);
        }
        await open('A');
        await page.waitForFunction(() => document.querySelectorAll('.chat-msg-wrapper[id^="message-"]').length === 50);
        check(await page.locator('.chat-room-wrapper textarea').inputValue() === '', 'reenter resets history to 50 and drops draft');
        const loadedImages = async () => {
            await page.waitForFunction(() => [...document.querySelectorAll('.chat-room-wrapper img')].some(img => img.src.startsWith('blob:') && img.complete && img.naturalWidth > 0));
            await page.waitForFunction(() => { const img = document.querySelector('.chat-sticker-image img'); return img?.complete && img.naturalWidth > 0; });
        };
        await loadedImages();
        const imageUrl = await page.locator('.chat-room-wrapper img').evaluateAll(imgs => imgs.find(img => img.src.startsWith('blob:') && img.naturalWidth > 0).src);
        check(true, 'persisted image and custom sticker render after remount');
        await page.locator('.voice-msg-bubble').click();
        await page.waitForFunction(() => window.__played.length > 0);
        check(await page.evaluate(() => window.__played.at(-1) === window.hostMemoryTest.messages().find(m => m.mediaType === 'audio').mediaUrl), 'persisted voice plays its saved audio');
        await back();
        check(await page.evaluate(url => window.__urls.revoked.includes(url), imageUrl), 'room unmount revokes its image object URL');
        await open('A'); await loadedImages();
        const newImageUrl = await page.locator('.chat-room-wrapper img').evaluateAll(imgs => imgs.find(img => img.src.startsWith('blob:') && img.naturalWidth > 0).src);
        check(newImageUrl !== imageUrl, 'remount creates fresh image object URL from IndexedDB');
        const playedBefore = await page.evaluate(() => window.__played.length);
        await page.locator('.voice-msg-bubble').click();
        await page.waitForFunction(n => window.__played.length > n, playedBefore).catch(async error => {
            console.error(await page.evaluate(() => ({ played: window.__played.length, tts: window.__ttsCalls, voice: window.hostMemoryTest.messages().find(m => m.mediaType === 'audio'), bubble: document.querySelector('.voice-msg-bubble')?.textContent })));
            throw error;
        });
        check(await page.evaluate(() => window.__played.at(-1) === window.hostMemoryTest.messages().find(m => m.mediaType === 'audio').mediaUrl), 'remounted voice reuses the same persisted audio');
        check(await page.evaluate(() => window.__ttsCalls.resolveVoiceConfig === 0 && window.__ttsCalls.synthesizeSpeech === 0), 'persisted voice remount/play never enters TTS');
        assert.deepEqual(await page.evaluate(() => window.hostMemoryTest.snapshot()), before);
        check(true, 'persisted message records/IDs/media refs/sticker metadata unchanged');
        const assets = await page.evaluate(() => window.hostMemoryTest.assets());
        check(assets.imageBytes > 0 && assets.sticker?.startsWith('data:image/'), 'image blob and sticker assetId still resolve from stores');
        await page.evaluate(() => window.hostMemoryTest.merged(['B']));
        check(await count() === 1, 'merge of another session leaves current room mounted');
        await page.evaluate(() => window.hostMemoryTest.merged(['A']));
        await page.waitForFunction(() => !document.querySelector('.chat-room-wrapper'));
        check(true, 'merged active session unmounts its room');
        await open('A');
        await page.evaluate(() => window.hostMemoryTest.reply());
        await page.waitForFunction(() => !!window.hostMemoryTest.lock());
        await waitForRequest();
        await back(); check(await count() === 0, 'pending generation room truly unmounted');
        resolveReply('Deferred reply persisted.');
        await page.waitForFunction(() => window.hostMemoryTest.messages().some(m => m.role === 'assistant' && m.content.includes('Deferred reply persisted.')) && !window.hostMemoryTest.lock());
        const afterReply = await page.evaluate(() => window.hostMemoryTest.snapshot());
        check(afterReply.records.some(m => m.content.includes('Deferred reply persisted.')), 'deferred reply persisted in IndexedDB after unmount');
        check(await page.evaluate(() => window.hostMemoryTest.completions() === 1), 'unmounted generation dispatches background completion and clears lock');
        await open('A'); await page.locator('.chat-room-wrapper').getByText('Deferred reply persisted.', { exact: true }).waitFor();
        check(true, 'fresh room shows deferred reply');
        await page.evaluate(() => window.hostMemoryTest.reply());
        await page.waitForFunction(() => !!window.hostMemoryTest.lock());
        await waitForRequest();
        resolveReply('Second generation works.');
        await page.locator('.chat-room-wrapper').getByText('Second generation works.', { exact: true }).waitFor();
        await page.waitForFunction(() => !window.hostMemoryTest.lock());
        check(true, 'module generation run cleared: next generation completes');
        await page.evaluate(() => { window.hostMemoryTest.observePacing(); window.hostMemoryTest.reply(); });
        await waitForRequest();
        resolveReply('Paced reply one\n\nPaced reply two\n\nPaced reply three');
        await page.locator('.chat-room-wrapper').getByText('Paced reply one', { exact: true }).waitFor();
        check(await page.locator('.chat-room-wrapper').getByText('Paced reply two', { exact: true }).count() === 0, 'non-instant reply publishes its first bubble before the remaining bubbles');
        await page.locator('.chat-room-wrapper').getByText('Paced reply three', { exact: true }).waitFor();
        const pacing = await page.evaluate(() => window.hostMemoryTest.pacing());
        check(pacing['Paced reply two'] - pacing['Paced reply one'] >= 700 && pacing['Paced reply three'] - pacing['Paced reply two'] >= 700, 'non-instant reply retains the 800ms delays between successive bubbles');
        await page.waitForFunction(() => !window.hostMemoryTest.lock());
        await page.locator('button[title="关闭"]').click();
        await page.waitForFunction(() => !document.querySelector('.chat-app'));
        check(await count() === 0, 'mini close unmounts PhoneChatApp and its room');
        await openMini(); check(await count() === 0, 'reopened mini fresh mounts at message list');
        await open('A');
        await page.locator('#full-chat').click(); await page.locator('.chat-app').waitFor();
        check(await page.locator('.chat-app').count() === 1, 'full chat replaces mini: one PhoneChatApp');
        check(await page.locator('button[title="关闭"]').count() === 0, 'full chat leaves no mini window');
        await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-mini-chat')));
        check(await page.locator('.chat-app').count() === 1, 'open-mini-chat while full chat is active cannot duplicate host');
        await page.locator('#desktop').evaluate(button => button.click()); await page.waitForFunction(() => !document.querySelector('.chat-app'));
        check(true, 'leaving full chat cannot resurrect old mini');
        await openMini(); await open('A');
        await page.locator('button[title="展开"]').click();
        await page.waitForFunction(() => document.querySelectorAll('.chat-app').length === 1 && !document.querySelector('button[title="关闭"]') && !!document.querySelector('.chat-room-wrapper'));
        check(true, 'mini expand preserves selected session in one fresh full host');
        assert.deepEqual(errors, []); check(true, 'no browser page errors');
        await require('./chat-runtime-memory/sticker-scenarios.cjs')({ page, check });
        assert.deepEqual(errors, []); check(true, 'lazy sticker scenarios have no browser page errors or unhandled rejections');
        console.log(JSON.stringify({ checks: results.length, results, errors }, null, 2));
    } finally {
        for (const res of pending) res.destroy();
        await browser?.close(); await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
