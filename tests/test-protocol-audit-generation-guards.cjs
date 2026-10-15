'use strict';
// Current production guards, extracted without mounting ChatRoom or accessing user storage.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function bind(file,names,ctx){const source=fs.readFileSync(path.join(root,file),'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const nodes=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text));assert.equal(nodes.length,names.length);vm.runInContext(ts.transpileModule(nodes.map(n=>n.getText(ast)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,ctx);}
async function run(){
 const records=new Map(),diagnostics={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'lib/chat-generation-diagnostics.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,{exports:diagnostics,localStorage:{getItem:k=>records.get(k)||null,setItem:(k,v)=>records.set(k,v)},Date,Math});
 diagnostics.startGenerationDiagnostic('front','PRIVATE_SESSION',false,'chatroom');
 diagnostics.startGenerationDiagnostic('back','PRIVATE_SESSION',false,'background');
 for(const id of ['front','back']) {diagnostics.markGenerationDiagnostic(id,'PROVIDER_REQUEST_BEGIN');diagnostics.markGenerationDiagnostic(id,'PUBLISH_DONE',{},0,1);}
 diagnostics.markGenerationDiagnostic('front','PROVIDER_REQUEST_BEGIN');
 const audit=require('./test-protocol-audit-integration.cjs').createFixture().audit;
 const report=audit.analyzeChatProtocol({request:{providerKind:'openai-compatible',body:{messages:[]}},assembledMessages:[],history:[{sessionId:'PRIVATE_SESSION',role:'user',content:'PRIVATE_BODY'}],recentRuns:diagnostics.readGenerationDiagnostics().runs});
 assert.equal(report.recentRuns.length,2);assert.equal(report.recentRuns.find(r=>r.source==='chatroom').requests,2);assert.equal(report.recentRuns.find(r=>r.source==='background').requests,1);assert(!JSON.stringify(report).includes('PRIVATE'));
 console.log('PASS generation diagnostics: actual concurrent front/background sidecar slots retain request counts and redact IDs');
 const rows=new Map(),ctx=vm.createContext({exports:{},Date,Math,AbortController,console,activeGenerationRuns:new Map(),GENERATING_PREFIX:'chat-generating:',GENERATING_LOCK_TTL_MS:300000,kvGet:k=>rows.get(k),kvSet:(k,v)=>rows.set(k,v),kvRemove:k=>rows.delete(k),startGenerationDiagnostic:()=>{}});
 bind('components/chat/chat-room.tsx',['generationLockKey','setGenerationLock','clearGenerationLock','hasActiveGenerationLock','createGenerationRun','isGenerationRunActive','finishGenerationRun'],ctx);
 const first=ctx.createGenerationRun('s',false),second=ctx.createGenerationRun('s',false);
 assert(first.controller.signal.aborted);assert(!ctx.isGenerationRunActive('s',first.runId));assert(ctx.isGenerationRunActive('s',second.runId));assert(!ctx.finishGenerationRun('s',first.runId));assert(ctx.finishGenerationRun('s',second.runId));
 ctx.setGenerationLock('s');assert(ctx.hasActiveGenerationLock('s'));rows.set('chat-generating:s',JSON.stringify({startedAt:Date.now()-300001}));assert(!ctx.hasActiveGenerationLock('s'));assert(!rows.has('chat-generating:s'));
 console.log('PASS generation guards: replacement aborts old foreground run; stale cleanup cannot remove new run; locks expire');
 let complete,calls=0,published=0,scheduled=0;
 const bg=vm.createContext({exports:{},console,Date,Math,Set,backgroundReplyFiringSet:new Set(),backgroundGeneratingSessions:new Set(),cancelledBackgroundSessions:new Set(),
 loadChatSessions:()=>[{id:'s'}],loadChatMessages:()=>[],startBackgroundDiagnostic:()=> 'fixture-run',markGenerationDiagnostic:()=>{},
 window:{dispatchEvent:()=>{}},CustomEvent:class{constructor(type,detail){this.type=type;this.detail=detail;}},
 generateBackgroundCompletionRounds:()=>{calls++;return new Promise(r=>complete=r);},isBackgroundGenerationCancelled:()=>false,
 saveBackgroundCompletionRounds:async()=>{published++;return {hasVisible:true,stateValues:[]};},scheduleFollowUp:()=>scheduled++,pushChatMessage:()=>{throw Error('Unexpected error reply');}});
 bind('lib/follow-up-service.ts',['requestBackgroundChatReply'],bg);
 const pending=bg.requestBackgroundChatReply('s');assert.equal((await bg.requestBackgroundChatReply('s')).skipped,'already_running');assert.equal(calls,1);complete([]);assert((await pending).ok);assert.equal(published,1);assert.equal(scheduled,1);assert(!bg.backgroundReplyFiringSet.size);const next=bg.requestBackgroundChatReply('s');complete([]);assert((await next).ok);assert.equal(calls,2);
 console.log('PASS generation guards: duplicate background trigger skipped; completion releases guard; later normal generation preserved');
 let followups=0;
 const polls=vm.createContext({exports:{},console:{log:()=>{},error:()=>{}},Date,firingSet:new Set(),loadAllFollowUpSchedules:()=>[{sessionId:'s',fireAt:0,count:0}],fireFollowUp:s=>{followups++;polls.firingSet.add(s.sessionId);},pollTimedWakeSchedules:()=>{},pollMenstrualPeriodCare:()=>{},pollIdleReconnect:()=>{}});
 bind('lib/follow-up-service.ts',['pollSchedules'],polls);polls.pollSchedules();polls.pollSchedules();assert.equal(followups,1);polls.firingSet.delete('s');polls.pollSchedules();assert.equal(followups,2);
 console.log('PASS generation guards: polling suppresses in-flight scheduled followup and permits later followup');
 // These are separate guard domains: a background request does not consume the foreground run map.
 // Record their ability to overlap; do not change production policy or claim this reproduces Krueger.
 ctx.createGenerationRun('s',false);const mixed=bg.requestBackgroundChatReply('s');assert.equal(calls,3);assert(ctx.activeGenerationRuns.has('s'));complete([]);assert((await mixed).ok);
 console.log('PASS characterization: foreground/background guards are separate; simulated overlap is observable, not proof of the reported incident');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
