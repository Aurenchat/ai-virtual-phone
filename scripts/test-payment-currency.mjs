import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), repo = process.cwd();
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'float-payment-currency-'));
const wp = require('next/dist/compiled/webpack/webpack'); wp.init();
await new Promise((resolve, reject) => wp.webpack({ mode:'development', target:'web', devtool:false, context:repo,
 entry:path.join(repo,'scripts/payment-currency/fixture.ts'), output:{path:temp,filename:'fixture.js'},
 resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':repo},fallback:{fs:false,path:false,crypto:false}},
 module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(repo,'scripts/anonymous-xhs-phase0/ts-loader.cjs')}]},
 plugins:[new wp.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})]},
 (error,stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString({all:false,errors:true}))) : resolve()));
const css = (await require('postcss')([require('@tailwindcss/postcss')({base:repo})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.join(repo,'app/globals.css')})).css;
const server = http.createServer(async(req,res) => {
 const url = new URL(req.url,'http://localhost');
 if(url.pathname === '/fixture.js') { res.setHeader('Content-Type','application/javascript'); res.end(await fs.readFile(path.join(temp,'fixture.js'))); }
 else if(url.pathname === '/style.css') { res.setHeader('Content-Type','text/css'); res.end(css); }
 else if(url.pathname.startsWith('/theme/')) res.end(await fs.readFile(path.join(repo,'themes/imessage-native-day',url.pathname.split('/').at(-1))));
 else { res.setHeader('Content-Type','text/html; charset=utf-8'); res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>html,body,#app{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="root"></div><div id="app"></div><script>window.process={env:{NODE_ENV:"development"}}</script><script src="/fixture.js"></script>'); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const {chromium} = require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({headless:true,channel:'msedge'});
const context = await browser.newContext({viewport:{width:402,height:874},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const page = await context.newPage(), errors = [], checks = [];
const check = (value,name) => { assert.ok(value,name); checks.push(name); console.log('PASS '+name); };
page.on('pageerror',error => errors.push(error.message));
let fxMode = 'success', requests = 0;
await context.route('https://api.frankfurter.dev/**', async route => {
 requests++;
 if(fxMode === 'error') return route.fulfill({status:503,body:'unavailable'});
 if(fxMode === 'delay') await new Promise(resolve => setTimeout(resolve,1200));
 const currency = new URL(route.request().url()).pathname.split('/').at(-2);
 await route.fulfill({contentType:'application/json',body:JSON.stringify({date:new Date().toISOString().slice(0,10),base:currency,quote:'CNY',rate:{USD:6.72903,EUR:7.91,JPY:0.0448,KRW:0.0048}[currency]})});
});
try {
 await page.goto(`http://127.0.0.1:${server.address().port}`); await page.waitForFunction(()=>window.paymentCurrency);
 const result = await page.evaluate(async () => {
  const {currency:c,fx,directive} = window.paymentCurrency, {kv,ledger,wallet,paymentChat,chatDb,money,parser,backup} = window.payments;
  await kv.hydrateKvDb();
  await wallet.mutateWallet((state,save)=>save(state));
  const passed = [], ok = (x,m) => {if(!x) throw Error(m);}, rejects = async f => {try{await f();}catch{return;}throw Error('expected failure');};
  const test = async (name,f) => {await f();passed.push(name);};
  const self={id:'self',name:'测试用户',isUser:true}, alice={id:'alice',name:'Alice',isUser:false};
  const input=(id,currency='USD',extra={})=>({id,sessionId:'fx-test',kind:'transfer',fromUser:false,amount:100,currency,...extra});
  const quote=(currency='USD',rate='6.72903')=>({currency,rateToCny:rate,rateDate:new Date().toISOString().slice(0,10),fetchedAt:Date.now(),provider:'Frankfurter'});
  const balance=async()=>money.toFen(JSON.parse(await kv.kvReadFresh(wallet.WALLET_STATE_KEY)).balance);
  await test('five currency formats, strict units, aliases, legacy CNY',async()=>{
   for(const [code,amount,expected] of [['CNY',200,'¥200.00'],['USD',200,'$200.00'],['EUR',200,'€200.00'],['JPY',20000,'¥20,000'],['KRW',200000,'₩200,000']]) ok(c.formatPaymentAmount(amount,code)===expected,code);
   ok(c.normalizeCurrency()==='CNY'&&c.normalizeCurrency('日元')==='JPY'&&c.normalizeCurrency('RMB')==='CNY','normalization');
   await rejects(()=>c.normalizeCurrency('¥'));await rejects(()=>c.normalizeCurrency('BTC'));await rejects(()=>c.paymentMinor(1.5,'JPY'));
   ok(c.convertToCnyFen(100000,'USD','6.72903')===672903,'exact decimal conversion');
  });
  await test('FX cache/coalescing, timeout, malformed/provider/stale errors, retry, CNY no fetch',async()=>{
   let calls=0, bad=false;
   const service=fx.createPaymentFxService(async()=>{calls++;if(bad)return new Response('{}',{status:503});return new Response(JSON.stringify({base:'EUR',quote:'CNY',date:new Date().toISOString().slice(0,10),rate:7.91}));},15);
   await service('CNY');ok(calls===0,'CNY requested FX');await Promise.all([service('EUR'),service('EUR')]);await service('EUR');ok(calls===1,'cache/coalescing');
   for(const body of [{base:'USD',quote:'USD',date:'2026-01-01',rate:7},{base:'USD',quote:'CNY',date:'2020-01-01',rate:7},{base:'USD',quote:'CNY',date:new Date().toISOString().slice(0,10),rate:-1}]) await rejects(()=>fx.createPaymentFxService(async()=>new Response(JSON.stringify(body)))('USD'));
   await rejects(()=>fx.createPaymentFxService(()=>new Promise(()=>{}),5)('USD'));
   const failing=fx.createPaymentFxService(async()=>bad?new Response('',{status:500}):new Response(JSON.stringify({base:'USD',quote:'CNY',date:new Date().toISOString().slice(0,10),rate:6.7})));
   bad=true;await rejects(()=>failing('USD'));bad=false;await failing('USD');
  });
  await test('foreign collect concurrency, frozen settlement, no quote replay',async()=>{
   const before=await balance();await Promise.all(Array.from({length:8},()=>ledger.executePayment(input('foreign-collect'),'collect',self,quote())));
   ok(await balance()===before+67290,'duplicate/wrong credit');
   const record=await ledger.executePayment(input('foreign-collect'),'collect',self);
   const op=Object.values(record.operations)[0];ok(op.settlement.rateToCny==='6.72903'&&op.settlement.settledCnyFen===67290,'missing frozen result');
  });
  await test('foreign send and refund once; refund uses debit without new FX',async()=>{
   const before=await balance(), i=input('foreign-send','EUR',{fromUser:true,amount:80});
   await Promise.all([ledger.executePayment(i,'send',self,quote('EUR','7.91')),ledger.executePayment(i,'send',self,quote('EUR','8'))]);
   ok(await balance()===before-63280,'send repeated');await Promise.all([ledger.executePayment(i,'return',alice),ledger.executePayment(i,'return',alice)]);
   ok(await balance()===before,'refund amount/replay');await rejects(()=>ledger.executePayment(i,'collect',alice));
  });
  await test('FX missing/stale fails closed with no wallet effect; return allowed',async()=>{
   const before=await balance();await rejects(()=>ledger.executePayment(input('no-fx'),'collect',self));
   await rejects(()=>ledger.executePayment(input('stale-fx'),'collect',self,{...quote(),fetchedAt:Date.now()-600000}));
   await ledger.executePayment(input('no-fx'),'return',self);ok(await balance()===before,'failed FX moved funds');
  });
  await test('JPY/KRW integer groups, single packet currency and cumulative CNY rounding',async()=>{
   for(const code of ['CNY','USD','EUR','JPY','KRW']){
    const i=input('packet-'+code,code,{kind:'red_packet',amount:code==='JPY'||code==='KRW'?17:.17,count:4});
    const q=quote(code,code==='KRW'?'0.0048':code==='JPY'?'0.0448':code==='EUR'?'7.91':'6.72903');
    await rejects(()=>ledger.executePayment(input('tiny-'+code,code,{kind:'red_packet',amount:code==='JPY'||code==='KRW'?1:.01,count:4}),'claim',self,q));
    for(const actor of [alice,{id:'bob',name:'Bob',isUser:false},self,{id:'eve',name:'Eve',isUser:false}]) await ledger.executePayment(i,'claim',actor,q);
    const r=(await ledger.readPaymentRecords()).find(r=>r.id===i.id);
    ok(r.claims.reduce((n,x)=>n+x.originalMinor,0)===17&&r.claims.every(x=>x.originalMinor>=1),'original share invariant');
    ok(r.claims.reduce((n,x)=>n+x.fen,0)===r.totalFen,'CNY package invariant');
    if(code!=='CNY')ok(r.fxQuote.rateToCny===q.rateToCny,'package changed rate');
   }
  });
  await test('role to role transfer remains no wallet; group recipient preserved',async()=>{
   const before=await balance();const r=await ledger.executePayment(input('role-role','JPY',{recipientId:'alice',amount:20000}),'collect',alice);
   ok(r.status==='received'&&await balance()===before&&!r.fxQuote,'role wallet invented');
   await rejects(()=>ledger.executePayment(input('wrong-target','USD',{recipientId:'alice'}),'collect',self,quote()));
  });
  await test('foreign wallet commit / ChatDB failure then no-network reconcile',async()=>{
   const msg={id:'fx-chat-fail',sessionId:'fx-test',role:'assistant',content:'',createdAt:new Date().toISOString(),status:'sent',mediaType:'transfer',mediaData:{amount:100,currency:'USD',status:'pending'}};
   await chatDb.messages.put(msg);const before=await balance(),put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(value,...args){if(this.name==='messages')throw new DOMException('injected','AbortError');return put.call(this,value,...args);};
   try{await rejects(()=>paymentChat.settleChatPayment(msg,'collect',self,quote()));}finally{IDBObjectStore.prototype.put=put;}
   ok(await balance()===before+67290,'wallet failed');await paymentChat.settleChatPayment(msg,'collect',self);
   ok(await balance()===before+67290,'replay credited');ok((await chatDb.messages.get(msg.id)).mediaData.paymentSettlement.settledCnyFen===67290,'projection settlement');
  });
  await test('AI currency directives, legacy syntax and history preserve currency',async()=>{
   for(const code of ['CNY','USD','EUR','JPY','KRW']) {
    const text=`[转账:${code}:200:备注:Alice:Bob]\n\n[红包:${code}:200:4:好运]`;
    const parsed=parser.parseAIResponse(text).parts;ok(parsed.length===2&&parsed.every(p=>p.mediaData?.currency===code),'AI '+code);
    const msg={mediaType:'transfer',mediaData:parsed[0].mediaData};ok(directive.paymentDirective(msg).includes(code==='CNY'?'转账:200':code+':200'),'history code');
   }
   ok(parser.parseAIResponse('[红包:0.04:4:测试]').parts[0].mediaData.count===4,'legacy packet');
   ok(parser.parseAIResponse('[转账:BTC:10:备注]').parts.every(p=>!p.mediaType),'unknown currency not rejected');
   ok(parser.parseAIResponse('[转账:JPY:1.5:备注]').parts.every(p=>!p.mediaType),'fractional yen');
  });
  await test('foreign backup restore retains quote/settlement and idempotency',async()=>{
   const exported=await backup.exportSource({type:'kv',keys:[wallet.WALLET_STATE_KEY]});
   const saved=JSON.parse(exported.records[0].value);ok(Object.values(saved.paymentLedger.records).some(r=>r.fxQuote),'backup omitted quote');
   const restored=await backup.importSource(exported,true);ok(restored.errors.length===0,'restore errors');
   const before=await balance();await ledger.executePayment(input('foreign-collect'),'collect',self);ok(await balance()===before,'restored replay');
  });
  return passed;
 });
 for(const name of result)check(true,name);
 // Production ChatRoom and theme/Bridge. No simulated payment DOM.
 await page.evaluate(()=>window.imTest.mount('current'));
 await page.locator('.im-message-row').first().waitFor();
 const scene = async (group, wallpaper, kind='transfer', status='pending', note='晚饭钱') => {
  await page.evaluate(({group,wallpaper,kind,status,note})=>{
   const p=window.imTest, messages=[{role:'assistant',senderCharacterId:'im-reference',content:'',mediaType:kind,mediaData:{amount:1000,currency:'USD',label:note,status,count:kind==='red_packet'?4:1}},
    {role:'user',content:'',mediaType:kind,mediaData:{amount:1000,currency:'USD',label:note,status,count:kind==='red_packet'?4:1}}];
   if(group)p.groupScene(messages);else p.singleScene(messages);
   p.wallpaper(wallpaper);
  },{group,wallpaper,kind,status,note});
  await page.waitForFunction(()=>document.querySelectorAll('.im-bubble .cash-payment-card').length===2);
  await page.waitForTimeout(180);
 };
 const boxes=[];
 for(const group of [false,true])for(const wallpaper of [false,true])for(const kind of ['transfer','red_packet']){
  await scene(group,wallpaper,kind);
  const metrics=await page.locator('.cash-payment-card').evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,text:n.innerText,fill:getComputedStyle(n.querySelector('path')).fill,tail:getComputedStyle(n.querySelector('.cash-outline-tail')).display,role:n.closest('[data-role]').dataset.role})));
  check(Math.abs(metrics[0].width-metrics[1].width)<1&&metrics.every(x=>x.height===176&&x.fill==='rgb(34, 34, 37)'&&x.tail!=='none'),`${group?'group':'single'} ${wallpaper?'wallpaper':'plain'} ${kind} equal size/directional tails`);
  if(kind==='red_packet')check(metrics.every(x=>!x.text.includes('1,000')&&!x.text.includes('$')),'packet collapsed amount hidden');
  boxes.push({group,wallpaper,kind,metrics});
  await page.screenshot({path:path.join(temp,`${group?'group':'single'}-${wallpaper?'wallpaper':'plain'}-${kind}.png`)});
 }
 await scene(false,true,'transfer','declined','很长的备注'.repeat(30));
 check(await page.locator('.cash-primary').first().evaluate(n=>getComputedStyle(n).textDecorationLine.includes('line-through')),'returned strike through');
 check(await page.locator('.cash-card-note').first().evaluate(n=>n.getBoundingClientRect().height<=37),'long note at most two lines');
 // Real detail modal FX loading and retry. Use an uncached currency pair.
 fxMode='delay';
 await page.evaluate(()=>window.imTest.singleScene([{role:'assistant',content:'',mediaType:'transfer',mediaData:{amount:80,currency:'EUR',status:'pending',label:'欧元测试'}}]));
 await page.locator('.cash-payment-card').click();
 await page.getByRole('dialog',{name:'转账详情'}).waitFor();
 check(await page.getByRole('button',{name:'收款',exact:true}).isDisabled(),'FX loading disables collect');
 check(await page.getByRole('button',{name:'退回',exact:true}).isEnabled(),'FX loading permits return');
 await page.waitForFunction(()=>!document.querySelector('.cash-detail-actions button').disabled);
 await page.getByRole('button',{name:'收款',exact:true}).dblclick();
 await page.waitForFunction(()=>!document.querySelector('.cash-detail'));
 await page.locator('.cash-payment-card').click();await page.locator('.cash-detail').waitFor();
 check(await page.locator('.cash-fx-line').innerText()==='结算为人民币 ¥632.80','completed detail frozen CNY');
 check(await page.locator('.cash-detail-actions').count()===0,'completed detail no actions');
 await page.locator('.modal-overlay:has(.cash-detail)').evaluate(async n=>Promise.all(n.getAnimations({subtree:true}).map(a=>a.finished)));
 await page.screenshot({path:path.join(temp,'completed-transfer-detail.png')});
 await page.locator('.modal-overlay:has(.cash-detail)').click({position:{x:2,y:2}});
 // A failed provider leaves receipt disabled and permits an explicit retry.
 fxMode='error';
 await page.evaluate(()=>window.imTest.singleScene([{role:'assistant',content:'',mediaType:'red_packet',mediaData:{amount:20000,currency:'JPY',status:'pending',label:'日元红包'}}]));
 await page.locator('.cash-payment-card').click();
 await page.getByRole('button',{name:'重试',exact:true}).waitFor();
 check(await page.getByRole('button',{name:'领取',exact:true}).isDisabled(),'provider failure disables claim');
 check(await page.getByRole('button',{name:'退回',exact:true}).isEnabled(),'provider failure permits return');
 await page.locator('.modal-overlay:has(.cash-detail)').evaluate(async n=>Promise.all(n.getAnimations({subtree:true}).map(a=>a.finished)));
 await page.screenshot({path:path.join(temp,'failed-packet-detail.png')});
 fxMode='success';await page.getByRole('button',{name:'重试',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('.cash-detail-actions button').disabled);
 check((await page.locator('.cash-fx-line').innerText()).includes('¥896.00'),'detail retry restores FX preview');
 await page.locator('.modal-overlay:has(.cash-detail)').click({position:{x:2,y:2}});
 // Real send modal -> existing sendChatPayment, including group recipients/packet count.
 for(const mode of ['transfer','red_packet'])for(const group of [false,true]) {
  await page.evaluate(({mode,group})=>window.paymentCurrency.send(mode,group),{mode,group});
  await page.getByRole('combobox',{name:'币种'}).selectOption('KRW');
  await page.getByPlaceholder('0.00',{exact:true}).fill('200000');
  if(mode==='red_packet'&&group)await page.getByPlaceholder('1',{exact:true}).fill('4');
  const confirm=page.getByRole('button',{name:mode==='transfer'?'确认转账':'塞入红包',exact:true});
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>['确认转账','塞入红包'].includes(b.textContent)&&!b.disabled));
  check((await page.locator('.cash-fx-line').innerText()).includes('¥960.00'),`${mode} group=${group} send confirms CNY debit`);
  await confirm.click();await page.getByRole('combobox',{name:'币种'}).waitFor({state:'detached'});
 }
 const sent=await page.evaluate(async()=> (await window.payments.ledger.readPaymentRecords()).filter(r=>r.sessionId==='currency-send-ui'));
 check(sent.length===4&&sent.every(r=>r.currency==='KRW'&&r.originalMinor===200000&&r.totalFen===96000&&r.fxQuote),'send modal persists original currency and frozen quote');
 check(sent.some(r=>r.recipientId==='alice')&&sent.some(r=>r.kind==='red_packet'&&r.count===4),'group recipient and packet count preserved');
 await page.evaluate(()=>window.imTest.singleScene([
  {role:'assistant',content:'',mediaType:'transfer',mediaData:{amount:1,status:'pending'}},
  {role:'assistant',content:'',mediaType:'red_packet',mediaData:{amount:1,status:'pending'}},
  {role:'user',content:'',mediaType:'transfer',mediaData:{amount:1,status:'pending'}}
 ]));
 await page.waitForFunction(()=>document.querySelectorAll('.cash-payment-card').length===3);
 await page.waitForTimeout(180);
 check(await page.locator('.cash-payment-card').evaluateAll(ns=>ns.map(n=>getComputedStyle(n.querySelector('.cash-outline-tail')).display).join(',')==='none,block,block'),'continuous payment cards only last has tail');
 const requestCount=requests;
 await page.reload();await page.waitForFunction(()=>window.payments);
 await page.evaluate(async()=>{await window.payments.kv.hydrateKvDb();await window.payments.ledger.executePayment({id:'foreign-collect',sessionId:'fx-test',kind:'transfer',fromUser:false,amount:100,currency:'USD'},'collect',{id:'self',name:'测试用户',isUser:true});});
 check(requests===requestCount,'reload settlement replay requires no FX');
 check(errors.length===0,'no uncaught browser errors');
 await fs.writeFile(path.join(temp,'results.json'),JSON.stringify({checks,boxes,pageErrors:errors},null,2));
 console.log('EVIDENCE '+temp);
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
