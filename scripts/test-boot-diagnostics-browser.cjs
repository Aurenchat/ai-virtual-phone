/* Synthetic origin, disposable browser context/profile; never opens Float or its DBs. */
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const { stages, root, boot } = require('./test-boot-diagnostics.cjs');
(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'float-boot-diag-'));
  const entry = path.join(temp, 'entry.js');
  await fs.writeFile(entry, `const React = require(${JSON.stringify(require.resolve('react'))});
const {createRoot} = require(${JSON.stringify(require.resolve('react-dom/client'))});
const api = require(${JSON.stringify(path.join(root, 'lib/boot-diagnostics.ts'))});
const {BootDiagnostics} = require(${JSON.stringify(path.join(root, 'components/settings/boot-diagnostics.tsx'))});
window.diagTest = api; createRoot(document.getElementById('app')).render(React.createElement(BootDiagnostics));`);
  const wp = require('next/dist/compiled/webpack/webpack'); wp.init();
  await new Promise((resolve, reject) => wp.webpack({ mode: 'production', optimization: { minimize: false }, target: 'web', devtool: false, context: root, entry,
    output: { path: temp, filename: 'fixture.js' }, resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': root } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(root, 'scripts/anonymous-xhs-phase0/ts-loader.cjs') }] },
    plugins: [new wp.webpack.DefinePlugin({ 'process.env.NEXT_PUBLIC_BOOT_DIAGNOSTICS_DISABLED': 'undefined' })]
  }, (err, stats) => err || stats.hasErrors() ? reject(err || Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const bundle = (await require('next/dist/compiled/terser').minify(await fs.readFile(path.join(temp, 'fixture.js'), 'utf8'))).code;
  const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const errors = [], results = [];
  const check = (name, value) => { assert.ok(value, name); results.push(name); };
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const script = boot().script;
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'float-boot-diag.invalid') return route.abort();
      return route.fulfill({ contentType: url.pathname === '/fixture.js' ? 'text/javascript' : 'text/html', body: url.pathname === '/fixture.js' ? bundle :
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>
window.diagWrites=[];const nativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){window.diagWrites.push([k,v]);return nativeSet.call(this,k,v)};
const nativeOpen=indexedDB.open;indexedDB.open=function(){throw Error('telemetry must not open a DB')};
</script><script>${script}</script><script>window.__FLOAT_BOOT_DIAG_INTERNAL_V1__.mark('VN_BEGIN')</script></head><body style="font:14px sans-serif;overflow-wrap:anywhere"><div id="app"></div><script src="/fixture.js"></script></body></html>` });
    });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto('https://float-boot-diag.invalid'); await page.waitForFunction(() => !!window.diagTest);
    check('head bootstrap precedes module-top-level begin', await page.evaluate(() => window.__FLOAT_BOOT_DIAG__.getCurrent().activeStages.includes('VN')));
    await page.evaluate(() => { for (const s of ['KV_READ_BEGIN', 'CHAT_DB_BEGIN', 'CHAT_MESSAGES_BEGIN', 'KV_READ_DONE']) window.diagTest.markBootStage(s); });
    await page.reload(); await page.waitForFunction(() => !!window.diagTest);
    await page.locator('summary').click();
    const previous = page.getByRole('region', { name: '上一次未完成启动' });
    await previous.waitFor();
    check('previous UI shows last stage and parallel Chat branch', (await previous.textContent()).includes('KV_READ_DONE') && (await previous.textContent()).includes('CHAT_MESSAGES'));
    check('reload/pagehide does not mark incomplete boot ready', await page.evaluate(() => {const p=window.__FLOAT_BOOT_DIAG__.getPrevious(); return !p.ready && p.exitObserved;}));
    await page.evaluate(stages => { for (const s of stages) window.diagTest.markBootStage(s === 'PLUGIN_DONE' ? 'PLUGIN_SKIPPED_SAFE' : s); }, stages);
    await page.getByRole('button', { name: '刷新诊断' }).click();
    check('safe-mode READY visible in actual React UI', (await page.getByRole('region', { name: '本次启动' }).textContent()).includes('BOOT_READY'));
    check('small mobile viewport has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const measurements = await page.evaluate(({ script, stages }) => {
      const values = [], writes = [];
      // Every iteration uses real localStorage; only these two telemetry keys exist.
      for (let i = 0; i < 100; i++) {
        delete window.__FLOAT_BOOT_DIAG_INTERNAL_V1__; delete window.__FLOAT_BOOT_DIAG__;
        window.diagWrites.length = 0;
        const start = performance.now();
        (0, eval)(script);
        for (const s of stages) window.diagTest.markBootStage(s);
        values.push(performance.now() - start); writes.push(window.diagWrites.length);
      }
      values.sort((a,b) => a-b);
      return { medianMs: values[50], p95Ms: values[95], maxMs: values[99], normalWrites: [...new Set(writes)],
        maxJsonBytes: Math.max(...window.diagWrites.map(([,v]) => new TextEncoder().encode(v).length)),
        keys: Object.keys(localStorage).sort(), current: window.__FLOAT_BOOT_DIAG__.getCurrent() };
    }, { script, stages });
    check('real localStorage normal boot = 25 writes', measurements.normalWrites.length === 1 && measurements.normalWrites[0] === 25);
    check('only two diagnostic keys used', measurements.keys.join(',') === 'ai_phone_boot_diag_current_v1,ai_phone_boot_diag_previous_v1');
    check('production-minified bootstrap still standalone', await page.evaluate(() => { delete window.__FLOAT_BOOT_DIAG_INTERNAL_V1__; (0,eval)(window.diagTest.bootDiagnosticsScript('production-test')); return window.__FLOAT_BOOT_DIAG__.getCurrent().buildId === 'production-test'; }));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: await browser.version(), checks: results.length, results, measurements, errors,
      note: 'Desktop Chromium real localStorage, synthetic boot boundaries; not iPhone timing or physical-disk durability. Test-only loop is not shipped.' }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
