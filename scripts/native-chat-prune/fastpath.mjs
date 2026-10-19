import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const root=process.cwd(),output=process.env.NATIVE_PRUNE_OUTPUT ? path.resolve(process.env.NATIVE_PRUNE_OUTPUT) : path.join(root,'deliveries/native-chat-prune/fastpath-v02');
fs.mkdirSync(output,{recursive:true});
const sources=['chat-db','chat-storage','chat-cloud-delete','chat-history-prune','chat-prune-validation'];
const compiled=Object.fromEntries(sources.map(name=>[name,ts.transpileModule(fs.readFileSync(path.join(root,'lib',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText]));
for (const [name,file] of Object.entries({'react':'react/cjs/react.production.js','react/jsx-runtime':'react/cjs/react-jsx-runtime.production.js','react-dom':'react-dom/cjs/react-dom.production.js','react-dom/client':'react-dom/cjs/react-dom-client.production.js','scheduler':'scheduler/cjs/scheduler.production.js'})) compiled[name]=fs.readFileSync(path.join(root,'node_modules',file),'utf8');
compiled.dialog=ts.transpileModule(fs.readFileSync('components/chat/chat-history-prune-dialog.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const dexie=fs.readFileSync(require.resolve('dexie'),'utf8');
const setup=fs.readFileSync('scripts/native-chat-prune/browser-fixture.js','utf8');
const bundle='const SOURCES='+JSON.stringify(compiled)+';'+setup;
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','application/javascript; charset=utf-8');res.end(bundle);}else if(req.url==='/dexie.js'){res.setHeader('Content-Type','application/javascript; charset=utf-8');res.end(dexie);}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<script src="/dexie.js"></script><script src="/bundle.js"></script>')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port,profile=path.join(root,'deliveries/native-chat-prune/fastpath-profile');
const results=[];const blockers=[];let context;
async function start(){context=await chromium.launchPersistentContext(profile,{headless:true,...(process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE} : {})});const page=await context.newPage();page.on('pageerror',e=>console.log('PAGE ERROR '+e));await page.goto(url);return page;}
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS '+name)}catch(e){results.push({name,status:'FAIL',error:String(e)});console.log('FAIL '+name+' '+e);throw e}}
let page=await start();
let expected;
try {
 await test('in-place nested metadata mutation after preview is rejected before any deletion',async()=>{
  const r=await page.evaluate(async()=>{await seed(120);const p=await prune.previewChatHistoryPrune('target',50);storage.loadChatMessages('target')[2].mediaData.voiceDuration=999;let error;try{await prune.executeChatHistoryPrune(p)}catch(e){error=e.message}return{error,count:await db.messages.where('sessionId').equals('target').count(),cloudCalls:cloudCalls.length}});assert.match(r.error,/预检已失效/);assert.equal(r.count,120);assert.equal(r.cloudCalls,0);
 });
 await test('real IndexedDB cursor validation rejects committed durable-only drift',async()=>{
  await page.reload();const r=await page.evaluate(async()=>{await seed(120);const expected=storage.loadChatMessages('target'),checker=load('chat-prune-validation').createPruneDiskChecker(expected);await db.messages.update(expected[3].id,{content:'durable-only change'});let error;try{await db.transaction('r',db.messages,async()=>{await db.messages.where('sessionId').equals('target').each(row=>checker.inspect(row));checker.complete()})}catch(e){error=e.message}return{error,count:await db.messages.where('sessionId').equals('target').count()}});assert.match(r.error,/禁止裁剪/);assert.equal(r.count,120);
 });
 await test('20000 rich records persisted; no full-history stringify or toArray; exact 1000 remain',async()=>{
  await page.reload();const r=await page.evaluate(async()=>{
   const before=await seed(20000,rows=>{for(const row of rows){row.content+=' / synthetic payload '+ 'x'.repeat(2048);if(row.mediaType==='image')row.mediaUrl='data:image/png;base64,'+'A'.repeat(4096)}rows[10].content+='z'.repeat(1024*1024)});
   const validation=load('chat-prune-validation'),expectedRows=before.rows.slice(-1000),other=await validation.fingerprintPruneMessages(before.other),fingerprint=await validation.fingerprintPruneMessages(expectedRows);
   const persisted=await db.messages.where('sessionId').equals('target').count();let serializedChars=0;for(const row of before.rows)serializedChars+=JSON.stringify(row).length;
   const collectionPrototype=Object.getPrototypeOf(db.messages.toCollection());const stringify=JSON.stringify,nativeToArray=collectionPrototype.toArray,nativeDelete=db.messages.bulkDelete.bind(db.messages);let forbiddenArrays=0,forbiddenReads=0;const batches=[];
   JSON.stringify=function(value,...args){if(Array.isArray(value)&&value.length>1000&&value[0]?.sessionId==='target'){forbiddenArrays++;throw Error('forbidden whole-history serialization')}return stringify.call(JSON,value,...args)};
   collectionPrototype.toArray=function(...args){if(this._ctx?.table?.name==='messages'){forbiddenReads++;throw Error('forbidden whole-history materialization')}return nativeToArray.apply(this,args)};
   db.messages.bulkDelete=ids=>{batches.push(ids.length);return nativeDelete(ids)};
   let outcome;const start=performance.now();try{const p=await prune.previewChatHistoryPrune('target',1000);outcome=await prune.executeChatHistoryPrune(p)}finally{JSON.stringify=stringify;collectionPrototype.toArray=nativeToArray}
   const elapsedMs=performance.now()-start,disk=(await db.messages.where('sessionId').equals('target').toArray()).sort(storage.compareChatMessages),cache=storage.loadChatMessages('target');
   if(!validation.equalPruneMessages(expectedRows,disk)||!validation.equalPruneMessages(disk,cache))throw Error('exact rich survivors mismatch');
   if(await validation.fingerprintPruneMessages(await db.messages.where('sessionId').equals('other').toArray())!==other)throw Error('other session changed');
   return{persisted,serializedChars,outcome,elapsedMs,batches,forbiddenArrays,forbiddenReads,disk:disk.length,cache:cache.length,fingerprint,other};
  });assert.equal(r.persisted,20000);assert.equal(r.outcome.deleted,19000);assert.equal(r.disk,1000);assert.equal(r.cache,1000);assert.equal(r.batches.length,95);assert.ok(r.batches.every(n=>n<=200));assert.equal(r.forbiddenArrays,0);assert.equal(r.forbiddenReads,0);expected=r;fs.writeFileSync(path.join(output,'rich-20000.json'),JSON.stringify(r,null,2));
 });
 await test('full browser process cold restart preserves exact rich survivors and other session',async()=>{
  const cdp=await context.browser().newBrowserCDPSession(),old=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);await context.close();const alive=old.filter(pid=>{try{process.kill(pid,0);return true}catch(e){if(e.code==='ESRCH')return false;throw e}});assert.deepEqual(alive,[]);page=await start();const fresh=(await (await context.browser().newBrowserCDPSession()).send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);assert.ok(fresh.every(pid=>!old.includes(pid)));const r=await page.evaluate(async()=>{await storage.hydrateChatStorage();const v=load('chat-prune-validation');return{count:storage.loadChatMessages('target').length,fingerprint:await v.fingerprintPruneMessages(storage.loadChatMessages('target')),other:await v.fingerprintPruneMessages(storage.loadChatMessages('other'))}});assert.equal(r.count,1000);assert.equal(r.fingerprint,expected.fingerprint);assert.equal(r.other,expected.other);fs.writeFileSync(path.join(output,'rich-cold-process.json'),JSON.stringify({oldPids:old,oldPidsStillAlive:alive,newPids:fresh,...r},null,2));
 });
} finally {await context?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(output,'fastpath-results.json'),JSON.stringify({syntheticOnly:true,results},null,2));}
