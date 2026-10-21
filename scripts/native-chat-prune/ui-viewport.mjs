import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ts = require('typescript');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const output = path.resolve(process.env.NATIVE_PRUNE_OUTPUT || 'deliveries/native-chat-prune/ui-viewport');
fs.mkdirSync(output, { recursive: true });
// The real production CSS is required so layout assertions do not run against unstyled JSX.
const cssDir = path.resolve(process.env.NATIVE_PRUNE_CSS_DIR || '.next/static/css');
const cssFiles = fs.readdirSync(cssDir, { recursive: true }).filter(p => p.endsWith('.css'));
assert.ok(cssFiles.length, 'run the production build first');
const css = cssFiles.map(p => fs.readFileSync(path.join(cssDir, p), 'utf8')).join('\n');
const compiled = {};
function compile(name, file) {
    compiled[name] = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
}
for (const name of ['chat-db', 'chat-storage', 'chat-cloud-delete', 'chat-history-prune', 'chat-prune-validation']) compile(name, `lib/${name}.ts`);
for (const [name, file] of Object.entries({ react: 'react/cjs/react.production.js', 'react/jsx-runtime': 'react/cjs/react-jsx-runtime.production.js', 'react-dom': 'react-dom/cjs/react-dom.production.js', 'react-dom/client': 'react-dom/cjs/react-dom-client.production.js', scheduler: 'scheduler/cjs/scheduler.production.js' })) compiled[name] = fs.readFileSync(path.join('node_modules', file), 'utf8');
compiled['lucide-react'] = fs.readFileSync(require.resolve('lucide-react'), 'utf8');
compile('dialog', 'components/chat/chat-history-prune-dialog.tsx');
compile('profile', 'components/chat/user-profile-panel.tsx');
compile('page-shell', 'components/ui/page-shell.tsx');
compile('form', 'components/ui/form.tsx');
let fixture = fs.readFileSync('scripts/native-chat-prune/browser-fixture.js', 'utf8');
const profileImports = [...fs.readFileSync('components/chat/user-profile-panel.tsx', 'utf8').matchAll(/from "([^"]+)"/g)].map(m => m[1]);
fixture += `
const noopComponent=()=>null;
for(const id of ${JSON.stringify(profileImports)}) {
 if(['react','lucide-react','@/lib/chat-storage','@/lib/character-storage','@/lib/kv-db'].includes(id))continue;
 fake[id]=new Proxy({__esModule:true,default:noopComponent},{get:(obj,key)=>key in obj?obj[key]:noopComponent});
}
fake['./chat-history-prune-dialog']=load('dialog');
fake['@/components/ui/page-shell']=load('page-shell');
fake['@/components/ui/form']=load('form');
fake['@/lib/settings-storage']=fake['./settings-storage'];
fake['@/lib/kv-db']=fake['./kv-db'];
fake['@/lib/moments-storage']={getAllPosts:()=>[]};
fake['@/lib/wallet-storage']={loadWalletState:()=>({cards:[]}),getWalletBalance:()=>0,formatWalletAmount:()=> '0.00',WALLET_UPDATED_EVENT:'synthetic-wallet-update'};
window.openUI=async(profile=false)=>{
 await seed(120);
 const long='超长合成会话名称'.repeat(80);
 const session=storage.loadChatSessions().find(s=>s.id==='target');session.alias=long;await db.sessions.put(session);
 document.body.innerHTML='<div style="height:1800px"><button id="before">Background</button><div id="host" style="transform:translateZ(0);width:100%;height:100%"></div></div>';
 window.uiRoot=load('react-dom/client').createRoot(document.getElementById('host'));
 const React=load('react');
 function App(){const [open,setOpen]=React.useState(true);return open?React.createElement(load(profile?'profile':'dialog')[profile?'UserProfilePanel':'ChatHistoryPruneDialog'],{onClose:()=>setOpen(false)}):null;}
 uiRoot.render(React.createElement(App));
};
`;
const bundle = 'const SOURCES=' + JSON.stringify(compiled) + ';' + fixture;
const dexie = fs.readFileSync(require.resolve('dexie'), 'utf8');
const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js' || req.url === '/dexie.js') { res.setHeader('Content-Type', 'application/javascript; charset=utf-8'); res.end(req.url === '/bundle.js' ? bundle : dexie); }
    else if (req.url === '/ui.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
    else { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/ui.css"><script src="/dexie.js"></script><script src="/bundle.js"></script>'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = 'http://127.0.0.1:' + server.address().port;
const results = [], errors = []; let browser;
async function check(name, fn) { try { const evidence = await fn(); results.push({ name, status: 'PASS', evidence }); console.log('PASS ' + name); } catch (e) { results.push({ name, status: 'FAIL', error: String(e) }); console.error('FAIL ' + name + ' ' + e); throw e; } }
try {
    const options = { headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) };
    browser = await chromium.launch(options);
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
    const page = await context.newPage(); page.on('pageerror', e => { errors.push(String(e)); console.error('PAGE ERROR '+e.stack); });
    const dialog = page.getByRole('dialog', { name: '裁剪历史', exact: true });
    const scroll = () => dialog.locator('.overflow-y-auto');
    async function open(profile = false) { await page.goto(url); await page.evaluate(profile => openUI(profile), profile); if (!profile) await dialog.waitFor(); }
    async function bounds() {
        const result = await dialog.evaluate(el => {
            const panel = el.firstElementChild, inner = panel.querySelector('.overflow-y-auto'), b = panel.getBoundingClientRect(), v = visualViewport;
            return { box: { x: b.x, y: b.y, right: b.right, bottom: b.bottom }, viewport: { x: v.offsetLeft, y: v.offsetTop, right: v.offsetLeft + v.width, bottom: v.offsetTop + v.height }, panelOverflow: panel.scrollWidth - panel.clientWidth, innerOverflow: inner.scrollWidth - inner.clientWidth, bodyLocked: document.body.style.position === 'fixed', portal: el.parentElement === document.body, controlFonts: [...el.querySelectorAll('select,input[type=number]')].map(c => getComputedStyle(c).fontSize) };
        });
        const { box: b, viewport: v } = result;
        assert.ok(b.x >= v.x && b.y >= v.y && b.right <= v.right + 1 && b.bottom <= v.bottom + 1, JSON.stringify(result));
        assert.equal(result.panelOverflow, 0); assert.equal(result.innerOverflow, 0); assert.equal(result.portal, true); assert.equal(result.bodyLocked, true);
        assert.ok(result.controlFonts.every(f => parseFloat(f) >= 16)); return result;
    }
    await check('entry uses existing settings rows, matching linear icon and exact order; opens existing dialog', async () => {
        assert.ok(!fs.readFileSync('components/chat/chat-message-list.tsx', 'utf8').includes('HistoryPrune'));
        await open(true);
        const row = page.getByRole('button', { name: /^裁剪历史/ });
        const evidence = await row.evaluate(el => ({ order: [...el.parentElement.children].map(c => c.querySelector('.font-semibold')?.textContent), icon: el.querySelector('svg').getAttribute('stroke-width'), iconClass: el.querySelector('svg').getAttribute('class'), class: el.className, previousClass: el.previousElementSibling.className }));
        assert.deepEqual(evidence.order, ['扩展插件', '裁剪历史', '底层调用大模型日志']);
        assert.equal(evidence.class, evidence.previousClass); assert.equal(evidence.icon, '1.25'); assert.match(evidence.iconClass, /lucide-scissors/);
        await row.click(); await dialog.waitFor(); await bounds(); await page.getByRole('button', { name: '关闭', exact: true }).click(); await dialog.waitFor({ state: 'detached' });
        assert.equal(await row.count(), 1); return evidence;
    });
    for (const viewport of [{ width: 320, height: 568 }, { width: 393, height: 852 }, { width: 844, height: 390 }, { width: 320, height: 260 }, { width: 1280, height: 900 }]) {
        await check(`viewport ${viewport.width}x${viewport.height}: long labels + local-only + custom remain bounded`, async () => {
            await page.setViewportSize(viewport); await open(); await dialog.getByRole('combobox').nth(0).selectOption('target');
            await dialog.getByRole('combobox').nth(1).selectOption('custom'); await dialog.getByRole('spinbutton').fill('50');
            await dialog.getByRole('combobox').nth(2).selectOption('local-only'); await dialog.getByRole('checkbox').check();
            const result = await bounds();
            assert.equal(await dialog.getByRole('button', { name: '暂停本机微信同步并重载' }).count(), 1);
            await page.getByRole('button', { name: '关闭', exact: true }).click(); await dialog.waitFor({ state: 'detached' }); return result;
        });
    }
    await check('only inner content scrolls; wheel does not move background at either boundary', async () => {
        await page.setViewportSize({ width: 393, height: 600 }); await open(); await dialog.getByRole('combobox').nth(2).selectOption('local-only');
        const before = await bounds(), rect = await scroll().boundingBox(); await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await page.mouse.wheel(0, 900); await page.waitForFunction(() => document.querySelector('[role=dialog] .overflow-y-auto').scrollTop > 0);
        await scroll().evaluate(el => el.scrollTop = el.scrollHeight); await page.mouse.wheel(0, 900);
        assert.deepEqual((await bounds()).box, before.box); assert.equal(await page.evaluate(() => scrollY), 0);
        await scroll().evaluate(el => el.scrollTop = 0); await page.mouse.wheel(0, -900); assert.deepEqual((await bounds()).box, before.box);
    });
    await check('iOS fallback cancels horizontal, backdrop, top/bottom overscroll; allows internal vertical touch', async () => {
        const result = await dialog.evaluate(el => {
            const scroller = el.querySelector('.overflow-y-auto');
            const dispatch = (target, x, y) => { target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [new Touch({ identifier: 1, target, clientX: 100, clientY: 100 })] })); const move = new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [new Touch({ identifier: 1, target, clientX: x, clientY: y })] }); target.dispatchEvent(move); return move.defaultPrevented; };
            scroller.scrollTop = 0; const horizontal = dispatch(scroller, 150, 101), top = dispatch(scroller, 100, 150), backdrop = dispatch(el, 100, 50);
            scroller.scrollTop = 30; const inside = dispatch(scroller, 100, 90);
            scroller.scrollTop = scroller.scrollHeight; const bottom = dispatch(scroller, 100, 50);
            return { horizontal, top, backdrop, inside, bottom };
        });
        assert.deepEqual(result, { horizontal: true, top: true, backdrop: true, inside: false, bottom: true }); return result;
    });
    await check('visual viewport resize / offset keeps dialog within keyboard-visible area', async () => {
        // Synthetic visualViewport events cover listener logic; this is not an iOS keyboard test.
        await page.evaluate(() => { Object.defineProperty(visualViewport, 'height', { configurable: true, value: 280 }); Object.defineProperty(visualViewport, 'offsetTop', { configurable: true, value: 70 }); visualViewport.dispatchEvent(new Event('resize')); });
        const result = await bounds(); await page.screenshot({ path: path.join(output, 'keyboard-area.png') });
        await page.evaluate(() => { delete visualViewport.height; delete visualViewport.offsetTop; visualViewport.dispatchEvent(new Event('resize')); }); return result;
    });
    await check('safe-area padding, clipping and scroll direction are applied', async () => {
        const r = await dialog.evaluate(el => { const s = getComputedStyle(el), inner = getComputedStyle(el.querySelector('.overflow-y-auto')); return { padding: s.padding, overflow: s.overflow, innerX: inner.overflowX, innerY: inner.overflowY, overscroll: inner.overscrollBehaviorY, safeArea: el.style.paddingTop }; });
        assert.match(r.safeArea, /env\(safe-area-inset-top\)/); assert.equal(r.overflow, 'hidden'); assert.equal(r.innerX, 'hidden'); assert.equal(r.innerY, 'auto'); assert.equal(r.overscroll, 'contain'); return r;
    });
    await check('selection/custom quantity/preview invalidation/second confirmation/busy controls still work', async () => {
        await open(); await dialog.getByRole('combobox').nth(0).selectOption('target'); await dialog.getByRole('combobox').nth(1).selectOption('50');
        await dialog.getByRole('button', { name: '预检', exact: true }).click(); await dialog.getByText('删除前总数：120', { exact: true }).waitFor();
        await dialog.getByRole('combobox').nth(1).selectOption('custom'); await dialog.getByRole('spinbutton').fill('37'); assert.equal(await dialog.getByText('删除前总数：120', { exact: true }).count(), 0);
        await dialog.getByRole('button', { name: '预检', exact: true }).click(); await dialog.getByText('预计保留：37', { exact: true }).waitFor(); await dialog.getByRole('button', { name: '继续裁剪' }).click();
        assert.equal(await page.evaluate(() => db.messages.count()), 127);
        await page.evaluate(() => { load('chat-cloud-delete').deleteChatMessagesFromCloudChecked = () => new Promise(r => window.releaseCloud = r); });
        await dialog.getByRole('button', { name: '确认删除' }).click(); await page.waitForFunction(() => !!window.releaseCloud);
        assert.equal(await dialog.getByRole('button', { name: '关闭', exact: true }).isDisabled(), true); assert.equal(await dialog.getByRole('combobox').nth(0).isDisabled(), true);
        await page.keyboard.press('Escape'); assert.equal(await dialog.count(), 1); await page.evaluate(() => releaseCloud(0));
        await dialog.getByText('已确认保存：删除 83 条消息。', { exact: true }).waitFor(); assert.equal(await page.evaluate(() => db.messages.count()), 44);
        await bounds(); await page.screenshot({ path: path.join(output, 'confirmed.png') }); await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
    });
    await check('keyboard focus cycles within dialog', async () => {
        await open(); await page.keyboard.press('Tab'); assert.equal(await dialog.getByRole('combobox').nth(0).evaluate(el => el === document.activeElement), true);
        await page.keyboard.press('Shift+Tab'); assert.equal(await dialog.getByRole('button', { name: '关闭', exact: true }).evaluate(el => el === document.activeElement), true);
        await page.keyboard.press('Tab'); assert.equal(await dialog.getByRole('combobox').nth(0).evaluate(el => el === document.activeElement), true);
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
    });
    await check('close/unmount restores document styles, scroll position and previous focus', async () => {
        await page.goto(url); await page.evaluate(async () => { document.documentElement.style.height = 'auto'; document.documentElement.style.overflow = 'auto'; document.body.style.height = 'auto'; document.body.style.overflow = 'clip'; document.documentElement.style.setProperty('overscroll-behavior', 'contain', 'important'); document.body.innerHTML = '<button id="opener">Open</button><div style="height:2500px"></div><div id="mount"></div>'; window.scrollTo(0, 150); if(scrollY !== 150)throw Error('scroll restoration fixture must start at 150'); document.getElementById('opener').focus({ preventScroll: true }); await seed(120); window.closeRoot = load('react-dom/client').createRoot(document.getElementById('mount')); closeRoot.render(load('react').createElement(load('dialog').ChatHistoryPruneDialog, { onClose: () => closeRoot.unmount() })); });
        await dialog.waitFor(); await bounds(); await dialog.getByRole('button', { name: '关闭', exact: true }).click(); await dialog.waitFor({ state: 'detached' });
        const r = await page.evaluate(() => ({ overflow: document.body.style.overflow, position: document.body.style.position, overscroll: document.documentElement.style.getPropertyValue('overscroll-behavior'), priority: document.documentElement.style.getPropertyPriority('overscroll-behavior'), scrollY, focus: document.activeElement.id }));
        assert.deepEqual(r, { overflow: 'clip', position: '', overscroll: 'contain', priority: 'important', scrollY: 150, focus: 'opener' }); return r;
    });
    await check('no uncaught render/event errors', async () => { assert.deepEqual(errors, []); });
    const webkitInstalled = fs.existsSync(webkit.executablePath());
    fs.writeFileSync(path.join(output, 'webkit-availability.json'), JSON.stringify({ installed: webkitInstalled, physicalIOS: 'UNVERIFIED', scope: 'Chromium mobile viewport and synthetic touch/visualViewport tests do not establish WKWebView device acceptance.' }, null, 2));
} finally {
    await browser?.close(); await new Promise(r => server.close(r));
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ syntheticOnly: true, productionCSS: cssFiles, results }, null, 2));
}
