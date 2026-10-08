// Validate the built app boundary with no cookies and a fresh browser profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
let checks = 0;
function check(label, fn) { fn(); checks++; console.log('PASS ' + label); }
function visit(directory, fn) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(file, fn); else fn(file);
  }
}
(async () => {
  check('no production source imports offline engine', () => {
    for (const dir of ['app', 'components', 'hooks', 'lib']) visit(dir, file => {
      if (!/\.[cm]?[jt]sx?$/.test(file) || file === path.join('lib', 'legacy-inline-media-migration.ts')) return;
      assert.ok(!fs.readFileSync(file, 'utf8').includes('legacy-inline-media-migration'), file);
    });
  });
  check('built client/server JS and traces exclude migration engine', () => {
    assert.ok(fs.existsSync('.next/BUILD_ID'), 'run production build first');
    for (const dir of ['.next/static', '.next/server']) visit(dir, file => {
      if (!/\.(js|json)$/.test(file)) return;
      const source = fs.readFileSync(file, 'utf8');
      assert.ok(!/LEGACY_INLINE_MIGRATION_ENGINE|legacy-inline-media-migration|runLegacyInlineMediaEpoch/.test(source), file);
    });
  });
  const probe = http.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve)); const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = ''; child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; }); let browser;
  try {
    await new Promise((resolve, reject) => {
      const deadline = Date.now() + 30000;
      const poll = () => { if (output.includes('Ready in')) resolve(); else if (child.exitCode != null || Date.now() > deadline) reject(Error(output)); else setTimeout(poll, 100); }; poll();
    });
    browser = await chromium.launch({ channel: 'msedge', headless: true }); const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true }); const page = await context.newPage(); const requests = []; const errors = [];
    page.on('request', req => requests.push(new URL(req.url()).pathname)); page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.writeAttempts = 0;
      for (const name of ['put', 'add', 'delete', 'clear']) IDBObjectStore.prototype[name] = function() { window.writeAttempts++; throw Error('production preview write: ' + name); };
      window.atob = () => { throw Error('preview decode'); };
      Blob.prototype.arrayBuffer = () => { throw Error('preview Blob read'); };
    });
    const response = await page.goto(`http://127.0.0.1:${port}/float-inline-media-maintenance.html?migrate=1`);
    check('real production middleware serves standalone preview without login cookies', () => { assert.equal(response.status(), 200); assert.deepEqual(requests, ['/float-inline-media-maintenance.html', '/float-inline-media-maintenance.js']); });
    assert.equal(await page.locator('#migration-locked').isDisabled(), true);
    await page.locator('#scan').click(); await page.waitForFunction(() => document.getElementById('status').textContent.includes('未找到现有 Float 数据库'));
    const state = await page.evaluate(async () => ({ writes: writeAttempts, databases: await indexedDB.databases(), overflow: document.documentElement.scrollWidth > innerWidth, runtime: ['hydrateChatStorage', '_messagesCache', 'runLegacyInlineMediaEpoch', 'migrate'].filter(name => name in window) }));
    check('built preview remains read-only, noncreating and has no runtime/global migration entry', () => { assert.equal(state.writes, 0); assert.deepEqual(state.databases, []); assert.deepEqual(state.runtime, []); assert.deepEqual(errors, []); assert.equal(state.overflow, false); });
    const offlineEndpoint = await context.request.get(`http://127.0.0.1:${port}/offline-engine.js`);
    check('test-only engine endpoint does not exist in production', () => assert.equal(offlineEndpoint.status(), 404));
    const rescueRequests = []; page.on('request', req => rescueRequests.push({ method: req.method(), pathname: new URL(req.url()).pathname }));
    const rescue = await page.goto(`http://127.0.0.1:${port}/float-rescue-backup`);
    await page.waitForFunction(() => !document.getElementById('preflight').disabled);
    const rescueState = await page.evaluate(() => ({ writes: writeAttempts, runtime: ['hydrateChatStorage','_messagesCache','runLegacyInlineMediaEpoch','MainApp','ChatPluginBootstrap'].filter(name => name in window), overflow: document.documentElement.scrollWidth > innerWidth }));
    check('real production rescue route bypasses layout/middleware without cookies and loads only standalone GET assets/schema', () => {
      assert.equal(rescue.status(), 200); assert.equal(rescueState.writes, 0); assert.equal(rescueState.overflow, false); assert.deepEqual(rescueState.runtime, []); assert.deepEqual(errors, []);
      assert.ok(rescueRequests.every(req => req.method === 'GET' && ['/float-rescue-backup','/float-rescue-backup.js','/float-rescue-backup/schema'].includes(req.pathname) || req.method === 'GET' && req.pathname.startsWith('/float-rescue/')));
      assert.ok(!rescueRequests.some(req => req.pathname.startsWith('/_next/')));
    });
    const schemaResponse = await context.request.get(`http://127.0.0.1:${port}/float-rescue-backup/schema`); const schema = await schemaResponse.json();
    check('production rescue schema is pure module metadata including cloud credentials key, never credential values', () => {
      assert.equal(schemaResponse.status(), 200); assert.equal(schema.version, 1); assert.equal(schema.modules.length, 10); assert.ok(schema.modules.find(m => m.id === 'settings').sources.some(source => source.sourceIndex === 999 && source.keys.includes('ai_phone_cloud_backup_config_v1')));
    });
    await page.locator('#preflight').click(); await page.waitForFunction(() => document.getElementById('status').textContent.includes('关键数据库不存在'));
    check('production rescue missing critical DB stops before export and creates no database', () => {}); assert.deepEqual(await page.evaluate(() => indexedDB.databases()), []);
    console.log(`PASS ${checks} production boundary checks`);
  } finally { await browser?.close(); child.kill(); await new Promise(resolve => { if (child.exitCode != null) resolve(); else child.once('exit', resolve); }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
