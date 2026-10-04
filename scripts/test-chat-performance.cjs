const cp=require('node:child_process'), ts=require('typescript'), fs=require('node:fs'), os=require('node:os'), path=require('node:path');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const baseline=process.argv.includes('--baseline');
const get=p=>!baseline && fs.existsSync(p)?fs.readFileSync(p,'utf8'):cp.execFileSync('git',['show','0389dd2:'+p],{encoding:'utf8',maxBuffer:20e6});
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const storage=compile(get('lib/chat-storage.ts')+'\nexports.__audit={normalizeLegacyTextToolHistory,refreshSessionPreviewMetadata,restoreContactsForPrivateSessions,setData(d){_messagesCache=d.messages;_sessionsCache=d.sessions;_contactsCache=d.contacts;_hydrated=false;_hydratePromise=null;if(typeof rebuildMessageIndex==="function")rebuildMessageIndex();}};');
const protocol=compile(get('lib/text-tool-protocol.ts'));
const db=compile(get('lib/chat-db.ts'));
const listSource=get('components/chat/chat-message-list.tsx');
const ast=ts.createSourceFile('list.tsx',listSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['parseTime','pickLaterTime','hasSessionListContent','getSessionListTime'];
const helpers=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
const begin=listSource.indexOf('const regularItems =');
const expr=listSource.slice(begin,listSource.indexOf('.map(s => (',begin)).trim()+';';
const listPrep=compile(helpers+'\nconst contactIds=new Set(loadChatContacts().map(c=>c.characterId));const allChars=loadCharacters(),keyword="",listTab="all";'+expr+'\nregularItems.forEach(s=>getLastVisibleSessionMessage(s.id));');
const bridge=fs.readFileSync(baseline?'scripts/chat-performance/bridge-before.js':'themes/imessage-native-day/iMessage-Message-Bridge.js','utf8').replace(/\r\n/g,'\n');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
 const context=await browser.newContext({viewport:{width:402,height:874}});
 await context.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body></body></html>'}));
 const page=await context.newPage();await page.goto('https://float-audit.invalid/');
 await page.addScriptTag({content:fs.readFileSync(path.join(path.dirname(require.resolve('dexie')),'dexie.js'),'utf8')});
 const result=await page.evaluate(async({storage,protocol,db,bridge,listPrep})=>{
 const run=(code,require)=>{const exports={};new Function('exports','require',code)(exports,require);return exports;};
 const noop=()=>{};
 const protocolApi=run(protocol,()=>{throw Error('unexpected import')});
 const dbApi=run(db,p=>p==='./boot-diagnostics'?{markBootStage(){}}:{default:window.Dexie});
 let chars=[];
 const mocks={
 './boot-diagnostics':{markBootStage(){}},
 './chat-db':{...dbApi,dbPutMessages:noop,dbPutSessions:noop,dbReplaceSessions:noop,dbReplaceContacts:noop},
 './settings-storage':{resolveUserIdentity:()=>({name:'User'})},
 './character-storage':{loadCharacters:()=>chars},
 './kv-db':{kvGet:()=>null,kvSet:noop,registerKvMigration:noop},
 './chat-plugin-hooks':{emitChatPluginEvent:noop,runChatPluginTransformSync:(_,p)=>p},
 './rich-message-parser':{parseAIResponse:()=>[]},
 './text-tool-protocol':protocolApi,
 './chat-status-region':{captureCurrentStatusRendererId:()=>null}
 };
 const core=run(storage,p=>{if(!mocks[p])throw Error(p);return mocks[p]});
 localStorage.setItem('ai_phone_idb_migrated_v1','1');
 const fixture=(M,S,legacy=0,skew=false,ordered=true,notice=false)=>{
 const sessions=Array.from({length:S},(_,i)=>({id:'s'+i,contactId:'c'+i,updatedAt:'2026-01-01T00:00:00.000Z',unreadCount:0,isPinned:false}));
 const contacts=sessions.map((s,i)=>({id:'contact'+i,characterId:s.contactId,addedAt:s.updatedAt}));
 chars=sessions.map(s=>({id:s.contactId,name:s.contactId}));
 const orders=new Map();
 const messages=Array.from({length:M},(_,i)=>{
 const si=skew&&i<Math.floor(M*.8)?0:i%S,order=orders.get(si)||0;orders.set(si,order+1);
 const msg={id:'m'+String(i).padStart(7,'0'),sessionId:'s'+si,role:i%2?'assistant':'user',content:'Synthetic message '+i+' '+ 'x'.repeat(100),createdAt:new Date(1700000000000+i*1000).toISOString(),status:'sent'};
 if(ordered)msg.order=order;
 if(i<Math.floor(M*legacy)){msg.role='assistant';msg.mediaType=notice?'tool_notice':'tool_result';msg.content='[获取工具: audit]';if(notice){msg.rawResponseText=msg.content;msg.responseBatchId='batch'+i;}}
 return msg;
 });
 let seed=12345;for(let i=M-1;i>0;i--){seed=(seed*1664525+1013904223)>>>0;const j=seed%(i+1);[messages[i],messages[j]]=[messages[j],messages[i]];}
 return {messages,sessions,contacts};
 };
 const measure=async(fn,n=3)=>{const a=[];for(let i=0;i<n;i++){const t=performance.now();await fn();a.push(performance.now()-t);}return +a.sort((a,b)=>a-b)[Math.floor(a.length/2)].toFixed(2);};
 const prepare=new Function('sessions','loadChatContacts','loadCharacters','getLastVisibleSessionMessage','getLastChatOfflineTurn',listPrep);
 const rows=[];
 for(const [M,S] of [5000,10000,25000,50000].flatMap(M=>[50,200].map(S=>[M,S]))){
 const d=fixture(M,S);await dbApi.chatDb.messages.clear();await dbApi.chatDb.sessions.clear();await dbApi.chatDb.contacts.clear();
 await dbApi.chatDb.messages.bulkPut(d.messages);await dbApi.chatDb.sessions.bulkPut(d.sessions);await dbApi.chatDb.contacts.bulkPut(d.contacts);
 const init=await measure(()=>dbApi.initChatDb());
 d.messages=(await dbApi.initChatDb()).messages;
 core.__audit.setData(d);
 const legacy=await measure(()=>core.__audit.normalizeLegacyTextToolHistory(d.messages));
 const preview=await measure(()=>core.__audit.refreshSessionPreviewMetadata(d.sessions));
 const contacts=await measure(()=>core.__audit.restoreContactsForPrivateSessions(d.contacts,d.sessions));
 const sessions=await measure(()=>core.loadChatSessions());
 const messages=await measure(()=>core.loadChatMessages('s0'),7);
 const hydrate=await measure(async()=>{core.__audit.setData(d);await core.hydrateChatStorage();});
 const preparation=await measure(()=>prepare(core.loadChatSessions(),core.loadChatContacts,()=>chars,core.getLastVisibleSessionMessage,()=>null));
 rows.push({M,S,init,legacy,preview,contacts,sessions,messages,hydrate,preparation});
 }
 const variations=[];
 for(const [M,S,ratio,skew,ordered,notice] of [[50000,20,0,false,true,false],[50000,200,0,false,true,false],[50000,50,0,true,true,false],[50000,50,0,false,false,false],...[5000,10000,25000,50000].flatMap(M=>[.01,.05].map(ratio=>[M,50,ratio,false,true,false])),[50000,50,.01,false,true,true]]){
 const d=fixture(M,S,ratio,skew,ordered,notice);core.__audit.setData(d);
 variations.push({M,S,ratio,skew,ordered,notice,normalize:await measure(()=>core.__audit.normalizeLegacyTextToolHistory(d.messages)),sessions:await measure(()=>core.loadChatSessions()),messages:await measure(()=>core.loadChatMessages('s0'),7)});
 }
 window.auditCore=core;window.auditFixture=fixture;window.auditBridge=bridge;
 return {userAgent:navigator.userAgent,rows,variations};
 },{storage,protocol,db,bridge,listPrep});


 const dom=await page.evaluate(async()=>{
 const core=window.auditCore, fixture=window.auditFixture;
 const wait=()=>new Promise(r=>setTimeout(r,120));
 let counters={sessions:0,lists:0,sessionMs:0,listMs:0},hooks={};
 window.auditRoomTimes=[];window.auditRefreshTimes=[];
 const ctx={data:{sessions:{revision:id=>core.getChatSessionRevision?.(id),get:id=>{let t=performance.now();counters.sessions++;const r=core.loadChatSessions().find(s=>s.id===id);counters.sessionMs+=performance.now()-t;return r;}},messages:{revision:id=>core.getChatSessionRevision?.(id),list:id=>{let t=performance.now();counters.lists++;const r=core.loadChatMessages(id);counters.listMs+=performance.now()-t;return r;}},characters:{get:()=>({name:'Synthetic'})}},system:{settings:{get:()=> 'truthful',onChange:()=>()=>{}}},hooks:{on:(event,fn)=>{hooks[event]=fn;return()=>{delete hooks[event]}}}};
 const bridgeCode=window.auditBridge.replace('export default','return').replace('function updateRoom(room, state, session) {','function updateRoom(room, state, session) { const auditStart=performance.now();').replace('\n    }\n    function relevantMutation','\n      window.auditRoomTimes.push(performance.now()-auditStart);\n    }\n    function relevantMutation');
 const timedBridge=bridgeCode.replace('function refresh() {','function refresh() { const refreshStart=performance.now();').replace('} finally { if(!disposed)', '} finally { window.auditRefreshTimes.push(performance.now()-refreshStart); if(!disposed)');
 const plugin=new Function(timedBridge)();
 const row=m=>'<div class="chat-msg-wrapper" id="message-'+m.id+'" data-role="'+m.role+'"><div class="chat-msg-content-wrap"><div class="chat-bubble-role-'+m.role+'" data-msg-id="'+m.id+'"><span class="message-text">'+m.content+'</span></div></div></div>';
 const setup=(M,S,V,skew=false)=>{
 const d=fixture(M,S,0,skew);core.__audit.setData(d);
 document.head.innerHTML='<style>.chat-room-wrapper{--im-theme:1}.page-body{height:500px;overflow:auto}.chat-bubble-role-user,.chat-bubble-role-assistant{width:240px;min-height:30px;padding:8px;position:relative}.im-text-outline{position:absolute;left:0;top:0;pointer-events:none}.im-text-outline path{fill:none}</style>';
 const msgs=core.loadChatMessages('s0').slice(-V);
 document.body.innerHTML='<div class="chat-room-wrapper session-s0"><header class="page-header chat-room-main-pane"><div class="page-header-content"><div class="page-title">Synthetic</div><div class="page-header-right"><button aria-label="更多">more</button></div></div></header><div class="page-body chat-room-main-pane">'+msgs.map(row).join('')+'</div><div class="chat-input-bar"><textarea></textarea></div></div>';
 return d;
 };
 const reset=()=>{counters={sessions:0,lists:0,sessionMs:0,listMs:0};window.auditRoomTimes=[];window.auditRefreshTimes=[];};
 const result=[];
 for(const [M,S,V,skew] of [[5000,50,50,false],[10000,50,50,false],[25000,50,50,false],[50000,50,50,false],[50000,200,50,false],[50000,50,500,true]]){
 setup(M,S,V,skew);const clean=plugin.setup(ctx);await wait();reset();
 for(let i=0;i<3;i++){hooks['message.updated']({});await wait();}
 result.push({M,S,V,skew,...counters,roomMs:window.auditRoomTimes.map(v=>+v.toFixed(2)),refreshMs:window.auditRefreshTimes.map(v=>+v.toFixed(2))});
 clean();
 }
 setup(50000,50,50);const clean=plugin.setup(ctx);await wait();
 const cases=[];
 const test=async(name,fn)=>{reset();await fn();await wait();cases.push({name,...counters,roomMs:window.auditRoomTimes.map(v=>+v.toFixed(2)),refreshMs:window.auditRefreshTimes.map(v=>+v.toFixed(2))});};
 const text=document.querySelector('.message-text').firstChild,pane=document.querySelector('.page-body');
 await test('idle',async()=>{});
 await test('100 characterData writes in one task',async()=>{for(let i=0;i<100;i++)text.data='update '+i;});
 await test('12 characterData writes across frames',async()=>{for(let i=0;i<12;i++){text.data='frame '+i;await wait();}});
 await test('20 scroll changes',async()=>{for(let i=0;i<20;i++){pane.scrollTop=i*30;pane.dispatchEvent(new Event('scroll'));await new Promise(r=>requestAnimationFrame(r));}});
 await test('input event',async()=>{const ta=document.querySelector('textarea');ta.value='typing';ta.dispatchEvent(new Event('input',{bubbles:true}));});
 await test('one new message plus persisted hook same task',async()=>{const msg=core.pushChatMessage({sessionId:'s0',role:'user',content:'New synthetic message'});pane.insertAdjacentHTML('beforeend',row(msg));hooks['message.persisted']({message:msg});});
 await test('persisted hook then DOM in a later frame',async()=>{const msg=core.pushChatMessage({sessionId:'s0',role:'user',content:'New synthetic message 2'});hooks['message.persisted']({message:msg});await wait();pane.insertAdjacentHTML('beforeend',row(msg));});

 clean();
 setup(50000,50,50);
 const original=document.querySelector('.chat-room-wrapper');
 for(let i=1;i<5;i++){const layer=document.createElement('div');layer.style.display='none';const clone=original.cloneNode(true);clone.className='chat-room-wrapper session-s'+i;clone.querySelector('.page-body').innerHTML=core.loadChatMessages('s'+i).slice(-50).map(row).join('');layer.append(clone);document.body.append(layer);}
 const cleanup=plugin.setup(ctx);await wait();
 await test('text update with 1 visible + 4 hidden rooms',async()=>{document.querySelector('.message-text').firstChild.data='changed';});
 cleanup();return {result,cases};

 });
 const output={storage:result,bridge:dom};const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6);if(out)fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));

 await browser.close();
 }catch(e){await browser.close();throw e;}
})().catch(e=>{console.error(e);process.exitCode=1});
