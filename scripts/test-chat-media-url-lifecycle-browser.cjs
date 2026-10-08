// Actual private Bubbles and media API, with test-only deferred reads/delivery.
// All IndexedDB data belongs to a disposable localhost browser context.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

async function main() {
    const repo = path.resolve(__dirname, '..');
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'float-media-lifecycle-'));
    const transpile = JSON.stringify(path.join(repo, 'scripts/anonymous-xhs-phase0/ts-loader.cjs'));
    await fs.writeFile(path.join(temp, 'bubble-loader.cjs'), `
const transpile = require(${transpile});
module.exports = function(source) {
 source = source.replace('const [resolution, setResolution]', 'const [resolution, actualSetResolution]');
 source = source.replace('    useEffect(() => {\\n        const requestId = ++requestIdRef.current;',
   '    function setResolution(value: any) { if(value) (window as any).__resolutionWrites++; actualSetResolution(value); }\\n    useEffect(() => {\\n        const requestId = ++requestIdRef.current;');
 source += '\\nexport { ImageBubble as __ImageBubbleTest, MediaFileBubble as __MediaFileBubbleTest };';
 return transpile.call(this, source);
};`);
    await fs.writeFile(path.join(temp, 'media-loader.cjs'), `
const transpile = require(${transpile});
module.exports = function(source) {
 source = source.replace('export async function loadMediaBlob(', 'async function actualLoadMediaBlob(');
 source = source.replace('export async function loadMediaObjectUrl(', 'async function actualLoadMediaObjectUrl(');
 source += \`\nexport function loadMediaBlob(ref: string) {
   return (window as any).__read(ref, () => actualLoadMediaBlob(ref));
 }
 export async function loadMediaObjectUrl(ref: string, signal?: AbortSignal) {
   const url = await actualLoadMediaObjectUrl(ref, signal);
   if(url && (window as any).__deferDelivery) await new Promise<void>(resolve => (window as any).__deliveries.push({url, resolve}));
   return url;
 }\`;
 return transpile.call(this, source);
};`);
    await fs.writeFile(path.join(temp, 'download-loader.cjs'), `
const transpile = require(${transpile});
module.exports = function(source) {
 source = source.replace('export async function downloadUrl(', 'async function actualDownloadUrl(');
 source += '\\nexport async function downloadUrl(url: string, filename: string) { (window as any).__downloads.push({url, filename}); }';
 return transpile.call(this, source);
};`);
    await fs.writeFile(path.join(temp, 'retry-loader.cjs'), `
const transpile = require(${transpile});
module.exports = function(source) {
 source = source.replace('export async function retryChatGeneratedImage(', 'async function actualRetryChatGeneratedImage(');
 source += '\\nexport function retryChatGeneratedImage(...args: any[]) { return (window as any).__retry(...args); }';
 return transpile.call(this, source);
};`);
    await fs.writeFile(path.join(temp, 'entry.tsx'), `
import React, { StrictMode, useLayoutEffect } from ${JSON.stringify(require.resolve('react'))};
import { createRoot } from ${JSON.stringify(require.resolve('react-dom/client'))};
import { flushSync } from ${JSON.stringify(require.resolve('react-dom'))};
import * as bubbles from ${JSON.stringify(path.join(repo, 'components/chat/message-bubble'))};
import { storeMediaBlob, loadMediaObjectUrl } from ${JSON.stringify(path.join(repo, 'lib/media-cache-storage'))};
const w = window as any;
const root = createRoot(document.getElementById('app')!);
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
w.__pending = []; w.__deliveries = []; w.__resolutionWrites = 0; w.__downloads = []; w.__updates = []; w.__commits = []; w.__retryCalls = []; w.__inputs = [];
w.__read = (ref: string, read: () => Promise<any>) => {
 const row: any = {ref, read, done:false};
 w.__pending.push(row);
 return new Promise((resolve, reject) => {row.success = () => read().then(resolve, reject); row.missing = () => resolve(null); row.reject = () => reject(new Error('SyntheticReadFailure'));});
};
w.__retry = (msg: any, id: any, description: string) => {
 w.__retryCalls.push({id:msg.id, description});
 return new Promise((resolve,reject) => {w.__retrySuccess = () => resolve({...msg, mediaUrl:png}); w.__retryFailure = () => reject(new Error('SyntheticGenerationFailure'));});
};
function Frame({kind, msg}: any) {
 useLayoutEffect(() => {w.__commits.push([...document.querySelectorAll('#app img, #app audio, #app video')].map((n:any)=>n.getAttribute('src')));});
 const Component = (bubbles as any)[kind === 'image' ? '__ImageBubbleTest' : '__MediaFileBubbleTest'];
 return <Component msg={msg} onUpdate={(updated:any)=>w.__updates.push(updated)} />;
}
w.test = {
 png,
 refs: [] as string[],
 async seed() {
  const bytes = Uint8Array.from(atob(png.split(',')[1]), c=>c.charCodeAt(0));
  for(let i=0;i<3;i++) this.refs.push(await storeMediaBlob(new Blob([bytes],{type:'image/png'}), 'image/png','image'));
  const writes = ['put','add','delete','clear'];
  for(const method of writes) (IDBObjectStore.prototype as any)[method] = function(){w.__businessWrites++; throw new Error('Unexpected business DB write: '+method);};
  const transaction = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function(...args:any[]) { if(args[1] && args[1] !== 'readonly') {w.__businessWrites++; throw new Error('Unexpected write transaction');} return (transaction as any).apply(this,args); };
  w.__businessWrites=0;
 },
 render(kind:string, msg:any, strict=false) {
  Object.freeze(msg.mediaData); Object.freeze(msg); w.__inputs.push({msg, original:JSON.stringify(msg)});
  flushSync(()=>root.render(strict ? <StrictMode><Frame kind={kind} msg={msg}/></StrictMode> : <Frame kind={kind} msg={msg}/>));
 },
 unmount() {flushSync(()=>root.render(null));},
 release(index:number, mode='success') {const p=w.__pending[index]; if(p.done) throw new Error('Duplicate read release'); p.done=true;p[mode]();},
 deliver() {w.__deliveries.splice(0).forEach((d:any)=>d.resolve());},
 snapshot() {return {created:[...w.__urls.created], revoked:[...w.__urls.revoked], updates:w.__resolutionWrites, pending:w.__pending.map((p:any)=>({ref:p.ref,done:p.done})), deliveries:w.__deliveries.map((d:any)=>d.url), commits:w.__commits, businessWrites:w.__businessWrites};},
 clearCommits() {w.__commits=[];},
 async preCancelled() {const c=new AbortController();c.abort();return loadMediaObjectUrl(this.refs[0],c.signal);},
};
`);
    const wp = require('next/dist/compiled/webpack/webpack'); wp.init();
    await new Promise((resolve, reject) => wp.webpack({
        mode: 'development', target: 'web', devtool: false, context: repo,
        entry: path.join(temp, 'entry.tsx'), output: { path: temp, filename: 'fixture.js' },
        resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': repo }, modules: [path.join(repo, 'node_modules')], fallback: { fs: false, path: false, crypto: false } },
        module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, oneOf: [
            { test: /[\\/]message-bubble\.tsx$/, use: path.join(temp, 'bubble-loader.cjs') },
            { test: /[\\/]media-cache-storage\.ts$/, use: path.join(temp, 'media-loader.cjs') },
            { test: /[\\/]download-utils\.ts$/, use: path.join(temp, 'download-loader.cjs') },
            { test: /[\\/]generated-image-retry\.ts$/, use: path.join(temp, 'retry-loader.cjs') },
            { use: path.join(repo, 'scripts/anonymous-xhs-phase0/ts-loader.cjs') },
        ] }] },
        plugins: [new wp.webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('development') })],
    }, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString({ all: false, errors: true }))) : resolve()));
    const css = (await require('postcss')([require('@tailwindcss/postcss')({ base: repo })]).process(await fs.readFile(path.join(repo, 'app/globals.css'), 'utf8'), { from: path.join(repo, 'app/globals.css') })).css;
    const server = http.createServer(async (req, res) => {
        try {
            const pathname = new URL(req.url, 'http://localhost').pathname;
            if (/^\/[\w.-]+\.js$/.test(pathname)) { res.setHeader('Content-Type', 'text/javascript'); res.end(await fs.readFile(path.join(temp, path.basename(pathname)))); }
            else if (pathname === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
            else if (pathname === '/http.png') { res.setHeader('Content-Type', 'image/png'); res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64')); }
            else if (pathname === '/') {
                res.setHeader('Content-Type', 'text/html');
                res.end(`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><div id="app"></div><script>
window.process={env:{NODE_ENV:'development'}};window.__urls={created:[],revoked:[]};window.__unhandled=[];
addEventListener('unhandledrejection',e=>window.__unhandled.push(String(e.reason)));
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=b=>{const u=create(b);window.__urls.created.push(u);return u};
URL.revokeObjectURL=u=>{window.__urls.revoked.push(u);return revoke(u)};
HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('play'));return Promise.resolve()};
HTMLMediaElement.prototype.pause=function(){this.dispatchEvent(new Event('pause'))};
</script><script src="/fixture.js"></script>`);
            } else { res.writeHead(404); res.end(); }
        } catch (error) { res.writeHead(500); res.end(String(error)); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
    let browser;
    const errors = []; let checks = 0;
    const check = (value, label) => { assert.ok(value, label); checks++; console.log('PASS ' + label); };
    try {
        browser = await chromium.launch({ headless: true, channel: process.env.CHAT_TEST_BROWSER_CHANNEL || 'msedge' });
        const context = await browser.newContext({ viewport: { width: 430, height: 880 } });
        await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
        const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
        await page.goto(origin); await page.waitForFunction(() => !!window.test);
        await page.evaluate(() => window.test.seed());
        const refs = await page.evaluate(() => window.test.refs);
        const snap = () => page.evaluate(() => window.test.snapshot());
        const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const unmount = async () => { await page.evaluate(() => window.test.unmount()); await settle(); };
        const message = (kind, url, fileType = 'image') => ({ id: 'same-message', sessionId: 'synthetic-session', role: 'user', content: '', createdAt: '2026-10-09T00:00:00.000Z', mediaType: kind === 'image' ? 'image' : 'media_file', mediaUrl: url, mediaData: { label: 'Lifecycle photo', fileType, fileName: 'Lifecycle file' } });
        const render = (kind, url, strict = false, fileType) => page.evaluate(({ kind, msg, strict }) => window.test.render(kind, msg, strict), { kind, msg: message(kind, url, fileType), strict });
        const release = async (index, mode) => { await page.evaluate(({ index, mode }) => window.test.release(index, mode), { index, mode: mode || 'success' }); await page.waitForTimeout(70); await settle(); };
        check(await page.evaluate(() => window.test.preCancelled()) === null && (await snap()).pending.length === 0, 'pre-cancelled consumer does not issue Blob read');
        for (const kind of ['image', 'file']) {
            let before = await snap();
            await render(kind, refs[0]); await unmount(); await release(before.pending.length);
            let after = await snap();
            check(after.created.length === before.created.length && after.updates === before.updates, `${kind}: read completed after unmount creates no URL or state update`);

            before = await snap(); await render(kind, refs[0]); await unmount(); await render(kind, refs[1]);
            await release(before.pending.length + 1); const b = await page.locator('#app img').getAttribute('src');
            await release(before.pending.length);
            check(await page.locator('#app img').getAttribute('src') === b, `${kind}: session switch ignores old read`);
            await unmount();

            before = await snap(); await render(kind, refs[0]); await render(kind, refs[1]);
            await release(before.pending.length + 1); const current = await page.locator('#app img').getAttribute('src');
            await release(before.pending.length);
            check(await page.locator('#app img').getAttribute('src') === current, `${kind}: A/B reverse completion preserves B`);
            await unmount();

            before = await snap(); await render(kind, refs[0]); await release(before.pending.length);
            const old = await page.locator('#app img').getAttribute('src');
            await page.evaluate(() => window.test.clearCommits());
            await render(kind, refs[1]); await render(kind, refs[0]);
            check(!(await snap()).commits.flat().includes(old), `${kind}: render never reuses revoked A during A/B/A`);
            await release(before.pending.length + 2); const fresh = await page.locator('#app img').getAttribute('src');
            await release(before.pending.length + 1);
            check(fresh !== old && await page.locator('#app img').getAttribute('src') === fresh, `${kind}: A/B/A has independent request identities`);
            await unmount();

            before = await snap(); await render(kind, refs[0], true);
            check((await snap()).pending.length === before.pending.length + 2, `${kind}: StrictMode replays effect setup/cleanup`);
            await release(before.pending.length); await release(before.pending.length + 1);
            after = await snap();
            check(after.created.length === before.created.length + 1 && after.updates === before.updates + 1, `${kind}: StrictMode cancelled setup creates no URL`);
            await unmount();

            before = await snap(); await render(kind, refs[0]); await release(before.pending.length);
            const owned = await page.locator('#app img').getAttribute('src'); await unmount(); await unmount();
            check((await snap()).revoked.filter(u => u === owned).length === 1, `${kind}: successful URL revoked exactly once`);

            for (const mode of ['missing', 'reject']) {
                before = await snap(); await render(kind, refs[0]); await release(before.pending.length, mode);
                check(await page.locator('#app img').count() === 0 && (kind === 'image' ? await page.locator('#app .chat-photo-card-placeholder').count() === 1 : await page.getByText('文件已过期', { exact: true }).count() === 1), `${kind}: ${mode} uses existing failure fallback`);
                await render(kind, refs[1]); await release(before.pending.length + 1);
                check(await page.locator('#app img').count() === 1, `${kind}: new request succeeds after ${mode}`);
                await unmount();
            }

            before = await snap(); await page.evaluate(() => { window.__deferDelivery = true; });
            await render(kind, refs[0]); await release(before.pending.length);
            check((await snap()).deliveries.length === 1, `${kind}: URL created before Promise delivery`);
            await unmount(); await page.evaluate(() => { window.__deferDelivery = false; window.test.deliver(); }); await settle();
            after = await snap();
            check(after.updates === before.updates && after.revoked.includes(after.created.at(-1)), `${kind}: URL created before cleanup is revoked on late delivery`);

            for (const url of [await page.evaluate(() => window.test.png), origin + '/http.png']) {
                before = await snap(); await render(kind, url);
                check(await page.locator('#app img').getAttribute('src') === url, `${kind}: direct URL displayed immediately`);
                await unmount();
                check((await snap()).pending.length === before.pending.length && !(await snap()).revoked.includes(url), `${kind}: direct URL neither read nor revoked`);
            }
        }

        // Real preview/save UI; the downloader is intercepted after its call boundary.
        await render('image', refs[0]); await release((await snap()).pending.length - 1);
        const previewUrl = await page.locator('#app img').getAttribute('src');
        await page.locator('#app .chat-photo-card--image').click();
        check(await page.locator('body > div img').count() >= 2, 'image click opens preview');
        await page.getByRole('button', { name: '保存图片', exact: true }).click();
        await page.waitForFunction(() => window.__downloads.length === 1);
        check(await page.evaluate(u => window.__downloads.at(-1).url === u, previewUrl), 'preview save receives current owned URL');
        await page.getByRole('button', { name: '重新生成', exact: true }).click();
        await page.locator('textarea').fill('Synthetic retry description');
        await page.getByRole('button', { name: '生成', exact: true }).click();
        await page.waitForFunction(() => window.__retryCalls.length === 1);
        await unmount(); await page.evaluate(() => window.__retrySuccess()); await page.waitForFunction(() => window.__updates.length === 1);
        check(await page.evaluate(() => window.__updates[0].id === 'same-message'), 'unmount does not cancel already started image generation delivery');

        await render('file', refs[1]); await release((await snap()).pending.length - 1);
        await page.locator('#app .chat-media-file-image').click();
        await page.getByRole('button', { name: '保存图片', exact: true }).click();
        await page.waitForFunction(() => window.__downloads.length === 2);
        check(await page.evaluate(() => window.__downloads.length === 2), 'media-file image preview/save works');
        await page.getByRole('button', { name: '重新生成', exact: true }).click();
        await page.locator('textarea').fill('Synthetic failure');
        await page.getByRole('button', { name: '生成', exact: true }).click();
        await page.waitForFunction(() => window.__retryCalls.length === 2);
        await page.evaluate(() => window.__retryFailure());
        await page.getByText('SyntheticGenerationFailure', { exact: true }).waitFor();
        check(true, 'media-file regeneration failure dialog remains available'); await unmount();

        for (const fileType of ['audio', 'video', 'file']) {
            await render('file', refs[0], false, fileType); await release((await snap()).pending.length - 1);
            if (fileType === 'audio') {
                await page.locator('.chat-media-file-play').click();
                check(await page.locator('.chat-media-file-audio audio').count() === 1 && await page.locator('.chat-media-file-play').innerHTML().then(s => s.includes('<rect')), 'audio playback state still toggles');
            } else if (fileType === 'video') check(await page.locator('.chat-media-file-video video[controls]').count() === 1, 'video controls retain resolved URL');
            else { await page.locator('.chat-media-file-generic').click(); await page.waitForFunction(() => window.__downloads.length === 3); check(true, 'generic file download retains resolved URL'); }
            await unmount();
        }
        const end = await snap();
        assert.deepEqual([...end.created].sort(), [...end.revoked].sort()); check(true, 'all owned object URLs released exactly once');
        check(end.businessWrites === 0, 'zero business DB writes after fixture seed');
        check(await page.evaluate(() => window.__inputs.every(i => JSON.stringify(i.msg) === i.original)), 'message content/IDs/mediaUrl/mediaData unchanged');
        assert.deepEqual(await page.evaluate(() => window.__unhandled), []); assert.deepEqual(errors, []);
        check(true, 'no unhandled rejection or browser pageerror');
        console.log(JSON.stringify({ checks, errors, ownedUrls: end.created.length, businessWrites: end.businessWrites }));
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
