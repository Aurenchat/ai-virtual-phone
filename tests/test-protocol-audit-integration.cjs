'use strict';
// Synthetic-only: execute current truncation, prompt assembly, adapter and audit functions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const repo = path.resolve(__dirname, '..');
const compile = source => ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
function bind(file, names, ctx) {
  const source=fs.readFileSync(path.join(repo,file),'utf8'), ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
  const nodes=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text));
  assert.equal(nodes.length,names.length,`actual source functions: ${file}`);
  vm.runInContext(compile(nodes.map(n=>n.getText(ast)).join('\n')),ctx);
}
function createFixture() {
  const config={id:'api',provider:'Google',apiKey:'PRIVATE_KEY',defaultModel:'gemini-fixture',enableNativeTools:true};
  const session={id:'PRIVATE_SESSION',contactId:'character',updatedAt:'2026-10-15',isGroup:false};
  const character={id:'character',name:'Krueger synthetic',persona:'PRIVATE_PERSONA'};
  const preset={id:'preset',prompts:[{identifier:'chatHistory',marker:true,enabled:true}],prompt_order:[],enabled_generation_parameters:[]};
  let budget=50000, requests=0, writes=0;
  const forbidden=()=>{writes++;throw Error('Unexpected persistent write or generation call');};
  const budgets=()=>({shortTermTokenBudget:budget,longTermTokenBudget:budget,coreMemoryTokenBudget:budget,shortTermAllowedSources:[]});
  const modules=new Map();
  const stubs={loadChatAppSettings:()=>({timeAware:false}),loadCharacters:()=>[character],
    formatCharacterRelationsForPrompt:()=>'',readDwellingLayoutCache:()=>null,formatDwellingContext:()=>'',
    pushApiLog:forbidden,protectProviderBody:forbidden,CONTENT_APP_LABELS:{},CHECKPHONE_TAG_PROFILES:[],
    matchesActiveTags:()=>true,formatXiaohongshuShareForPrompt:()=>'',getXiaohongshuShareReadableContent:()=>'',
    isSystemInstructionMessage:()=>false,isReadingDiscussMessage:()=>false,loadMemoryConfig:budgets};
  const real=new Set(['llm-provider-adapter','api-helpers','generation-parameters','token-counter','reading-quote',
    'llm-prompt-assembler','macro-engine','character-time','prompt-time','prompt-sanitizer','state-value-parser','chat-protocol-audit']);
  function load(name) {
    const key=path.basename(name); if(modules.has(key))return modules.get(key);
    if(!real.has(key))return new Proxy(stubs,{get:(o,k)=>k in o?o[k]:(..._args)=>{throw Error(`Unmocked fixture dependency ${key}.${String(k)}`);}});
    const exp={};modules.set(key,exp);
    vm.runInNewContext(compile(fs.readFileSync(path.join(repo,'lib',key+'.ts'),'utf8')),
      {exports:exp,require:load,console,Date,Intl,Map,Set,URL,Error,Math,AbortController,DOMException});return exp;
  }
  const adapter=load('./llm-provider-adapter'), assembler=load('./llm-prompt-assembler'), audit=load('./chat-protocol-audit');
  const runs=[];
  const ctx=vm.createContext({exports:{},console,Date,Map,Set,Error,Math,AbortController,DOMException,
    markGenerationDiagnostic:(runId)=>assert.equal(runId,undefined),
    ...load('./token-counter'),...load('./reading-quote'),...load('./prompt-time'),...adapter,...audit,
    loadMemoryConfig:budgets,loadNativeTimeline:()=>[],loadCharacters:()=>[character],isReadingDiscussMessage:()=>false,
    loadBindingConfig:()=>({}),resolveBinding:()=>({apiConfigId:'api',presetId:'preset'}),loadApiConfigs:()=>[config],
    loadPresets:()=>[preset],loadWorldBooks:()=>[],loadRegexes:()=>[],resolveUserIdentity:()=>({name:'Fixture user'}),
    mergeAppTags:tags=>tags,buildCharacterTimeContext:load('./character-time').buildCharacterTimeContext,
    getEnabledTools:()=>[{name:'Fixture action'}],presetIncludesToolsMacro:()=>true,readMemoryRevisions:async()=>({}),
    applyVisionImagePromptLimit:x=>x,retrieveMemoriesForPrompt:async()=>[{content:'PRIVATE_LONG_MEMORY'}],
    retrieveCoreMemoriesForPrompt:async()=>[{content:'PRIVATE_CORE_MEMORY'}],
    formatLongTermMemories:()=> 'PRIVATE_LONG_MEMORY',formatCoreMemories:()=> 'PRIVATE_CORE_MEMORY',
    buildMusicLocalMacro:async()=>'',buildMusicCloudMacro:async()=>'',buildCalendarScheduleMarker:()=>'',
    getWeekStartIso:()=>'',getCurrentCalendarScheduleForPrompt:()=>'',isNeteaseConfigured:()=>false,
    runChatPluginTransform:async(_hook,value)=>value,buildChatPluginPromptFragments:()=>'',
    formatCustomAppChatDirectivesForPrompt:()=>'',buildScreenEffectPromptHint:()=>'',formatToolsForPrompt:()=>'',
    buildChatBilingualInstruction:()=>'',buildOfflineBilingualInstruction:()=>'',getStatusRegionConfig:()=>({}),
    getLatestCharacterStateValues:()=>[],getCustomStickerNames:()=>'',getCustomStickerExample:()=>'',
    loadChatAppSettings:()=>({timeAware:false}),SHOPPING_SHARE_PURCHASE_TOOL_NAME:'purchase',
    resolveStatusRegionSection:()=>'',resolveStatusRegionExampleLine:()=>'',resolveStatusRegionComposition:()=>'',resolveStatusRegionFullExample:()=>'',
    assemblePromptPayload:input=>assembler.assemblePromptPayload({...input,isolatedContext:true}),
    appendEmptyGenerateGuardMessage:()=>{},loadChatSessions:()=>[session],
    normalizeNativeExpandedToolSourceIds:x=>x||[],buildNativeChatTools:()=>({definitions:[{name:'fixture_action',description:'Fixture',parameters:{type:'object',properties:{}}}]}),
    readGenerationDiagnostics:()=>({runs}),ChatEngineError:class ChatEngineError extends Error {},
    saveChatSessions:forbidden,pushChatMessage:forbidden,incrementEventCounter:forbidden,maybeRunSummarization:forbidden,
    publishDebugPromptSnapshot:forbidden,fetch:()=>{requests++;throw Error('Generation network forbidden');}
  });
  const shortSource=fs.readFileSync(path.join(repo,'lib/short-term-assembler.ts'),'utf8');
  const shortAst=ts.createSourceFile('short.ts',shortSource,ts.ScriptTarget.Latest,true);
  vm.runInContext(compile(shortAst.statements.filter(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>['FEATURE_ORDER','FEATURE_TAG'].includes(d.name.getText(shortAst)))).map(n=>n.getText(shortAst)).join('\n')),ctx);
  bind('lib/short-term-assembler.ts',['isPromptHiddenChatMessage','getFeatureTag','buildCoReadingBoundaryEntries','filterTimelineByAllowedSources','prepareShortTermContext'],ctx);
  bind('lib/chat-engine.ts',['buildChatPromptMessages','auditChatPromptRequest'],ctx);
  return {ctx,session,config,runs,adapter,audit,setBudget:n=>budget=n,
    counters:()=>({writes,requests})};
}
function message(i, role, content, extra={}) {
  return {id:'PRIVATE_MSG_'+i,sessionId:'PRIVATE_SESSION',role,content,status:'sent',createdAt:new Date(1760486400000+i*1000).toISOString(),...extra};
}
async function run() {
  const f=createFixture(), {ctx,session,config,adapter,audit}=f;
  const history=[];
  // ~460k characters. The 50k boundary falls exactly between one native call/result.
  for(let i=0;i<460;i++) history.push(message(i,i%2?'assistant':'user','私'.repeat(1000)));
  const cost=ctx.estimateTokens('私'.repeat(1000))+4;
  const resultContent='R'.repeat((50000-73*cost-4)*4);
  const toolIndex=history.length-73;
  history.splice(toolIndex,0,message(toolIndex-.2,'assistant','PRIVATE_CALL',{mediaType:'tool_call',nativeToolCalls:[{id:'PRIVATE_CALL_ID',name:'fixture_action',args:{secret:'PRIVATE_ARGS'}}]}),
    message(toolIndex-.1,'tool',resultContent,{mediaType:'tool_result',nativeToolResult:{toolCallId:'PRIVATE_CALL_ID',name:'fixture_action',content:resultContent}}));
  // Preserve chronology despite inserting two turns.
  history.forEach((m,i)=>m.createdAt=new Date(1760486400000+i*1000).toISOString());
  const before=JSON.stringify(history), reports={}, summary=[];
  for(const budget of [50000,100000]) {
    f.setBudget(budget);
    const short=ctx.prepareShortTermContext('character','chat',{history,includeNativeToolHistory:true,timeAware:false});
    const retained=short.truncatedHistory;
    const call=retained.some(m=>m.nativeToolCalls?.length), result=retained.some(m=>m.nativeToolResult);
    assert(result);assert.equal(call,budget===100000,'boundary retains call only at 100k');
    const built=await ctx.buildChatPromptMessages(session,history,{appTags:['chat','text']});
    const raw=adapter.toLlmRequestMessages(built.llmMessages);
    // The existing assembler suppresses a result when its call was truncated.
    assert.equal(raw.some(m=>m.role==='tool'),budget===100000);
    for(const native of [true,false]) {
      config.provider=native?'Google':'Custom';
      config.baseUrl=native?'':'https://gemini-openai-relay.invalid/v1';
      const report=await ctx.auditChatPromptRequest(session,history);
      assert.equal(report.providerKind,native?'gemini':'openai-compatible');
      assert.equal(report.wireFunctionCalls,budget===100000?1:0);
      assert.equal(report.wireFunctionResponses,budget===100000?1:0);
      assert.equal(report.findings.some(x=>x.code==='GEMINI_TOOL_ROLE'),native&&budget===100000);
      assert(!report.findings.some(x=>x.code==='OPENAI_UNANSWERED_CALLS'||x.code==='OPENAI_ORPHAN_RESULT'));
      const text=audit.formatChatProtocolAudit(report);
      for(const secret of ['PRIVATE_SESSION','PRIVATE_KEY','PRIVATE_ARGS','PRIVATE_CALL_ID','PRIVATE_LONG_MEMORY','PRIVATE_CORE_MEMORY','私私私'])assert(!text.includes(secret));
      assert(text.length<6000); reports[`${budget}-${native?'native':'relay'}`]=report;
      summary.push({budget,path:native?'native Gemini':'Gemini OpenAI relay',retained:retained.length,callRetained:call,resultRetained:result,assembled:report.assembledMessageCount,wireCalls:report.wireFunctionCalls,wireResponses:report.wireFunctionResponses,codes:report.findings.map(x=>x.code),reportChars:text.length});
    }
  }
  assert.equal(JSON.stringify(history),before,'history immutable');
  assert.deepEqual(f.counters(),{writes:0,requests:0},'diagnosis never writes/generates');
  await assert.rejects(()=>ctx.auditChatPromptRequest({...session,isGroup:true},history),/单聊/);
  // Exercise adapter normalization with malformed ordering and pairing, not hand-built wire payloads.
  const anomalies=[
    ['gap',[{role:'user',content:'u'},{role:'assistant',content:'',toolCalls:[{id:'c',name:'f',args:{}}]},{role:'user',content:'interloper'},{role:'tool',name:'f',toolCallId:'c',content:'result'}],'BROKEN_ADJACENCY'],
    ['missing',[{role:'user',content:'u'},{role:'assistant',content:'',toolCalls:[{id:'c',name:'f',args:{}}]}],'MISSING_RESULT'],
    ['orphan',[{role:'user',content:'u'},{role:'tool',name:'f',toolCallId:'c',content:'result'}],'ORPHAN_RESULT'],
  ];
  config.provider='Custom';config.baseUrl='https://gemini-openai-relay.invalid/v1';
  for(const [label,raw,expected] of anomalies) {
    const request=adapter.buildProviderRequest(config,null,raw,{tools:[{name:'f',parameters:{type:'object'},description:'Fixture'}]});
    const report=audit.analyzeChatProtocol({request,assembledMessages:raw,history:[]});
    assert(report.findings.some(x=>x.code===expected),label);
    assert(!report.findings.some(x=>x.stage==='wire'&&x.severity==='error'),'existing adapter normalizes '+label);
    console.log('PASS real adapter ordering/pair repair: '+label);
  }
  const scenarios=[
    ['same batch bubbles',[message(0,'user','PRIVATE'),message(1,'assistant','PRIVATE',{responseBatchId:'A'}),message(2,'assistant','PRIVATE',{responseBatchId:'A'})],false,false,false],
    ['independent batches',[message(0,'user','PRIVATE'),message(1,'assistant','PRIVATE',{responseBatchId:'A'}),message(2,'assistant','PRIVATE',{responseBatchId:'B'})],true,false,false],
    ['normal followup',[message(0,'user','PRIVATE'),message(1,'assistant','PRIVATE',{responseBatchId:'A'}),message(2,'assistant','PRIVATE',{responseBatchId:'B',followUpIndex:1})],false,true,false],
    ['tool continuation',[message(0,'user','PRIVATE'),message(1,'assistant','PRIVATE',{nativeToolCalls:[{id:'c',name:'f',args:{}}]}),message(2,'tool','PRIVATE',{mediaType:'tool_result',nativeToolResult:{toolCallId:'c',name:'f',content:'PRIVATE'}}),message(3,'assistant','PRIVATE',{responseBatchId:'A',responseRoundId:'round1'}),message(4,'assistant','PRIVATE',{responseBatchId:'B',responseRoundId:'round2'})],false,false,true],
  ];
  for(const [label,h,multiple,followup,tool] of scenarios) {
    const report=audit.analyzeChatProtocol({request:{providerKind:'openai-compatible',body:{messages:[]}},assembledMessages:[],history:h,
      recentRuns:[{sessionId:session.id,source:'chatroom',startedAt:1000,lastStage:'GEN_FINALLY',providerRequestCount:2,publishedCount:2},{sessionId:session.id,source:'background',startedAt:2000,lastStage:'PUBLISH_DONE',providerRequestCount:1,publishedCount:1},{sessionId:'other',source:'background',startedAt:3000,lastStage:'GEN_FINALLY'}]});
    assert.equal(report.findings.some(x=>x.code==='MULTIPLE_BATCHES_SINCE_USER'),multiple,label);
    const burst=report.recentReplyBursts.at(-1);assert.equal(burst.containsFollowUp,followup,label);assert.equal(burst.containsNativeToolTurns,tool,label);
    assert.equal(report.recentRuns.length,2);assert.equal(report.recentRuns[0].source,'background');assert.equal(report.recentRuns[1].requests,2);
    assert(!JSON.stringify(report).includes('PRIVATE'));console.log('PASS reply provenance: '+label);
  }
  console.log(JSON.stringify({synthetic:true,characters:history.reduce((n,m)=>n+m.content.length,0),summary,counters:f.counters()},null,2));
  console.log('PASS real truncator + prompt assembler + adapters + audit: 50k/100k, both provider routes, immutable inputs');
  return reports;
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run,createFixture,message};
