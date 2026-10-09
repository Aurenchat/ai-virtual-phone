import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), repo = process.cwd();
const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const codes = ['GBP', 'HKD', 'SGD', 'AUD', 'CAD', 'CHF', 'NZD', 'THB'];
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'float-payment-display-'));

if (process.argv.includes('--live-fx')) {
  const server = http.createServer((req, res) => res.end('<!doctype html><title>Isolated FX CORS smoke</title>'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    for (const code of codes) {
      const result = await page.evaluate(async code => {
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch(`https://api.frankfurter.dev/v2/rate/${code}/CNY`, { signal: controller.signal, cache: 'no-store', credentials: 'omit' });
          const body = await response.json(), age = Date.now() - Date.parse(body.date);
          return { code, status: response.status, cors: response.type, body,
            passed: response.ok && response.type === 'cors' && body.base === code && body.quote === 'CNY'
              && typeof body.rate === 'number' && Number.isFinite(body.rate) && body.rate > 0
              && /^\d+(?:\.\d{1,12})?$/.test(String(body.rate)) && Number.isFinite(age) && age >= -86400000 && age <= 10 * 86400000 };
        } catch (error) { return { code, passed: false, error: error.message }; }
        finally { clearTimeout(timer); }
      }, code);
      results.push(result);
      console.log(JSON.stringify(result));
    }
    await fs.writeFile(path.join(temp, 'live-fx.json'), JSON.stringify({ origin: new URL(page.url()).origin, checkedAt: new Date().toISOString(), results }, null, 2));
    console.log('EVIDENCE ' + temp);
    assert.ok(results.every(r => r.passed), 'Only live-validated currency pairs may be enabled');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
} else {
  const wp = require('next/dist/compiled/webpack/webpack'); wp.init();
  await new Promise((resolve, reject) => wp.webpack({ mode: 'development', target: 'web', devtool: false, context: repo,
    entry: path.join(repo, 'scripts/payment-display/fixture.tsx'), output: { path: temp, filename: 'fixture.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': repo }, fallback: { fs: false, path: false, crypto: false } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(repo, 'scripts/anonymous-xhs-phase0/ts-loader.cjs') }] },
    plugins: [new wp.webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('development') })] },
    (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const css = (await require('postcss')([require('@tailwindcss/postcss')({ base: repo })]).process(await fs.readFile('app/globals.css', 'utf8'), { from: path.join(repo, 'app/globals.css') })).css;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/fixture.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(await fs.readFile(path.join(temp, 'fixture.js'))); }
    else if (url.pathname === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
    else if (url.pathname.startsWith('/theme/')) res.end(await fs.readFile(path.join(repo, 'themes/imessage-native-day', url.pathname.split('/').at(-1))));
    else { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>html,body,#app{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="root"></div><div id="app"></div><script>window.process={env:{NODE_ENV:"development"}}</script><script src="/fixture.js"></script>'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors = [], checks = [];
  const check = (value, name) => { assert.ok(value, name); checks.push(name); console.log('PASS ' + name); };
  page.on('pageerror', e => errors.push(e.message));
  let fxMode = 'success';
  const rates = { USD: 6.72903, EUR: 7.91, JPY: .0448, KRW: .0048, GBP: 8.8646, HKD: .853, SGD: 5.2339, AUD: 4.6608, CAD: 4.7036, CHF: 8.0477, NZD: 3.7543, THB: .19906 };
  await context.route('https://api.frankfurter.dev/**', async route => {
    if (fxMode === 'failure') return route.fulfill({ status: 503, body: 'unavailable' });
    if (fxMode === 'delay') await new Promise(resolve => setTimeout(resolve, 600));
    const currency = new URL(route.request().url()).pathname.split('/').at(-2);
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ base: currency, quote: 'CNY', date: new Date().toISOString().slice(0, 10), rate: rates[currency] }) });
  });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => window.paymentDisplayTest);
    const unitChecks = await page.evaluate(async () => {
      const d = window.paymentDisplayTest.display, c = window.paymentCurrency.currency, passed = [];
      const ok = (value, name) => { if (!value) throw Error(name); passed.push(name); };
      const rejects = async f => { try { await f(); } catch { return true; } return false; };
      await window.payments.kv.hydrateKvDb(); await window.payments.wallet.mutateWallet((state, save) => save(state));
      ok(['pending', 'completed', 'returned'].map(d.paymentStatusGlyph).join('') === '◷✓×', 'semantic status glyphs are exact text, no emoji variation');
      ok(d.paymentDisplayState('transfer', { status: 'declined', label: '已收款' }) === 'returned', 'status ignores localized note text');
      ok(d.paymentDisplayState('red_packet', { status: 'pending', count: 4, claimedBy: ['测试用户'] }) === 'pending'
        && d.paymentDisplayState('red_packet', { status: 'pending', count: 4, claimedBy: ['测试用户'] }, '测试用户') === 'completed', 'group counter and individual completed semantics remain distinct');
      ok(d.paymentReceiveSuffix({ amount: 100, currency: 'JPY', claimedAmounts: { Alice: 17 } }, 'claim', 'Alice') === '，金额:¥17 JPY', 'packet receipt uses actual original-currency individual share');
      ok(d.paymentReceiveSuffix({ amount: 100, currency: 'USD' }, 'collect', 'Alice') === '，金额:$100.00 USD', 'transfer receipt includes original currency and ISO');
      ok(d.paymentReceiveSuffix({ amount: 100, currency: 'USD' }, 'claim', 'Alice') === '', 'missing share never substitutes packet total or zero');
      ok(d.paymentReceiveSuffix({ amount: 100 }, 'collect', 'Alice') === '，金额:¥100.00 CNY', 'legacy missing currency remains CNY');
      const expected = { GBP: '£1.23', HKD: 'HK$1.23', SGD: 'S$1.23', AUD: 'A$1.23', CAD: 'C$1.23', CHF: 'CHF 1.23', NZD: 'NZ$1.23', THB: '฿1.23' };
      for (const [code, text] of Object.entries(expected)) {
        ok(c.formatPaymentAmount(1.23, code) === text && c.paymentMinor(1.23, code) === 123 && c.PAYMENT_CURRENCIES[code].decimals === 2, code + ' unambiguous prefix and 2 minor digits');
        ok(await rejects(() => c.paymentMinor(1.234, code)), code + ' rejects excess precision');
        const parsed = window.payments.parser.parseAIResponse(`[转账:${code}:100:测试]`).parts[0];
        ok(parsed.mediaData?.currency === code, code + ' existing parser accepts centralized registry');
      }
      ok(await rejects(() => c.normalizeCurrency('BTC')) && await rejects(() => c.paymentMinor(1.5, 'JPY')), 'unknown currency and fractional yen still rejected');
      const guidance = JSON.stringify(window.paymentDisplayTest.createBuiltinPreset());
      ok(Object.keys(c.PAYMENT_CURRENCIES).every(code => guidance.includes(code)), 'built-in payment guidance includes registry currencies');
      return passed;
    });
    unitChecks.forEach(name => check(true, name));

    // Execute the actual ChatRoom payment callbacks extracted from their TS AST.
    // Bind real storage/settlement, replacing only React setState and notification metadata ID creation.
    const ts = require('typescript'), source = await fs.readFile('components/chat/chat-room.tsx', 'utf8');
    const ast = ts.createSourceFile('chat-room.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const names = ['buildAssistantActionEditMeta', 'getMsgSender', 'handleAIMediaAction', 'handleGroupRedPacketAction', 'handleGroupTransferAction'], found = new Map();
    function visit(node) { if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(ast))) found.set(node.name.getText(ast), node.initializer.getText(ast)); ts.forEachChild(node, visit); }
    visit(ast); assert.equal(found.size, names.length);
    const callbacks = ts.transpileModule(`const {session,loadChatMessages,settleChatPayment,paymentReceiveSuffix,setMessages,pushChatMessage,createResponseBatchId,updateMessageMediaData,settleShoppingPaymentRequest,userIdentity}=deps;${names.map(n => `const ${n}=${found.get(n)};`).join('\n')}return {handleAIMediaAction,handleGroupRedPacketAction,handleGroupTransferAction};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
    const callbackChecks = await page.evaluate(async ({ callbacks }) => {
      const { chat, paymentChat } = window.payments, d = window.paymentDisplayTest.display, c = window.paymentCurrency.currency, passed = [];
      const quote = code => ({ currency: code, rateToCny: '7.91', rateDate: new Date().toISOString().slice(0, 10), fetchedAt: Date.now(), provider: 'Frankfurter' });
      for (const group of [false, true]) for (const kind of ['transfer', 'red_packet']) {
        const id = `receipt-${group}-${kind}`, sessionId = `receipt-session-${group}-${kind}`, amount = 100;
        await paymentChat.sendChatPayment({ id, sessionId, kind, fromUser: true, amount, currency: 'EUR', label: '原备注', count: group && kind === 'red_packet' ? 4 : 1,
          recipientId: group && kind === 'transfer' ? 'alice' : undefined, recipientName: group && kind === 'transfer' ? 'Alice' : undefined }, '测试用户', quote('EUR'));
        const handlers = new Function('deps', callbacks)({ session: { id: sessionId, contactId: 'alice' }, loadChatMessages: chat.loadChatMessages,
          settleChatPayment: paymentChat.settleChatPayment, paymentReceiveSuffix: d.paymentReceiveSuffix, setMessages() {}, pushChatMessage: chat.pushChatMessage,
          createResponseBatchId: () => crypto.randomUUID(), updateMessageMediaData: chat.updateMessageMediaData,
          settleShoppingPaymentRequest() { throw Error('unrelated path'); }, userIdentity: { name: '测试用户' } });
        if (group) await (kind === 'transfer' ? handlers.handleGroupTransferAction : handlers.handleGroupRedPacketAction)('accept', 'Alice', 'alice', '测试用户');
        else await handlers.handleAIMediaAction(kind === 'transfer' ? 'accept_transfer' : 'accept_red_packet', 'Alice', '测试用户');
        const messages = chat.loadChatMessages(sessionId), updated = messages.find(m => m.id === id), notification = messages.find(m => m.mediaType === `accept_${kind}`);
        const share = kind === 'red_packet' ? updated.mediaData.claimedAmounts.Alice : updated.mediaData.amount;
        const owner = group ? '你' : '测试用户', item = kind === 'red_packet' ? '红包' : '转账';
        if (notification?.content !== `Alice领取了${owner}的${item}，金额:${c.formatPaymentAmount(share, updated.mediaData.currency)} EUR`) throw Error('wrong actual callback receipt');
        if (notification.rawResponseText !== `[Alice领取了${owner}的${item}]` || !notification.responseBatchId || notification.role !== 'assistant') throw Error('action metadata/directive altered');
        if (group && kind === 'red_packet' && !(share > 0 && share < amount)) throw Error('group share reported total');
        passed.push(`${group ? 'group' : 'single'} assistant ${kind} successful projection receipt, original metadata/directive`);
      }
      return passed;
    }, { callbacks });
    callbackChecks.forEach(name => check(true, name));

    // Real user receipt buttons (same handlers for single and group incoming payments).
    for (const kind of ['transfer', 'red_packet']) {
      const msg = await page.evaluate(async kind => {
        const { chatDb, chat } = window.payments;
        const msg = chat.pushChatMessage({ id: `user-receipt-${kind}`, sessionId: 'user-receipt', role: 'assistant', content: '', mediaType: kind,
          mediaData: { amount: 100, currency: 'USD', status: 'pending', count: kind === 'red_packet' ? 4 : 1 } }, { deferPaymentWrite: true });
        await chatDb.messages.put(msg); window.paymentDisplayTest.detail(msg); return msg;
      }, kind);
      const action = page.getByRole('button', { name: kind === 'transfer' ? '收款' : '领取', exact: true });
      await action.waitFor(); await page.waitForFunction(() => !document.querySelector('.cash-detail-actions button').disabled);
      await action.click(); await page.waitForFunction(() => window.paymentDisplayTest.outcomes.length === 1);
      const outcome = await page.evaluate(() => window.paymentDisplayTest.outcomes[0]);
      const share = kind === 'transfer' ? outcome.updated.mediaData.amount : outcome.updated.mediaData.claimedAmounts['测试用户'];
      check(outcome.text === `测试用户领取了对方的${kind === 'transfer' ? '转账' : '红包'}，金额:$${share.toFixed(2)} USD` && outcome.action === `accept_${kind}`, `user ${kind} original-currency receipt and action preserved`);
      check(kind !== 'red_packet' || share < msg.mediaData.amount, 'user group packet receipt is individual share');
    }

    const waitAnimation = async () => page.locator('.modal-overlay').evaluate(async n => Promise.all(n.getAnimations({ subtree: true }).map(a => a.finished)));
    // Composer opt-in and legacy UI, including validation, pending, failure and close.
    for (const cashStyle of [false, true]) for (const mode of ['transfer', 'red_packet']) {
      await page.evaluate(({ cashStyle, mode }) => { localStorage.removeItem('float-payment-currency'); window.paymentDisplayTest.composer(cashStyle, mode, true); }, { cashStyle, mode });
      await page.getByRole('combobox', { name: '币种' }).waitFor();
      const body = await page.locator('.modal-overlay').innerText();
      check(cashStyle ? !/[🧧💰]/u.test(body) && await page.locator('.cash-payment-composer .cash-brand-apple').count() === 1
        : body.includes(mode === 'red_packet' ? '🧧' : '💰') && await page.locator('.cash-payment-composer').count() === 0, `${cashStyle ? 'Cash' : 'legacy'} ${mode} composer brand/emoji presentation`);
      check(await page.locator('select[aria-label="币种"] option').count() === 13, 'selector keeps name, ISO and prefix for all supported currencies');
      if (mode === 'red_packet') {
        await page.getByPlaceholder('0.00', { exact: true }).fill('0.01'); await page.getByPlaceholder('1', { exact: true }).fill('4');
        await page.getByRole('button', { name: '塞入红包', exact: true }).click();
        check((await page.getByRole('alert').innerText()).includes('每人至少'), `${cashStyle ? 'Cash' : 'legacy'} packet minimum validation preserved`);
      }
      await waitAnimation(); await page.screenshot({ path: path.join(temp, `${cashStyle ? 'cash' : 'legacy'}-${mode}-composer.png`) });
      await page.getByRole('button', { name: '取消', exact: true }).click();
      check(await page.getByRole('combobox', { name: '币种' }).count() === 0, 'composer cancel retains close flow');
    }
    fxMode = 'delay';
    await page.evaluate(() => window.paymentDisplayTest.composer(true, 'transfer', false));
    await page.getByRole('combobox', { name: '币种' }).selectOption('GBP'); await page.getByPlaceholder('0.00', { exact: true }).fill('12.34');
    check(await page.getByRole('button', { name: '确认转账', exact: true }).isDisabled(), 'Cash composer FX pending disables send');
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(n => n.textContent === '确认转账').disabled);
    await page.getByRole('button', { name: '确认转账', exact: true }).click();
    await page.getByRole('combobox', { name: '币种' }).waitFor({ state: 'detached' });
    const send = await page.evaluate(() => window.paymentDisplayTest.sends[0]);
    check(send.currency === 'GBP' && send.amount === 12.34 && !!send.id && send.quote.currency === 'GBP', 'Cash send callback retains draft, original amount, currency and quote');
    fxMode = 'failure'; await page.evaluate(() => window.paymentDisplayTest.composer(true, 'transfer', false));
    await page.getByRole('combobox', { name: '币种' }).selectOption('HKD'); await page.getByPlaceholder('0.00', { exact: true }).fill('10');
    await page.getByRole('button', { name: '重试', exact: true }).waitFor();
    check(await page.getByRole('button', { name: '确认转账', exact: true }).isDisabled(), 'new currency provider failure remains fail closed');
    fxMode = 'success'; await page.getByRole('button', { name: '重试', exact: true }).click();
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(n => n.textContent === '确认转账').disabled);
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await page.evaluate(() => { localStorage.setItem('float-payment-currency', 'CNY'); window.paymentDisplayTest.composer(true, 'transfer', false, true); });
    await page.getByPlaceholder('0.00', { exact: true }).fill('10'); await page.getByPlaceholder('添加备注').fill('原备注');
    await page.getByRole('button', { name: '确认转账', exact: true }).click();
    check(await page.getByRole('alert').innerText() === 'injected send failure' && await page.getByPlaceholder('添加备注').inputValue() === '原备注', 'Cash composer callback failure preserves error and draft inputs');
    await page.getByRole('button', { name: '取消', exact: true }).click();

    await page.evaluate(() => window.imTest.mount('current'));
    await page.locator('.im-message-row').first().waitFor();
    const metrics = [];
    for (const wallpaper of [false, true]) {
      await page.evaluate(wallpaper => {
        window.imTest.singleScene([{ role: 'assistant', content: '', mediaType: 'transfer', mediaData: { amount: 100, currency: 'GBP', status: 'declined' } },
          { role: 'user', content: '', mediaType: 'red_packet', mediaData: { amount: 100, status: 'pending', count: 4, claimedBy: ['Alice'] } }]); window.imTest.wallpaper(wallpaper);
      }, wallpaper);
      await page.locator('.cash-payment-card').first().waitFor();
      await page.waitForFunction(() => !document.querySelector('.modal-overlay'));
      await page.locator('.chat-room-wrapper').evaluate(async n => Promise.all(n.getAnimations({ subtree: true })
        .filter(a => a.effect.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
      const values = await page.locator('.cash-payment-card').evaluateAll(ns => ns.map(n => {
        const brand = getComputedStyle(n.querySelector('.cash-brand')), apple = getComputedStyle(n.querySelector('.cash-brand-apple'));
        return { text: n.innerText, width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height,
          font: brand.fontSize, weight: brand.fontWeight, apple: apple.fontSize, gap: apple.marginRight };
      }));
      check(values[0].text.includes('× 已退回') && values[1].text.includes('◷ 1/4 已领取'), 'real collapsed cards use semantic glyphs and retain group counters');
      check(values.every(v => v.font === '18px' && v.weight === '600' && v.apple === '16.2px' && v.gap === '2px'), 'CashBrand keeps Cash typography and scales only Apple glyph');
      metrics.push({ wallpaper, values }); await page.screenshot({ path: path.join(temp, wallpaper ? 'cards-wallpaper.png' : 'cards-plain.png') });
      await page.locator('.cash-payment-card').first().click(); await page.locator('.cash-detail').waitFor();
      check((await page.locator('.cash-detail-status').innerText()).startsWith('× ') && await page.locator('.cash-detail .cash-brand-apple').count() === 1, 'real returned detail reuses glyph helper and CashBrand');
      await page.locator('.modal-overlay:has(.cash-detail)').click({ position: { x: 2, y: 2 } });
      await page.getByRole('button', { name: '更多聊天功能', exact: true }).click();
      await page.getByRole('menuitem', { name: '更多功能', exact: true }).click();
      await page.locator('.chat-plus-menu-item').filter({ hasText: /^红包$/ }).click();
      await page.locator('.cash-payment-composer').waitFor();
      check(await page.locator('.cash-payment-composer .cash-brand-apple').count() === 1, `actual ChatRoom opt-in composer ${wallpaper ? 'wallpaper' : 'plain'}`);
      await waitAnimation(); await page.screenshot({ path: path.join(temp, wallpaper ? 'composer-wallpaper.png' : 'composer-plain.png') });
      await page.getByRole('button', { name: '取消', exact: true }).click();
    }
    check(metrics[0].values.every((v, i) => v.width === metrics[1].values[i].width && v.height === metrics[1].values[i].height), 'plain/wallpaper card dimensions remain unchanged');
    await page.evaluate(() => { const p = window.imTest, s = p.chat.loadChatSessions()[0]; p.chat.saveChatSessions([{ ...s, customCSS: '' }]); p.remount(); });
    await page.locator('.chat-room-wrapper').waitFor();
    await page.waitForFunction(() => !document.querySelector('.chat-room-wrapper .im-plus'));
    await page.locator('.chat-input-actions > button:has(line[x1="12"][y1="8"][x2="12"][y2="16"])').click();
    await page.locator('.chat-plus-menu-item').filter({ hasText: /^红包$/ }).click();
    await page.getByRole('combobox', { name: '币种' }).waitFor();
    check(await page.locator('.cash-payment-composer').count() === 0 && (await page.locator('.modal-overlay').innerText()).includes('🧧'), 'actual non-iMessage ChatRoom retains legacy composer');
    await page.getByRole('button', { name: '取消', exact: true }).click();
    check(errors.length === 0, 'no uncaught browser errors');
    await fs.writeFile(path.join(temp, 'results.json'), JSON.stringify({ checks, metrics, pageErrors: errors }, null, 2));
    console.log('EVIDENCE ' + temp);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
