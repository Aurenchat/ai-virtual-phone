import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url), repo=process.cwd();
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'float-payment-integrity-'));
const wp=require('next/dist/compiled/webpack/webpack');wp.init();
await new Promise((resolve,reject)=>wp.webpack({mode:'development',target:'web',devtool:false,context:repo,entry:path.join(repo,'scripts/payment-integrity/fixture.ts'),output:{path:temp,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':repo},fallback:{fs:false,path:false,crypto:false}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(repo,'scripts/anonymous-xhs-phase0/ts-loader.cjs')}]},plugins:[new wp.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})]},(err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString({all:false,errors:true}))):resolve()));
const server=http.createServer(async(req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'application/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/fixture.js'?await fs.readFile(path.join(temp,'fixture.js')):'<div id="root"></div><script>window.process={env:{NODE_ENV:"development"}}</script><script src="/fixture.js"></script>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({headless:true,channel:'msedge'});
const context=await browser.newContext(),page=await context.newPage(),origin=`http://127.0.0.1:${server.address().port}`;
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(origin); await page.waitForFunction(()=>window.payments);
 const results=await page.evaluate(async()=>{
  const {kv,wallet,ledger,money,paymentChat,chatDb,backup}=window.payments;
  await kv.hydrateKvDb();
  const results=[];
  function ok(value,reason){if(!value)throw Error(reason);}
  async function check(name,fn){await fn();results.push({name,passed:true});}
  const input=(id,extra={})=>({id,sessionId:'fixture-chat',kind:'transfer',fromUser:false,amount:100,...extra});
  const self={id:'self',name:'测试用户',isUser:true},alice={id:'alice',name:'Alice',isUser:false};
  const balance=async()=>JSON.parse(await kv.kvReadFresh(wallet.WALLET_STATE_KEY)).balance;
  async function rejects(fn,text){try{await fn();}catch(e){if(text)ok(e.message.includes(text),e.message);return;}throw Error('expected rejection');}
  await check('empty/new wallet and concurrent collect',async()=>{
   await Promise.all(Array.from({length:12},()=>ledger.executePayment(input('collect'), 'collect',self)));
   ok(await balance()===10100,'collect duplicated');
  });
  await check('sequential retry and old wallet writer preserve ledger',async()=>{
   await wallet.creditWalletBalance(1,'fixture','fixture');
   await ledger.executePayment(input('collect'),'collect',self);
   ok(await balance()===10101,'wallet writer lost ledger');
  });
  await check('wallet transaction abort rolls back balance and marker',async()=>{
   const before=await balance(),put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(value,...args){if(this.name==='entries'&&value.key===wallet.WALLET_STATE_KEY)throw new DOMException('injected','AbortError');return put.call(this,value,...args);};
   try{await rejects(()=>ledger.executePayment(input('abort'),'collect',self),'injected');}finally{IDBObjectStore.prototype.put=put;}
   ok(await balance()===before,'abort changed balance');ok(!(await ledger.readPaymentRecords()).some(r=>r.id==='abort'),'abort left marker');
   await ledger.executePayment(input('abort'),'collect',self);ok(await balance()===before+100,'retry failed');
  });
  await check('ChatDB failure after wallet commit; retry reconciles without credit',async()=>{
   const msg={id:'chat-failure',sessionId:'fixture-chat',role:'assistant',content:'',createdAt:new Date().toISOString(),status:'sent',mediaType:'transfer',mediaData:{amount:100,status:'pending'}};
   await chatDb.messages.put(msg);const before=await balance(),put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(value,...args){if(this.name==='messages')throw new DOMException('chat injected','AbortError');return put.call(this,value,...args);};
   try{await rejects(()=>paymentChat.settleChatPayment(msg,'collect',self),'chat injected');}finally{IDBObjectStore.prototype.put=put;}
   ok(await balance()===before+100,'wallet did not commit');
   await paymentChat.settleChatPayment(msg,'collect',self);ok(await balance()===before+100,'retry credited');
   ok((await chatDb.messages.get(msg.id)).mediaData.status==='received','projection not repaired');
  });
  await check('message completed but prepared wallet operation missing',async()=>{
   const msg={id:'premature-message',sessionId:'fixture-chat',role:'assistant',content:'',createdAt:new Date().toISOString(),status:'sent',mediaType:'transfer',mediaData:{amount:100,status:'received',paymentProtocol:1,paymentId:'premature-message'}};
   await ledger.preparePayment(input(msg.id));await chatDb.messages.put(msg);
   const before=await balance();await paymentChat.settleChatPayment(msg,'collect',self);ok(await balance()===before+100,'projection prevented settlement');
  });
  await check('legacy terminal no replay; legacy pending collects',async()=>{
   const before=await balance();for(const status of ['received','opened','declined'])await ledger.executePayment(input('legacy-'+status,{status}),'collect',self);
   ok(await balance()===before,'legacy replay');await ledger.executePayment(input('legacy-pending'),'collect',self);ok(await balance()===before+100,'legacy pending');
  });
  await check('send/refund concurrent exactly once and illegal collect',async()=>{
   const p=input('send',{fromUser:true,recipientId:'alice'}),before=await balance();
   await Promise.all([ledger.executePayment(p,'send',self),ledger.executePayment(p,'send',self)]);ok(await balance()===before-100,'double debit');
   await Promise.all([ledger.executePayment(p,'return',alice),ledger.executePayment(p,'return',alice)]);ok(await balance()===before,'double refund');
   await rejects(()=>ledger.executePayment(p,'collect',alice));
   const p2=input('collected-send',{fromUser:true,recipientId:'alice'});await ledger.executePayment(p2,'send',self);await ledger.executePayment(p2,'collect',alice);const after=await balance();await rejects(()=>ledger.executePayment(p2,'return',alice));ok(await balance()===after,'illegal refund');
  });
  await check('legacy refund verified debit / missing debit fails closed',async()=>{
   const before=await balance();await rejects(()=>ledger.executePayment(input('missing',{fromUser:true,walletTransactionId:'gone'}),'return',alice),ledger.LEGACY_REFUND_ERROR);ok(await balance()===before,'invented refund');
   const paid=await wallet.payWithWalletBalance({amount:100,title:'legacy debit'});
   const p=input('legacy-return',{fromUser:true,walletTransactionId:paid.transaction.id});
   await ledger.executePayment(p,'return',alice);await ledger.executePayment(p,'return',alice);ok(await balance()===before,'legacy refund not exactly once');
  });
  await check('failed send publication recovers with stable ID and no second debit',async()=>{
   const id=await ledger.reservePaymentDraft('publication','red_packet');
   ok(id===await ledger.reservePaymentDraft('publication','red_packet'),'draft not stable');
   const p=input(id,{sessionId:'publication',fromUser:true,kind:'red_packet',count:4,amount:1}),before=await balance(),put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(value,...args){if(this.name==='messages')throw new DOMException('publication failure','AbortError');return put.call(this,value,...args);};
   try{await rejects(()=>paymentChat.sendChatPayment(p,self.name),'publication failure');}finally{IDBObjectStore.prototype.put=put;}
   ok(await balance()===before-1,'send debit missing');
   const recovered=await paymentChat.recoverPaymentPublications('publication');ok(recovered.length===1&&recovered[0].id===id,'recovery ID');
   await paymentChat.sendChatPayment(p,self.name);ok(await balance()===before-1,'retry debit');
   ok((await chatDb.messages.where('sessionId').equals('publication').toArray()).length===1,'duplicate message');
   ok((await paymentChat.recoverPaymentPublications('publication')).length===0,'published recovered again');
  });
  await check('insufficient funds does not reserve a monetary record; draft remains editable',async()=>{
   const id=await ledger.reservePaymentDraft('edit-draft','transfer');
   await rejects(()=>ledger.executePayment(input(id,{fromUser:true,amount:1e8}),'send',self));
   ok(!(await ledger.readPaymentRecords()).some(r=>r.id===id),'failed debit left payment');
   await ledger.executePayment(input(id,{fromUser:true,amount:1}),'send',self);
  });
  await check('out-of-order message projection cannot revert completed state',async()=>{
   const msg={id:'projection-order',sessionId:'fixture-chat',role:'assistant',content:'',createdAt:new Date().toISOString(),status:'sent',mediaType:'red_packet',mediaData:{amount:.02,count:2,status:'pending'}};
   await chatDb.messages.put(msg);const p=paymentChat.paymentInput(msg);
   const first=await ledger.executePayment(p,'claim',alice),last=await ledger.executePayment(p,'claim',self);
   await window.payments.chat.persistPaymentMediaData(msg.id,paymentChat.paymentProjection(last));
   await window.payments.chat.persistPaymentMediaData(msg.id,paymentChat.paymentProjection(first));
   ok((await chatDb.messages.get(msg.id)).mediaData.status==='opened','stale projection reverted');
  });
  await check('wrong legacy debit direction / amount and refund receipt are rejected',async()=>{
   const credit=await wallet.creditWalletBalance(1,'fixture','receipt'),before=await balance();
   await rejects(()=>ledger.executePayment(input('bad-direction',{fromUser:true,amount:1,walletTransactionId:credit.transaction.id}),'return',alice));
   const debit=await wallet.payWithWalletBalance({amount:1,title:'legacy'});
   await rejects(()=>ledger.executePayment(input('bad-amount',{fromUser:true,amount:2,walletTransactionId:debit.transaction.id}),'return',alice));
   await rejects(()=>ledger.executePayment(input('prior-refund',{fromUser:true,amount:1,walletTransactionId:debit.transaction.id,walletRefundTransactionId:'receipt'}),'return',alice));
   ok(await balance()===before-1,'invalid refund credited');
  });
  await check('all older wallet mutation entrances retain operations',async()=>{
   const key=JSON.stringify(['collect']);
   const state=await wallet.createWalletCard({title:'fixture bank',balance:100});const card=state.cards[0].id;
   await wallet.setDefaultWalletCard(card);await wallet.transferCardToWalletBalance(card,1);await wallet.transferWalletBalanceToCard(card,1);
   await wallet.adjustWalletCardAccount(card,1,'in');await wallet.adjustWalletCardAccount(card,1,'out');await wallet.payWithWalletCard({cardId:card,amount:1,title:'fixture'});await wallet.deleteWalletCard(card);
   ok(JSON.parse(await kv.kvReadFresh(wallet.WALLET_STATE_KEY)).paymentLedger.records[key],'old writer erased ledger');
  });
  await check('history trims to 300; permanent ledger survives',async()=>{
   const before=await balance();for(let i=0;i<305;i++)await wallet.creditWalletBalance(.01,'fixture','history');
   const state=JSON.parse(await kv.kvReadFresh(wallet.WALLET_STATE_KEY));ok(state.transactions.length===300,'history bound');
   await ledger.executePayment(input('collect'),'collect',self);ok(money.toFen(await balance())===money.toFen(before)+305,'trim lost operation');
  });
  await check('integer packet allocation boundaries and 10000 randomized packets',async()=>{
   let allocations=0;
   for(const [total,count] of [[1,1],[4,4],[100,100],[100000000,100],...Array.from({length:10000},()=>{const count=1+Math.floor(Math.random()*100);return[count+Math.floor(Math.random()*100000),count];})]){
    const shares=[];while(shares.length<count){const n=money.allocatePacketFen(total,shares,count);ok(Number.isSafeInteger(n)&&n>=1,'invalid share');shares.push(n);allocations++;}
    ok(shares.reduce((a,b)=>a+b,0)===total,'sum differs');
   }
   await rejects(()=>Promise.resolve(money.allocatePacketFen(1,[],4)));ok(money.toFen(1.005)===101,'rounding');results.push({allocations});
  });
  await check('group packet concurrent claims, receive once, no negative shares',async()=>{
   const p=input('group-packet',{kind:'red_packet',amount:.04,count:4}),before=await balance();
   await Promise.all([self,alice,{id:'bob',name:'Bob',isUser:false},{id:'cat',name:'Cat',isUser:false},self].map(a=>ledger.executePayment(p,'claim',a)));
   const r=(await ledger.readPaymentRecords()).find(r=>r.id===p.id);ok(r.status==='opened'&&r.claims.length===4,'claims duplicated');ok(r.claims.every(c=>c.fen===1),'invalid shares');ok(money.toFen(await balance())===money.toFen(before)+1,'user credit');await rejects(()=>ledger.executePayment(p,'return',self));
  });
  await check('backup exports durable snapshot; restore preserves operation',async()=>{
   const source={type:'kv',keys:[wallet.WALLET_STATE_KEY]},before=await balance();
   const exported=await backup.exportSource(source);ok(exported.records.length===1,'wallet backup absent');
   await kv.kvUpdateAtomic(wallet.WALLET_STATE_KEY,()=>({value:JSON.stringify(wallet.createDefaultWalletState()),result:null}));
   const restored=await backup.importSource(exported,true);ok(restored.errors.length===0,'restore errors');
   await ledger.executePayment(input('collect'),'collect',self);ok(await balance()===before,'restore double credit');
  });
  await check('old version-1 wallet snapshot restores without balance rewrite',async()=>{
   const source={type:'kv',keys:[wallet.WALLET_STATE_KEY]},snapshot=await backup.exportSource(source);
   const legacy=wallet.createDefaultWalletState();legacy.balance=123.45;
   const restored=await backup.importSource({type:'kv',records:[{key:wallet.WALLET_STATE_KEY,value:JSON.stringify(legacy)}]},true);
   ok(restored.errors.length===0,'legacy import failed');ok(await balance()===123.45,'legacy balance changed');
   await ledger.executePayment(input('old-db-terminal',{status:'received'}),'collect',self);ok(await balance()===123.45,'old-db terminal replay');
   await ledger.executePayment(input('old-db-pending'),'collect',self);ok(await balance()===223.45,'old-db pending failed');
   await backup.importSource(snapshot,true);
  });
  await check('AI packet creation rejects insufficient minimum and preserves valid packets',async()=>{
   const parse=window.payments.parser.parseAIResponse;
   ok(!parse('[红包:0.01:4:测试]',[]).parts.some(p=>p.mediaType==='red_packet'),'invalid AI packet created');
   ok(parse('[红包:0.04:4:测试]',[]).parts.some(p=>p.mediaType==='red_packet'),'valid AI packet missing');
  });
  await check('partial restore missing new protocol ledger fails closed',async()=>{
   await rejects(()=>ledger.executePayment(input('unknown-new',{protocol:1}),'collect',self),'凭据缺失');
  });
  return results;
 });
 await page.evaluate(async()=>{
  const msg={id:'ui-collect',sessionId:'ui-chat',role:'assistant',content:'',createdAt:new Date().toISOString(),status:'sent',mediaType:'transfer',mediaData:{amount:100,status:'pending'}};
  await window.payments.chatDb.messages.put(msg);window.paymentUi.detail(msg);
 });
 await page.getByRole('button',{name:'收款',exact:true}).waitFor();
 const uiBefore=await page.evaluate(async()=>JSON.parse(await window.payments.kv.kvReadFresh(window.payments.wallet.WALLET_STATE_KEY)).balance);
 await page.getByRole('button',{name:'收款',exact:true}).evaluate(button=>{button.click();button.click();});
 await page.waitForFunction(()=>window.paymentUi.outcomes?.length===1);
 assert.equal(await page.evaluate(async()=>JSON.parse(await window.payments.kv.kvReadFresh(window.payments.wallet.WALLET_STATE_KEY)).balance),uiBefore+100);
 results.push({name:'real MediaDetailModal double click, one credit and notification',passed:true});
 await page.evaluate(()=>window.paymentUi.send());
 await page.getByPlaceholder('0.00',{exact:true}).fill('0.01');await page.getByPlaceholder('1',{exact:true}).fill('4');await page.getByRole('button',{name:'塞入红包',exact:true}).click();
 await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/至少/);
 await page.getByPlaceholder('0.00',{exact:true}).fill('0.04');await page.getByRole('button',{name:'塞入红包',exact:true}).evaluate(button=>{button.click();button.click();});
 await page.waitForFunction(async()=> (await window.payments.chatDb.messages.where('sessionId').equals('ui-send').count())===1);
 assert.equal(await page.evaluate(async()=>JSON.parse(await window.payments.kv.kvReadFresh(window.payments.wallet.WALLET_STATE_KEY)).balance),Math.round((uiBefore+100-.04)*100)/100);
 results.push({name:'real RedPacketModal rejects 0.01/4; double-click 0.04/4 sends once',passed:true});
 const before=await page.evaluate(async()=>JSON.parse(await window.payments.kv.kvReadFresh(window.payments.wallet.WALLET_STATE_KEY)).balance);
 await page.reload();await page.waitForFunction(()=>window.payments);
 await page.evaluate(async()=>{await window.payments.kv.hydrateKvDb();await window.payments.ledger.executePayment({id:'collect',sessionId:'fixture-chat',kind:'transfer',fromUser:false,amount:100},'collect',{id:'self',name:'测试用户',isUser:true});});
 assert.equal(await page.evaluate(()=>window.payments.wallet.loadWalletState().balance),before);results.push({name:'reload retry',passed:true});
 const second=await context.newPage();await second.goto(origin);await second.waitForFunction(()=>window.payments);await second.evaluate(()=>window.payments.kv.hydrateKvDb());
 const race=p=>p.evaluate(()=>window.payments.ledger.executePayment({id:'two-tabs',sessionId:'fixture-chat',kind:'transfer',fromUser:false,amount:100},'collect',{id:'self',name:'测试用户',isUser:true}));
 await Promise.all([race(page),race(second)]);assert.equal(await page.evaluate(async()=>JSON.parse(await window.payments.kv.kvReadFresh(window.payments.wallet.WALLET_STATE_KEY)).balance),before+100);results.push({name:'two-tab IndexedDB concurrency',passed:true});
 const exportedBalance=await second.evaluate(async()=>{
  const x=await window.payments.backup.exportSource({type:'kv',keys:[window.payments.wallet.WALLET_STATE_KEY]});return JSON.parse(x.records[0].value).balance;
 });
 assert.equal(exportedBalance,before+100);results.push({name:'stale-tab export reads durable wallet',passed:true});
 assert.deepEqual(errors,[]);const report=JSON.stringify({results,pageErrors:errors},null,2);if(process.env.PAYMENT_TEST_REPORT)await fs.writeFile(process.env.PAYMENT_TEST_REPORT,report);console.log(report);
}finally{await browser.close();await new Promise(r=>server.close(r));await fs.rm(temp,{recursive:true,force:true});}
