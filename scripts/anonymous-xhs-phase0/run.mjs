import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(dir, '../..');
const capabilityPatch = process.env.HOST_CAPABILITY_PHASE === '0.5';
const phase1a = process.env.HOST_CAPABILITY_PHASE === '1a';
const productFixture = phase1a ? await import('./scenarios-1a.mjs') : null;
const output = path.join(dir, phase1a ? 'evidence-1a' : capabilityPatch ? 'evidence-0.5' : process.env.HOST_CAPABILITY_PHASE === 'regression' ? 'evidence-regression' : 'evidence');
await fs.mkdir(output, { recursive: true });
const wp = require('next/dist/compiled/webpack/webpack');
wp.init();
const { webpack } = wp;
let compiledFiles=[];
await new Promise((resolve, reject) => webpack({
  mode: 'development', target: 'web', devtool: false,
  context: repo, entry: path.join(dir, 'host-entry.tsx'),
  output: { path: path.join(output, 'runtime'), filename: 'host.js' },
  resolve: { extensions: ['.tsx', '.ts', '.js', '.json'], alias: { '@': repo }, fallback: { fs: false, path: false, crypto: false } },
  module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(dir, 'ts-loader.cjs') }] },
  plugins: [new webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('development') })],
  optimization: { minimize: false },
}, (err, stats) => {
  if (err || stats.hasErrors()) reject(err || Error(stats.toString({ all: false, errors: true })));
  else { compiledFiles=[...stats.compilation.fileDependencies].filter(f=>f.startsWith(repo+path.sep)&&!f.includes(path.sep+'node_modules'+path.sep)&&/\.(ts|tsx|js|mjs|cjs)$/.test(f)); console.log('Bundled real host + runner'); resolve(); }
}));
const sources=await Promise.all(compiledFiles.sort().map(async file=>({path:path.relative(repo,file).replaceAll('\\','/'),sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')})));
await fs.writeFile(path.join(output,'provenance.json'),JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),generatedAt:new Date().toISOString(),sources},null,2));
const packageRoot = process.env.PHASE0_NODE_MODULES || 'C:/Users/Administrator.DESKTOP-068VNB6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(packageRoot, 'playwright'));
const captures = [];
let label = 'initial';
let delayMs = 0;
const server = http.createServer(async (req, res) => {
  if (req.url === '/v1/chat/completions' || req.url === '/capture/anthropic' || req.url?.startsWith('/v1/models/')) {
    let raw = ''; for await (const part of req) raw += part;
    const body = JSON.parse(raw);
    const capture = { index: captures.length, label, method: req.method, url: req.url, contentType:req.headers['content-type'], body, receivedAt: new Date().toISOString() };
    captures.push(capture);
    if (delayMs) await new Promise(r => setTimeout(r, delayMs));
    const content = productFixture ? productFixture.modelResponse(body) : 'PHASE0_RESPONSE';
    if (req.url === '/capture/anthropic') {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ content: [{ type: 'text', text: content }], stop_reason: 'end_turn' }));
    } else if (req.url?.startsWith('/v1/models/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: content }] }, finishReason: 'STOP' }] }));
    } else if (body.stream) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.end('data: ' + JSON.stringify({ choices: [{ index: 0, delta: { content }, finish_reason: null }] }) + '\n\ndata: ' + JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
    } else { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }] })); }
    capture.respondedAt = new Date().toISOString();
    return;
  }
  if (req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div><script>window.process={env:{NODE_ENV:"development"}};</script><script src="/host.js"></script></body></html>'); return; }
  if(phase1a&&['/styles/checkphone.css','/styles/xiaohongshu.css'].includes(req.url)){res.setHeader('Content-Type','text/css; charset=utf-8');res.end(await fs.readFile(path.join(repo,req.url)));return;}
  if(phase1a&&/^\/xiaohongshu\/avatars\/default-0[1-6]\.png$/.test(req.url)){res.setHeader('Content-Type','image/png');res.end(await fs.readFile(path.join(repo,'public',req.url)));return;}
  if (req.url === '/host.js' || /^\/[a-zA-Z0-9_-]+\.host\.js$/.test(req.url)) {
    try { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(await fs.readFile(path.join(output, 'runtime', req.url.slice(1)))); } catch { res.writeHead(404); res.end(); } return;
  }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const context = await browser.newContext();
// No external network, real user profile, or real API credentials are accessible.
await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort('blockedbyclient'));
if (capabilityPatch) await context.route('https://api.anthropic.com/v1/messages', async route => {
  // Native provider body is untouched; only destination is redirected to our loopback recorder.
  const response = await route.fetch({ url: origin + '/capture/anthropic' });
  await route.fulfill({ response });
});
const page = await context.newPage();
const browserErrors = [];
page.on('pageerror', e => { browserErrors.push(String(e)); console.log('BROWSER ERROR', String(e)); });
const results = [];
async function step(name, fn) {
  label = name;
  try { const value = await fn(); results.push({ name, completed: true, value }); console.log(name, JSON.stringify(value)); return value; }
  catch (error) { results.push({ name, completed: false, error: String(error) }); console.log(name, 'ERROR', String(error)); }
}
try {
  await page.goto(origin);
  await page.waitForFunction(() => !!window.phase0);
  await page.evaluate(() => window.phase0.ready());
  const scenario = productFixture || await import(capabilityPatch ? './scenarios-0.5.mjs' : './scenarios.mjs');
  await scenario.run({ page, step, origin, captures, setDelay: n => { delayMs = n; }, repo, output });
} finally {
  await fs.writeFile(path.join(output, 'captures.json'), JSON.stringify(captures, null, 2));
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ origin, browser: browser.version(), fixtureOnly: true, endpoint: 'local HTTP recording server with deterministic response; no real model inference', results, browserErrors }, null, 2));
  await browser.close();
  await new Promise(r => server.close(r));
}
if (results.some(x => !x.completed)) process.exitCode = 1;
