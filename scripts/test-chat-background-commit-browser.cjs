// Real Dexie/IndexedDB and actual P3A storage/parse/save/ChatRoom. Synthetic origin only.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),ts=require('typescript');
async function main(){
 const repo=path.resolve(__dirname,'..'),temp=await fs.mkdtemp(path.join(os.tmpdir(),'float-p3a-commit-'));
 const src=await fs.readFile(path.join(repo,'lib/follow-up-service.ts'),'utf8'),ast=ts.createSourceFile('f.ts',src,ts.ScriptTarget.Latest,true);
 const fns=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['parseAndSaveResponse','dispatchBackgroundMessagesOneByOne'].includes(n.name?.text));assert.equal(fns.length,2);
 const fixtureImports=s=>s.replace(/@@([^@]+)@@/g,(_,p)=>JSON.stringify(p.startsWith('lib/')||p.startsWith('components/')?path.join(repo,p):require.resolve(p)));
 await fs.writeFile(path.join(temp,'followup.ts'),fixtureImports(`import {pushChatMessage,loadChatSessions,getLatestCharacterStateValues,createResponseBatchId} from @@lib/chat-storage@@;
import {markGenerationDiagnostic} from @@lib/chat-generation-diagnostics@@;
const w=window as any;
const parseAIResponse=()=>w.__parsed,resolveFollowUpSenderName=()=> 'Synthetic Character',buildGeneratedFollowUpImageMessage=(p:any)=>p;
const isCustomStatusRegionActive=()=>false,getStatusRegionConfig=()=>null;
const canCarryFollowUpPanel=()=>true,isPendingChatGeneratedImageMessage=()=>false;
const loadCharacters=()=>[],bgSetTimeout=()=>{},dispatchChatMessageNotice=()=>{};
const MAX_FOLLOW_UPS=3,BACKGROUND_MESSAGE_STAGGER_MS=800,delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
`)+fns.map(n=>n.getText(ast)).join('\n'));
 await fs.writeFile(path.join(temp,'entry.tsx'),fixtureImports(`import React from @@react@@;
import {createRoot} from @@react-dom/client@@;
import Dexie from @@dexie@@;
import * as chat from @@lib/chat-storage@@;
import {chatDb,dbPutMessageConfirmed} from @@lib/chat-db@@;
import {hydrateKvDb} from @@lib/kv-db@@;
import {saveCharacters} from @@lib/character-storage@@;
import {ensureSettingsStorageHydrated} from @@lib/settings-storage@@;
import {ChatRoom} from @@components/chat/chat-room@@;
import * as diag from @@lib/chat-generation-diagnostics@@;
import {parseAndSaveResponse} from './followup';
const w=window as any,root=createRoot(document.getElementById('app')!);
const events:any[]=[],txs:any[]=[],gates:any[]=[];
// Subscribe before Dexie attaches oncomplete. Chromium may run promise jobs
// between listeners of the same native event; a late listener is not a clock.
const nativeStates=new WeakMap<IDBTransaction,any>(),nativeTransaction=IDBDatabase.prototype.transaction;
IDBDatabase.prototype.transaction=function(...args:any[]){
 const tx=(nativeTransaction as any).apply(this,args),state:any={};nativeStates.set(tx,state);
 for(const name of ['complete','abort'])tx.addEventListener(name,()=>{
  const row=state.row;if(!row)return;
  row[name==='complete'?'complete':'abort']=true;
  events.push({event:name==='complete'?'TX_COMPLETE':'TX_ABORT',index:row.index,at:performance.now()});
 });
 return tx;
} as any;
let session:any,gate=false,failIndex=0,messageWrites=0;
const realTx=chatDb.transaction.bind(chatDb) as any,realPut=chatDb.messages.put.bind(chatDb.messages);
chatDb.messages.put=((row:any,...args:any[])=>{
 const index=++messageWrites;
 return (realPut as any)(row,...args).then((key:any)=>{
  events.push({event:'PUT_SUCCESS',id:row.id,index,at:performance.now()});
  if(index===failIndex)throw new DOMException('Synthetic write failure','QuotaExceededError');
  return key;
 });
}) as any;
(chatDb as any).transaction=(mode:any,...args:any[])=>{
 const callback=args.at(-1);
 if(mode!=='rw'||args[0]!==chatDb.messages||typeof callback!=='function')return realTx(mode,...args);
 const row:any={index:txs.length+1,complete:false,abort:false};txs.push(row);
 args[args.length-1]=()=>{
  const tx=Dexie.currentTransaction!;
  nativeStates.get(tx.idbtrans)!.row=row;
  const result=callback();
  return result.then((key:any)=>gate?Dexie.waitFor(new Promise<void>(resolve=>gates.push(resolve))).then(()=>key):key);
 };
 return realTx(mode,...args);
};
for(const name of ['chat-message-pushed','followup-message-saved','ai-call-trigger']){
 window.addEventListener(name,(event:any)=>{
  const message=event.detail?.message;
  events.push({event:name,id:message?.id,committed:txs.every(t=>t.complete),at:performance.now()});
  if(name==='followup-message-saved')void chatDb.messages.get(message.id).then(stored=>events.push({event:'DISPATCH_VERIFIED',id:message.id,equal:JSON.stringify(stored)===JSON.stringify(message)}));
 });
}
w.p3={
 async ready(){
  await hydrateKvDb();await chat.hydrateChatStorage();await ensureSettingsStorageHydrated();
  const now=new Date().toISOString();
  saveCharacters([{id:'p3-character',name:'P3 Synthetic',avatar:null,persona:'',createdAt:now,updatedAt:now}]);
  chat.addChatContact('p3-character');session={...chat.createOrGetSession('p3-character'),autoReplied:true,streamOnline:false};
  chat.saveChatSessions([session]);await chatDb.transaction('r',chatDb.sessions,()=>chatDb.sessions.count());
 },
 show(){root.render(<ChatRoom session={session} onBack={()=>{}} onDeleted={()=>{}}/>);},
 unmount(){root.render(null);},
 begin(parts:any[],options:any={},control:any={}){
  events.length=0;txs.length=0;gates.length=0;messageWrites=0;gate=Boolean(control.gate);failIndex=control.failIndex||0;
  w.__parsed={parts,stateValues:[],freshStateValues:[],statusPanel:control.statusPanel||null,innerMonologue:null};
  const run=Date.now()+'-'+Math.random();diag.startGenerationDiagnostic(run,session.id,false,'background');w.__run=run;
  w.__result=null;w.__start=performance.now();
  void parseAndSaveResponse('Synthetic response',session.id,0,undefined,[],{silent:true,diagnosticRunId:run,...options})
   .then(result=>{w.__result={ok:true,result};},error=>{w.__result={ok:false,error:error.message};})
   .finally(()=>{w.__elapsed=performance.now()-w.__start;});
 },
 release(){const r=gates.shift();if(r)r();},
 snapshot(){return {events:[...events],txs:[...txs],pending:gates.length,result:w.__result,elapsed:w.__elapsed,
  diagnostic:diag.readGenerationDiagnostics().runs.find(r=>r.runId===w.__run)};},
 async saved(ids:string[]){return Promise.all(ids.map(id=>chatDb.messages.get(id).then(row=>row||null)));},
 async directConfirmedFailure(){
  const put=chatDb.messages.put;chatDb.messages.put=(()=>Promise.reject(new DOMException('Synthetic','QuotaExceededError'))) as any;
  try{return await dbPutMessageConfirmed({id:'direct-failure',sessionId:session.id,role:'assistant',content:'synthetic',createdAt:new Date().toISOString(),status:'sent'});}finally{chatDb.messages.put=put;}
 },
 plain(){const before=txs.length;chat.pushChatMessage({sessionId:session.id,role:'user',content:'normal-original-write'});return {explicitTransactions:txs.length-before};},
 deferredPayment(){const before=messageWrites;chat.pushChatMessage({sessionId:session.id,role:'user',content:'synthetic-deferred'},{deferPaymentWrite:true,onMessageCommit:()=>{throw Error('defer must bypass confirmation');}});return {writes:messageWrites-before};}
};
`));
 await fs.writeFile(path.join(temp,'browser-notification.ts'),'export const sendBrowserNotification=()=>{};');
 const wp=require('next/dist/compiled/webpack/webpack');wp.init();
 await new Promise((resolve,reject)=>wp.webpack({mode:'development',target:'web',devtool:false,context:repo,entry:path.join(temp,'entry.tsx'),output:{path:temp,filename:'fixture.js'},resolve:{modules:[path.join(repo,'node_modules'),'node_modules'],extensions:['.tsx','.ts','.js'],alias:{'@':repo},fallback:{fs:false,path:false,crypto:false}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(repo,'scripts/anonymous-xhs-phase0/ts-loader.cjs')}]},plugins:[new wp.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})]},(err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString({all:false,errors:true}))):resolve()));
 const server=http.createServer(async(req,res)=>{res.setHeader('Content-Type',req.url.endsWith('.js')?'application/javascript':'text/html');res.end(req.url.endsWith('.js')?await fs.readFile(path.join(temp,path.basename(req.url))):'<!doctype html><meta charset="utf-8"><div style="position:relative;height:800px" id="app"></div><script>window.process={env:{NODE_ENV:"development"}}</script><script src="/fixture.js"></script>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
 const browser=await chromium.launch({headless:true,channel:process.env.CHAT_TEST_BROWSER_CHANNEL||'msedge'}),page=await browser.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
 const results=[],origin='http://127.0.0.1:'+server.address().port,check=(name,fn)=>{fn();results.push(name);console.log('PASS '+name);};
 try{
  await page.goto(origin);await page.waitForFunction(()=>window.p3);await page.evaluate(()=>window.p3.ready());await page.evaluate(()=>window.p3.show());await page.waitForSelector('.chat-room-wrapper');
  await page.evaluate(()=>window.p3.begin([{content:'p3-alpha'},{content:'p3-beta'},{content:'p3-gamma'}],{silent:false},{gate:true}));
  for(let i=0;i<3;i++){
   await page.waitForFunction(()=>window.p3.snapshot().pending===1);
   const s=await page.evaluate(()=>window.p3.snapshot());
   check('held transaction '+(i+1)+' blocks completion/dispatch',()=>{assert.equal(s.result,null);assert.ok(!s.events.some(e=>e.event==='followup-message-saved'));assert.notEqual(s.diagnostic.lastStage,'PUBLISH_DONE');});
   await page.evaluate(()=>window.p3.release());
  }
  await page.waitForFunction(()=>window.p3.snapshot().result!==null);await page.waitForFunction(()=>window.p3.snapshot().events.filter(e=>e.event==='DISPATCH_VERIFIED').length===3);
  let s=await page.evaluate(()=>window.p3.snapshot());
  check('native TX_COMPLETE precedes actual 800ms staged dispatch',()=>{
   assert.equal(s.result.ok,true,JSON.stringify(s.result));assert.equal(s.txs.filter(t=>t.complete).length,3);
   const sent=s.events.filter(e=>e.event==='followup-message-saved');assert.equal(sent.length,3);assert.ok(sent.every(e=>e.committed),JSON.stringify({sent,txs:s.txs,events:s.events}));assert.ok(sent[1].at-sent[0].at>=750);assert.ok(sent[2].at-sent[1].at>=750);
   assert.ok(s.events.filter(e=>e.event==='DISPATCH_VERIFIED').every(e=>e.equal));assert.equal(s.diagnostic.publishedCount,3);
  });
  await page.getByText('p3-gamma',{exact:true}).waitFor();check('actual ChatRoom renders committed background reply',()=>assert.equal(s.result.result.hasVisible,true));
  check('existing generic pushed event remains pre-commit',()=>assert.ok(s.events.some(e=>e.event==='chat-message-pushed'&&!e.committed)));
  await page.evaluate(()=>window.p3.unmount());
  await page.evaluate(()=>window.p3.begin([{content:'partial-alpha'},{content:'partial-beta'},{content:'partial-gamma'}],{}, {failIndex:2}));
  await page.waitForFunction(()=>window.p3.snapshot().result!==null);s=await page.evaluate(()=>window.p3.snapshot());
  const ids=s.events.filter(e=>e.event==='chat-message-pushed').map(e=>e.id),saved=await page.evaluate(ids=>window.p3.saved(ids),ids);
  check('partial commit failure blocks dispatch and false PUBLISH_DONE',()=>{
   assert.equal(s.result.ok,false);assert.match(s.result.error,/commit not confirmed/);assert.ok(!s.events.some(e=>e.event==='followup-message-saved'));assert.equal(s.txs.filter(t=>t.complete).length,2);assert.equal(s.txs.filter(t=>t.abort).length,1);assert.equal(saved.filter(Boolean).length,2);assert.notEqual(s.diagnostic.lastStage,'PUBLISH_DONE');
  });
  const direct=await page.evaluate(()=>window.p3.directConfirmedFailure());check('confirmed writer handles real transaction failure',()=>assert.equal(direct,false));
  for(const [name,parts,opts,ctrl,count] of [
   ['early call/status/shortcut',[{mediaType:'voice_call'}],{shortcutMarker:{text:'tool',name:'synthetic',insertAt:0}},{statusPanel:'synthetic-status',gate:true},4],
   ['normal shortcut',[{content:'marker-alpha'},{content:'marker-beta'}],{shortcutMarker:{text:'tool',name:'synthetic',insertAt:0}},{},4]
  ]){
   await page.evaluate(x=>window.p3.begin(x.parts,x.opts,x.ctrl),{parts,opts,ctrl});
   if(ctrl.gate)for(let i=0;i<count;i++){await page.waitForFunction(()=>window.p3.snapshot().pending===1);const a=await page.evaluate(()=>window.p3.snapshot());assert.ok(!a.events.some(e=>e.event==='ai-call-trigger'));await page.evaluate(()=>window.p3.release());}
   await page.waitForFunction(()=>window.p3.snapshot().result!==null);s=await page.evaluate(()=>window.p3.snapshot());check(name+': confirmation before notification',()=>{assert.equal(s.result.ok,true,JSON.stringify(s.result));assert.equal(s.txs.filter(t=>t.complete).length,count);assert.ok(s.events.filter(e=>e.event==='ai-call-trigger'||e.event==='followup-message-saved').every(e=>e.committed));});
  }
  await page.evaluate(()=>window.p3.unmount());await page.evaluate(()=>window.p3.begin(Array.from({length:201},(_,i)=>({content:'high-'+i}))));
  await page.waitForFunction(()=>window.p3.snapshot().result!==null,{},{timeout:30000});s=await page.evaluate(()=>window.p3.snapshot());
  check('201 bubbles: no lost/duplicate committed dispatch',()=>{assert.equal(s.result.ok,true,JSON.stringify(s.result));assert.equal(s.txs.length,201);assert.equal(s.txs.filter(t=>t.complete).length,201);assert.equal(new Set(s.events.filter(e=>e.event==='followup-message-saved').map(e=>e.id)).size,201);});
  const plain=await page.evaluate(()=>window.p3.plain()),deferred=await page.evaluate(()=>window.p3.deferredPayment());
  check('normal/deferred payment write paths unchanged',()=>{assert.equal(plain.explicitTransactions,0);assert.equal(deferred.writes,0);});
  check('no pageerrors/unhandled rejection/network upload',()=>{assert.deepEqual(errors,[]);assert.ok(requests.every(r=>r.method==='GET'&&r.url.startsWith(origin)));});
  console.log(JSON.stringify({checks:results.length,highBubbleElapsedMs:s.elapsed,highBubbleTransactions:s.txs.length,errors,results,note:'Desktop Chromium real Dexie/IDB; not iPhone durability/OOM evidence.'},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
