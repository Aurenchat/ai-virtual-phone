import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const root=process.cwd(),output=process.env.NATIVE_PRUNE_OUTPUT ? path.resolve(process.env.NATIVE_PRUNE_OUTPUT) : path.join(root,'deliveries/native-chat-prune');
fs.mkdirSync(output,{recursive:true});
const sources=['chat-db','chat-storage','chat-quote','bilingual-text','chat-cloud-delete','chat-history-prune','chat-prune-validation'];
const compiled=Object.fromEntries(sources.map(name=>[name,ts.transpileModule(fs.readFileSync(path.join(root,'lib',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText]));
for (const [name,file] of Object.entries({'react':'react/cjs/react.production.js','react/jsx-runtime':'react/cjs/react-jsx-runtime.production.js','react-dom':'react-dom/cjs/react-dom.production.js','react-dom/client':'react-dom/cjs/react-dom-client.production.js','scheduler':'scheduler/cjs/scheduler.production.js'})) compiled[name]=fs.readFileSync(path.join(root,'node_modules',file),'utf8');
compiled.dialog=ts.transpileModule(fs.readFileSync('components/chat/chat-history-prune-dialog.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const dexie=fs.readFileSync(require.resolve('dexie'),'utf8');
const setup=fs.readFileSync('scripts/native-chat-prune/browser-fixture.js','utf8');
const bundle='const SOURCES='+JSON.stringify(compiled)+';'+setup;
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','application/javascript; charset=utf-8');res.end(bundle);}else if(req.url==='/dexie.js'){res.setHeader('Content-Type','application/javascript; charset=utf-8');res.end(dexie);}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<script src="/dexie.js"></script><script src="/bundle.js"></script>')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port,profile=path.join(root,'deliveries/native-chat-prune/synthetic-browser-profile');
const results=[];const blockers=[];let context;
async function start(){context=await chromium.launchPersistentContext(profile,{headless:true,...(process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE} : {})});const page=await context.newPage();page.on('pageerror',e=>console.log('PAGE ERROR '+e));await page.goto(url);return page;}
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS '+name)}catch(e){results.push({name,status:'FAIL',error:String(e)});console.log('FAIL '+name+' '+e);throw e}}
let page=await start();
try {
 for(const keep of [50,100,200,500,1000,137])await test('retain '+keep+' / exact rich-media survivors / other session',async()=>{
  await page.reload();const r=await page.evaluate(async keep=>{const before=await seed(1234);const p=await prune.previewChatHistoryPrune('target',keep);const r=await prune.executeChatHistoryPrune(p);return {p,r,actual:storage.loadChatMessages('target'),stored:(await db.messages.where('sessionId').equals('target').toArray()).sort(storage.compareChatMessages),other:await db.messages.where('sessionId').equals('other').toArray(),expected:before.rows.slice(-keep),expectedOther:before.other}},keep);
  assert.equal(r.p.total,1234);assert.equal(r.r.deleted,1234-keep);assert.deepEqual(r.actual,r.expected);assert.deepEqual(r.stored,r.expected);assert.deepEqual(r.other,r.expectedOther);
 });
 await test('keep exceeds total; invalid quantities',async()=>{await page.reload();const r=await page.evaluate(async()=>{await seed(12);let errors=0;for(const n of [0,-1,1.5,NaN,Infinity])try{await prune.previewChatHistoryPrune('target',n)}catch{errors++}const p=await prune.previewChatHistoryPrune('target',50);return {errors,p,r:await prune.executeChatHistoryPrune(p),count:await db.messages.count()}});assert.equal(r.errors,5);assert.equal(r.p.remove,0);assert.equal(r.r.deleted,0);assert.equal(r.count,19)});
 await test('new arrival invalidates preview and is retained',async()=>{await page.reload();assert.equal(await page.evaluate(async()=>{await seed(120);const p=await prune.previewChatHistoryPrune('target',50);storage.pushChatMessage({sessionId:'target',role:'user',content:'new arrival'});try{await prune.executeChatHistoryPrune(p);return false}catch{return storage.loadChatMessages('target').length===121&&cloudCalls.length===0}}),true)});
 await test('durable-only drift rejects before cloud/local delete',async()=>{await page.reload();assert.equal(await page.evaluate(async()=>{await seed(120);const p=await prune.previewChatHistoryPrune('target',50);await db.messages.put({...makeRows(1)[0],content:'external change'});try{await prune.executeChatHistoryPrune(p);return false}catch{return await db.messages.count()===127&&cloudCalls.length===0}}),true)});
 await test('tool / response batch / response round boundary rejected',async()=>{for(const field of ['toolExecutionId','responseBatchId','responseRoundId']){await page.reload();assert.equal(await page.evaluate(async field=>{await seed(120,rows=>{rows[69][field]='shared';rows[70][field]='shared'});try{await prune.previewChatHistoryPrune('target',50);return false}catch{return await db.messages.count()===127}},field),true)}});
 await test('active generation rejects preflight',async()=>{await page.reload();assert.equal(await page.evaluate(async()=>{await seed(120);backgroundBusy=true;try{await prune.previewChatHistoryPrune('target',50);return false}catch{return true}}),true)});
 await test('IDB failure after first batch rolls back disk/cache; no delete event',async()=>{await page.reload();const r=await page.evaluate(async()=>{const before=await seed(1000);const p=await prune.previewChatHistoryPrune('target',50);let calls=0,events=0;window.addEventListener('chat-messages-deleted',()=>events++);const native=db.messages.bulkDelete.bind(db.messages);db.messages.bulkDelete=async ids=>{if(++calls===2)throw Error('synthetic IDB failure');return native(ids)};let failed=false;try{await prune.executeChatHistoryPrune(p)}catch{failed=true}db.messages.bulkDelete=native;return{failed,calls,events,same:JSON.stringify(before.rows)===JSON.stringify(storage.loadChatMessages('target')),count:await db.messages.count()}});assert.equal(r.failed,true);assert.equal(r.calls,2);assert.equal(r.events,0);assert.equal(r.same,true);assert.equal(r.count,1007)});
 await test('pending cloud blocks duplicate execution and native target mutation',async()=>{await page.reload();const r=await page.evaluate(async()=>{await seed(400);const p=await prune.previewChatHistoryPrune('target',50);let release;const cloud=load('chat-cloud-delete'),native=cloud.deleteChatMessagesFromCloudChecked;cloud.deleteChatMessagesFromCloudChecked=()=>new Promise(r=>{release=r});const running=prune.executeChatHistoryPrune(p);while(!release)await new Promise(r=>setTimeout(r,5));let duplicate=false,mutation=false;try{await prune.executeChatHistoryPrune(p)}catch{duplicate=true}try{storage.editChatMessage('target_000001','blocked')}catch{mutation=true}const releaseFirst=release;cloud.deleteChatMessagesFromCloudChecked=native;releaseFirst(0);await running;return{duplicate,mutation}});assert.equal(r.duplicate,true);assert.equal(r.mutation,true)});
 await test('cloud failure keeps local records; no success',async()=>{await page.reload();assert.equal(await page.evaluate(async()=>{await seed(120);const p=await prune.previewChatHistoryPrune('target',50);cloudFail=true;try{await prune.executeChatHistoryPrune(p);return false}catch{return await db.messages.count()===127&&storage.loadChatMessages('target').length===120}}),true)});
 await test('runtime failure explicitly warns after local commit',async()=>{await page.reload();const r=await page.evaluate(async()=>{await seed(120,rows=>rows.forEach((m,i)=>m.cloudSync={source:'weixin-cloud',botId:'synthetic',externalId:String(i)}));const p=await prune.previewChatHistoryPrune('target',50);runtimeFail=true;return prune.executeChatHistoryPrune(p)});assert.equal(r.deleted,70);assert.ok(r.warning)});

 await test('native tool-call and cloud object split rejected',async()=>{for(const kind of ['tool','cloud']){await page.reload();assert.equal(await page.evaluate(async kind=>{await seed(120,rows=>{if(kind==='tool'){rows[69].nativeToolCalls=[{id:'call-1',name:'synthetic',arguments:'{}'}];rows[70].nativeToolResult={toolCallId:'call-1',name:'synthetic',content:'ok'};}else{for(const i of [69,70])rows[i].cloudSync={source:'weixin-cloud',botId:'bot',externalId:'same-object'};}});try{await prune.previewChatHistoryPrune('target',50);return false}catch{return await db.messages.count()===127}},kind),true)}});
 await test('dialog preview invalidation / second confirmation / busy blocking',async()=>{
  await page.reload();await page.evaluate(async()=>{await seed(120);const root=document.createElement('div');document.body.append(root);load('react-dom/client').createRoot(root).render(load('react').createElement(load('dialog').ChatHistoryPruneDialog,{onClose:()=>{}}));});
  await page.getByRole('combobox').nth(0).selectOption('target');
  await page.getByRole('button',{name:'预检',exact:true}).click();
  await page.getByText('删除前总数：120',{exact:true}).waitFor();
  await page.getByRole('combobox').nth(1).selectOption('50');
  assert.equal(await page.getByText('删除前总数：120',{exact:true}).count(),0);
  await page.getByRole('button',{name:'预检',exact:true}).click();
  await page.getByRole('button',{name:'继续裁剪',exact:true}).click();
  assert.equal(await page.evaluate(()=>db.messages.count()),127);
  await page.evaluate(()=>{load('chat-cloud-delete').deleteChatMessagesFromCloudChecked=()=>new Promise(r=>{window.releaseCloud=r});});
  await page.getByRole('button',{name:'确认删除',exact:true}).click();
  await page.waitForFunction(()=>!!window.releaseCloud);
  assert.equal(await page.getByRole('button',{name:'确认删除',exact:true}).isDisabled(),true);
  assert.equal(await page.getByRole('button',{name:'关闭',exact:true}).isDisabled(),true);
  await page.evaluate(()=>releaseCloud(0));
  try { await page.getByText('已确认保存：删除 70 条消息。',{exact:true}).waitFor({timeout:5000}); } catch(e) {console.log(await page.locator('body').innerText());throw e;}
  assert.equal(await page.evaluate(()=>db.messages.count()),57);
 });


 await test('foreign-session IDs rejected by confirmed native deletion',async()=>{await page.reload();assert.equal(await page.evaluate(async()=>{await seed(120);const expected=JSON.parse(JSON.stringify(storage.loadChatMessages('target'))),session=JSON.parse(JSON.stringify(storage.loadChatSessions().find(s=>s.id==='target')));try{await storage.withChatHistoryPruneLock('target',()=>storage.deleteChatMessagesByIds('target',['other_000000'],{expected,session}));return false}catch{return await db.messages.count()===127}}),true)});
 let retained;
 await test('20000 messages / 95 batches <=200 / exact 1000 survivors',async()=>{await page.reload();const r=await page.evaluate(async()=>{const before=await seed(20000);const p=await prune.previewChatHistoryPrune('target',1000);const batches=[];const native=db.messages.bulkDelete.bind(db.messages);db.messages.bulkDelete=ids=>{batches.push(ids.length);return native(ids)};const r=await prune.executeChatHistoryPrune(p);return{r,batches,rows:storage.loadChatMessages('target'),expected:before.rows.slice(-1000),other:before.other}});assert.equal(r.r.deleted,19000);assert.equal(r.batches.length,95);assert.ok(r.batches.every(n=>n<=200));assert.deepEqual(r.rows,r.expected);retained=r;});
 await test('cold browser restart rehydrates committed survivors / other session',async()=>{const cdp=await context.browser().newBrowserCDPSession();const old=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);await context.close();const alive=old.filter(pid=>{try{process.kill(pid,0);return true}catch(error){if(error.code==='ESRCH')return false;throw error}});assert.deepEqual(alive,[],'owned old Chrome processes must exit');page=await start();const nextCdp=await context.browser().newBrowserCDPSession();const next=(await nextCdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);assert.ok(next.every(pid=>!old.includes(pid)));fs.writeFileSync(path.join(output,'cold-process.json'),JSON.stringify({oldPids:old,oldPidsStillAlive:alive,newPids:next},null,2));const r=await page.evaluate(async()=>{await storage.hydrateChatStorage();return{rows:storage.loadChatMessages('target'),other:storage.loadChatMessages('other')}});assert.deepEqual(r.rows,retained.expected);assert.deepEqual(r.other,retained.other)});

 await page.reload();
 const race=await page.evaluate(async()=>{
   await seed(120);const p=await prune.previewChatHistoryPrune('target',50),old=storage.loadChatMessages('target')[0];
   const outside=new Dexie('AiPhoneChatDB');outside.version(1).stores({messages:'id, sessionId, createdAt',sessions:'id, contactId',contacts:'id, characterId'});await outside.open();
   const native=db.messages.bulkDelete.bind(db.messages);let pending;
   db.messages.bulkDelete=ids=>{const result=native(ids);if(!pending)pending=outside.messages.put(old);return result};
   let success,error;try{success=await prune.executeChatHistoryPrune(p)}catch(e){error=e.message}await pending;
   const actual=await outside.messages.where('sessionId').equals('target').count();outside.close();
   return {reportedDeleted:success?.deleted,error,expectedRemaining:50,actualRemaining:actual,cacheRemaining:storage.loadChatMessages('target').length};
 });
 const gap={name:'queued direct writer can resurrect deleted row after prune commit',kind:'non-cooperating-writer probe',status:race.actualRemaining===50&&race.cacheRemaining===50?'PASS':'BLOCKED',evidence:race};
 if(gap.status==='BLOCKED')blockers.push(gap);
 fs.writeFileSync(path.join(output,'concurrency-gap.json'),JSON.stringify(gap,null,2));
 console.log(gap.status+' '+gap.name+' '+JSON.stringify(race));


} finally {await context?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({syntheticOnly:true,transport:'mocked cloud; real Chromium IndexedDB, production storage modules',gate:blockers.length||results.some(r=>r.status==='FAIL')?'NO_GO':'PASS',blockers,results},null,2));}


if(blockers.length) process.exitCode=1;
