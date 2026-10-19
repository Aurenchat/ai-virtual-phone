import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const root=process.cwd(),output=process.env.NATIVE_PRUNE_OUTPUT ? path.resolve(process.env.NATIVE_PRUNE_OUTPUT) : path.join(root,'deliveries/native-chat-prune/concurrency-fix',process.env.RACE_STAGE||'after');
fs.mkdirSync(output,{recursive:true});
const sources=['chat-db','chat-storage','chat-cloud-delete','chat-history-prune','chat-prune-validation'];
const compiled=Object.fromEntries(sources.map(name=>[name,ts.transpileModule(fs.readFileSync(path.join(root,'lib',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText]));
for (const [name,file] of Object.entries({'react':'react/cjs/react.production.js','react/jsx-runtime':'react/cjs/react-jsx-runtime.production.js','react-dom':'react-dom/cjs/react-dom.production.js','react-dom/client':'react-dom/cjs/react-dom-client.production.js','scheduler':'scheduler/cjs/scheduler.production.js'})) compiled[name]=fs.readFileSync(path.join(root,'node_modules',file),'utf8');
compiled.dialog=ts.transpileModule(fs.readFileSync('components/chat/chat-history-prune-dialog.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
compiled['media-maintenance']=ts.transpileModule(fs.readFileSync('lib/media-maintenance.ts','utf8')+'\nexport { persistChatMediaPatch as testPersistChatMediaPatch };',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const dexie=fs.readFileSync(require.resolve('dexie'),'utf8');
const setup=fs.readFileSync('scripts/native-chat-prune/browser-fixture.js','utf8');
const bundle='const SOURCES='+JSON.stringify(compiled)+';'+setup+'\n'+fs.readFileSync('scripts/native-chat-prune/race-fixture.js','utf8');
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','application/javascript; charset=utf-8');res.end(bundle);}else if(req.url==='/dexie.js'){res.setHeader('Content-Type','application/javascript; charset=utf-8');res.end(dexie);}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<script src="/dexie.js"></script><script src="/bundle.js"></script>')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port,profile=path.join(root,'deliveries/native-chat-prune/race-profile');
const results=[];const blockers=[];let context;
async function start(){context=await chromium.launchPersistentContext(profile,{headless:true,...(process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE} : {})});const page=await context.newPage();page.on('pageerror',e=>console.log('PAGE ERROR '+e));await page.goto(url);return page;}
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS '+name)}catch(e){results.push({name,status:'FAIL',error:String(e)});console.log('FAIL '+name+' '+e);throw e}}
let page=await start();

async function check(name,run){await page.reload();try{const evidence=await run();results.push({name,kind:name.includes('independent')?'non-cooperating-writer probe':'native-regression',status:'PASS',evidence});console.log('PASS '+name)}catch(error){results.push({name,kind:name.includes('independent')?'non-cooperating-writer probe':'native-regression',status:'FAIL',error:String(error),evidence:error.actual});console.log('FAIL '+name+' '+String(error))}}
async function counts(){return page.evaluate(async()=>({disk:await db.messages.where('sessionId').equals('target').count(),cache:storage.loadChatMessages('target').length}))}
try {
 await check('unchanged independent connection put during transaction',async()=>{
  const r=await page.evaluate(async()=>{
   await seed(120);const p=await prune.previewChatHistoryPrune('target',50),old=storage.loadChatMessages('target')[0];
   const outside=new Dexie('AiPhoneChatDB');outside.version(1).stores({messages:'id, sessionId, createdAt',sessions:'id, contactId',contacts:'id, characterId'});await outside.open();
   const native=db.messages.bulkDelete.bind(db.messages);let pending;const trace=[];
   db.messages.bulkDelete=ids=>{const result=native(ids);if(!pending){trace.push({at:'during-prune-transaction',writingId:old.id,deletedInBatch:ids.includes(old.id)});pending=outside.messages.put(old).then(()=>trace.push({at:'independent-put-resolved'}));}return result};
   let success,error;try{success=await prune.executeChatHistoryPrune(p)}catch(e){error=e.message}trace.push({at:'prune-promise-resolved',error});await pending;
   const actual=await outside.messages.where('sessionId').equals('target').count();outside.close();
   return {reportedDeleted:success?.deleted,error,disk:actual,cache:storage.loadChatMessages('target').length,restored:!!await db.messages.get(old.id),trace};
  });fs.writeFileSync(path.join(output,'raw-put-trace.json'),JSON.stringify(r,null,2));assert.equal(r.disk,50);assert.equal(r.cache,50);assert.equal(r.restored,false);return r;
 });
 await check('independent put just after commit',async()=>{
  const r=await page.evaluate(async()=>{await seed(120);const old=storage.loadChatMessages('target')[0];await prune.executeChatHistoryPrune(await prune.previewChatHistoryPrune('target',50));const outside=new Dexie('AiPhoneChatDB');outside.version(1).stores({messages:'id, sessionId, createdAt',sessions:'id, contactId',contacts:'id, characterId'});await outside.open();await outside.messages.put(old);outside.close();return{disk:await db.messages.where('sessionId').equals('target').count(),cache:storage.loadChatMessages('target').length}});assert.deepEqual(r,{disk:50,cache:50});return r;
 });
 await check('real persistChatMediaPatch late completion cannot resurrect deleted ID',async()=>{
  const r=await page.evaluate(async()=>{await seed(120);const old=storage.loadChatMessages('target')[0];await prune.executeChatHistoryPrune(await prune.previewChatHistoryPrune('target',50));await load('media-maintenance').testPersistChatMediaPatch(old,{content:'late synthetic metadata'});return {id:old.id,disk:await db.messages.where('sessionId').equals('target').count(),cache:storage.loadChatMessages('target').length,restored:!!await db.messages.get(old.id)}});fs.writeFileSync(path.join(output,'native-late-write.json'),JSON.stringify(r,null,2));assert.equal(r.disk,50);assert.equal(r.cache,50);assert.equal(r.restored,false);return r;
 });
 await check('old async task captured before prune, resumes after commit',async()=>{
  const r=await page.evaluate(async()=>{await seed(120);const old=storage.loadChatMessages('target')[0];let resume;const deferred=new Promise(r=>resume=r);const task=(async()=>{await deferred;await load('media-maintenance').testPersistChatMediaPatch(old,{content:'old task'});})();await prune.executeChatHistoryPrune(await prune.previewChatHistoryPrune('target',50));resume();await task;return{disk:await db.messages.where('sessionId').equals('target').count(),cache:storage.loadChatMessages('target').length}});assert.deepEqual(r,{disk:50,cache:50});return r;
 });
 await check('native metadata task during prune is rejected, cannot resurrect',async()=>{
  const r=await page.evaluate(async()=>{await seed(120);const old=storage.loadChatMessages('target')[0];const native=db.messages.bulkDelete.bind(db.messages);let task,error;db.messages.bulkDelete=ids=>{const result=native(ids);task=load('media-maintenance').testPersistChatMediaPatch(old,{content:'during'}).catch(e=>{error=e.message});return result};await prune.executeChatHistoryPrune(await prune.previewChatHistoryPrune('target',50));await task;return{disk:await db.messages.where('sessionId').equals('target').count(),cache:storage.loadChatMessages('target').length,error}});assert.equal(r.disk,50);assert.equal(r.cache,50);assert.match(r.error,/正在裁剪/);return r;
 });
 await check('update-existing queued during native transaction cannot reinsert',async()=>{
  const r=await page.evaluate(async()=>{await seed(120);const old=storage.loadChatMessages('target')[0];const native=db.messages.bulkDelete.bind(db.messages);let pending;db.messages.bulkDelete=ids=>{const result=native(ids);pending=Dexie.ignoreTransaction(()=>db.messages.update(old.id,old));return result};await prune.executeChatHistoryPrune(await prune.previewChatHistoryPrune('target',50));return{matched:await pending,disk:await db.messages.where('sessionId').equals('target').count(),cache:storage.loadChatMessages('target').length}});assert.deepEqual(r,{matched:0,disk:50,cache:50});return r;
 });
 await check('fresh normal message during prune is accepted and persists',async()=>{
  const r=await page.evaluate(async()=>{await seed(120);let entered,release;const entering=new Promise(r=>entered=r),deferred=new Promise(r=>release=r);load('chat-cloud-delete').deleteChatMessagesFromCloudChecked=()=>{entered();return deferred};const pending=prune.executeChatHistoryPrune(await prune.previewChatHistoryPrune('target',50));await entering;let pushError,pruneError;try{storage.pushChatMessage({id:'fresh-during-prune',sessionId:'target',role:'user',content:'genuinely new'});}catch(e){pushError=e.message}release(0);try{await pending}catch(e){pruneError=e.message}await db.transaction('r',db.messages,()=>db.messages.count());return{pushError,pruneError,durable:!!await db.messages.get('fresh-during-prune'),cached:storage.loadChatMessages('target').some(m=>m.id==='fresh-during-prune')}});fs.writeFileSync(path.join(output,'fresh-message-during-prune.json'),JSON.stringify(r,null,2));assert.equal(r.pushError,undefined);assert.equal(r.durable,true);assert.equal(r.cached,true);return r;
 });
 await check('fresh message after commit is accepted normally',async()=>{
  const r=await page.evaluate(async()=>{await seed(120);await prune.executeChatHistoryPrune(await prune.previewChatHistoryPrune('target',50));storage.pushChatMessage({id:'fresh-after-prune',sessionId:'target',role:'user',content:'new'});await db.transaction('r',db.messages,()=>db.messages.count());return{disk:await db.messages.where('sessionId').equals('target').count(),cache:storage.loadChatMessages('target').length,durable:!!await db.messages.get('fresh-after-prune')}});assert.deepEqual(r,{disk:51,cache:51,durable:true});return r;
 });
 await check('other-session arrival during prune remains intact',async()=>{
  const r=await page.evaluate(async()=>{const before=await seed(120);let entered,release;const entering=new Promise(r=>entered=r),deferred=new Promise(r=>release=r);load('chat-cloud-delete').deleteChatMessagesFromCloudChecked=()=>{entered();return deferred};const pending=prune.executeChatHistoryPrune(await prune.previewChatHistoryPrune('target',50));await entering;storage.pushChatMessage({id:'other-new',sessionId:'other',role:'user',content:'new'});release(0);await pending;await db.transaction('r',db.messages,()=>db.messages.count());return{target:storage.loadChatMessages('target'),expected:before.rows.slice(-50),other:storage.loadChatMessages('other'),expectedOther:before.other,newStored:!!await db.messages.get('other-new')}});assert.deepEqual(r.target,r.expected);assert.deepEqual(r.other.slice(0,7),r.expectedOther);assert.equal(r.other.length,8);assert.equal(r.newStored,true);
 });
 await check('existing retained media metadata update preserves disk/cache agreement',async()=>{
  const r=await page.evaluate(async()=>{const before=await seed(120);await prune.executeChatHistoryPrune(await prune.previewChatHistoryPrune('target',50));const row=storage.loadChatMessages('target')[1];await load('media-maintenance').testPersistChatMediaPatch(row,{mediaUrl:'media-store://synthetic-updated'});return {disk:await db.messages.get(row.id),cached:storage.loadChatMessages('target').find(m=>m.id===row.id),others:await db.messages.where('sessionId').equals('other').toArray(),expectedOther:before.other,count:await db.messages.where('sessionId').equals('target').count()}});assert.deepEqual(r.disk,r.cached);assert.equal(r.count,50);assert.deepEqual(r.others,r.expectedOther);
 });

 await check('fresh arrival inside native delete transaction aborts prune without losing message',async()=>{
  const r=await page.evaluate(async()=>{
   const before=await seed(120),native=db.messages.bulkDelete.bind(db.messages);let once=false,pruneError;
   db.messages.bulkDelete=async ids=>{await native(ids);if(!once){once=true;Dexie.ignoreTransaction(()=>storage.pushChatMessage({id:'fresh-during-local-tx',sessionId:'target',role:'user',content:'new during transaction'}));}};
   try{await prune.executeChatHistoryPrune(await prune.previewChatHistoryPrune('target',50))}catch(e){pruneError=e.message}
   await db.transaction('r',db.messages,db.sessions,()=>db.messages.count());
   return{pruneError,disk:(await db.messages.where('sessionId').equals('target').toArray()).sort(storage.compareChatMessages),cached:storage.loadChatMessages('target'),before:before.rows};
  });assert.match(r.pruneError,/预检已失效/);assert.equal(r.disk.length,121);assert.deepEqual(r.disk,r.cached);assert.deepEqual(r.disk.slice(0,120),r.before);
 });
 await check('fresh arrival at transaction complete is retained with latest session preview',async()=>{
  const r=await page.evaluate(async()=>{
   const before=await seed(120),native=db.messages.bulkDelete.bind(db.messages);let once=false;
   db.messages.bulkDelete=ids=>{if(!once){once=true;Dexie.currentTransaction.on('complete',()=>Dexie.ignoreTransaction(()=>storage.pushChatMessage({id:'fresh-at-commit',sessionId:'target',role:'user',content:'new at commit'})));}return native(ids)};
   const result=await prune.executeChatHistoryPrune(await prune.previewChatHistoryPrune('target',50));
   await db.transaction('r',db.messages,db.sessions,()=>db.messages.count());
   return{result,disk:(await db.messages.where('sessionId').equals('target').toArray()).sort(storage.compareChatMessages),cached:storage.loadChatMessages('target'),expected:before.rows.slice(-50),session:await db.sessions.get('target'),cacheSession:storage.loadChatSessions().find(s=>s.id==='target')};
  });assert.equal(r.result.deleted,70);assert.equal(r.disk.length,51);assert.deepEqual(r.disk,r.cached);assert.deepEqual(r.disk.slice(0,50),r.expected);assert.equal(r.session.lastMessageId,'fresh-at-commit');assert.deepEqual(r.session,r.cacheSession);
 });
 await check('late explicit reuse of a deleted ID is rejected while prune lock remains',async()=>{
  const r=await page.evaluate(async()=>{
   await seed(120);const old=storage.loadChatMessages('target')[0];let entered,release;const entering=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
   // Hold the cloud runtime step after local commit without using a timeout.
   const cloud=load('chat-cloud-delete');cloud.deleteChatMessagesFromCloudChecked=async()=>1;
   fake['./weixin-cloud-sync'].syncAllWeixinBotRuntimesToCloud=()=>{entered();return gate};
   const pending=prune.executeChatHistoryPrune(await prune.previewChatHistoryPrune('target',50));await entering;
   let error;try{storage.pushChatMessage({...old})}catch(e){error=e.message}release();await pending;
   return{error,disk:await db.messages.where('sessionId').equals('target').count(),cache:storage.loadChatMessages('target').length,restored:!!await db.messages.get(old.id)};
  });assert.match(r.error,/已被裁剪/);assert.equal(r.disk,50);assert.equal(r.cache,50);assert.equal(r.restored,false);
 });


 let expected;
 await check('cold restart after late native write still contains exact same 50 rows',async()=>{
  expected=await page.evaluate(async()=>{const before=await seed(120);await prune.executeChatHistoryPrune(await prune.previewChatHistoryPrune('target',50));await load('media-maintenance').testPersistChatMediaPatch(before.rows[0],{content:'late'});return{rows:before.rows.slice(-50),other:before.other}});
  const cdp=await context.browser().newBrowserCDPSession(),old=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);await context.close();for(const pid of old){let alive=true;try{process.kill(pid,0)}catch(e){if(e.code!=='ESRCH')throw e;alive=false}assert.equal(alive,false);}
  page=await start();const cdp2=await context.browser().newBrowserCDPSession(),fresh=(await cdp2.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);assert.ok(fresh.every(pid=>!old.includes(pid)));
  const actual=await page.evaluate(async()=>{await storage.hydrateChatStorage();return{rows:storage.loadChatMessages('target'),other:storage.loadChatMessages('other')}});fs.writeFileSync(path.join(output,'cold-native-patch.json'),JSON.stringify({oldPids:old,newPids:fresh,expected:50,actual:actual.rows.length},null,2));assert.deepEqual(actual,expected);
 });
} finally {await context?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({syntheticOnly:true,gate:results.some(r=>r.status==='FAIL')?'NO_GO':'PASS',results},null,2));}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
