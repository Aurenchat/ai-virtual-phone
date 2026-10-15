'use strict';
// Actual four senders + central fetch + failure ring, synthetic transport/storage only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),json=x=>JSON.parse(JSON.stringify(x));
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
function source(file,old){return old?cp.execFileSync('git',['show','b456575:'+file],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,file),'utf8');}
function bind(file,names,ctx,old){const src=source(file,old),ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true);const nodes=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text));assert.equal(nodes.length,names.length,file);vm.runInContext(compile(nodes.map(n=>n.getText(ast)).join('\n')),ctx);}
function fixture({old=false,mode='ok',proxy=false,protectedPolicy=false,storageDisabled=false,budget=50000}={}){
 const store=new Map(),writes=[],network=[],deltas=[],toolStarts=[];let bodyReads=0;
 const user={role:'user',content:'PRIVATE_PROMPT_'+ '私'.repeat(budget)},plain={role:'assistant',content:'PRIVATE_VISIBLE'},call={role:'assistant',content:'',toolCalls:[{id:'PRIVATE_CALL_ID',name:'PRIVATE_TOOL',args:{secret:'PRIVATE_ARGS'}}]},tool={role:'tool',name:'PRIVATE_TOOL',toolCallId:'PRIVATE_CALL_ID',content:'PRIVATE_RESULT'};
 const raw=[user,plain,call,tool];
 const wire=[user,plain,{role:'assistant',tool_calls:[{id:'PRIVATE_CALL_ID',type:'function',function:{name:'PRIVATE_TOOL',arguments:'{"secret":"PRIVATE_ARGS"}'}}]},{role:'tool',tool_call_id:'PRIVATE_CALL_ID',content:'PRIVATE_RESULT'}];
 const req={providerKind:'openai-compatible',url:'https://PRIVATE_URL.invalid/v1/chat/completions',headers:{Authorization:'Bearer PRIVATE_KEY'},body:{model:'fixture',messages:wire},messagesForLog:raw,serverProxy:proxy};
 const captureExports={};
 const win={localStorage:{getItem:k=>{if(storageDisabled)throw Error('denied');return store.get(k)||null;},setItem:(k,v)=>{if(storageDisabled)throw Error('quota');writes.push({k,v});store.set(k,v);}}};
 vm.runInNewContext(compile(fs.readFileSync(path.join(root,'lib/chat-request-failure-diagnostics.ts'),'utf8')),{exports:captureExports,window:win,Date});
 const err=mode==='abort'?new DOMException('PRIVATE_ABORT','AbortError'):new TypeError('PRIVATE_LOAD_FAILED');
 const result={content:'Fixture answer',reasoning:'',toolCalls:[],raw:{}};
 const toolDelta={content:'Fixture answer',reasoning:'',toolCallDeltas:[{index:0,id:'fixture-tool-id',name:'fixture-action',argsText:'{}'}]};
 const response={ok:!/^http/.test(mode),status:mode==='http400'?400:mode==='http503'?503:200,
 text:async()=>{bodyReads++;return 'PRIVATE_ERROR_RESPONSE';},json:async()=>{bodyReads++;if(mode==='json')throw err;return result;},
 body:{getReader(){let read=0;return {async read(){if(mode==='stream'&&read===1)throw err;if(read++===0)return {done:false,value:new TextEncoder().encode('data: '+JSON.stringify(toolDelta)+'\n\n')};return {done:true};}};}}};
 let sentBody;
 const ctx=vm.createContext({exports:{},Date,Math,Map,Set,Error,TypeError,DOMException,AbortController,TextDecoder,TextEncoder,
 console:{log:()=>{},warn:()=>{},error:()=>{}},setTimeout:()=>1,clearTimeout:()=>{},...captureExports,
 markGenerationDiagnostic:()=>{},protectProviderBody:async body=>{if(mode==='prepare')throw err;sentBody=protectedPolicy?{...body,messages:[{role:'system',content:'PRIVATE_PROTECTED_POLICY'},...body.messages]}:body;return sentBody;},
 fetch:async(url,options)=>{network.push({url,headers:options.headers,body:options.body,signalAborted:options.signal?.aborted});if(mode==='fetch'||mode==='abort')throw err;return response;},
 applyChatPluginLlmRequest:async(preset,messages)=>({preset,messages}),applyChatPluginLlmResponse:async x=>x,
 toLlmRequestMessages:x=>x,buildProviderRequest:()=>req,publishDebugPromptSnapshot:()=>{},pushApiLog:()=>{},
 parseProviderResponse:(_kind,x)=>x,parseProviderStreamDelta:(_kind,x)=>x,
 stripHallucinatedTimestamps:x=>x,emitChatPluginEvent:()=>{},MacroEngine:class{},getActiveAppTags:()=>[],applyOutputRegex:x=>x,apiLogChannelFor:()=>({}),emptyResponseDetails:()=>({message:'Empty'}),
 });
 vm.runInContext('class ChatEngineError extends Error {}',ctx);
 const sse={};vm.runInNewContext(compile(fs.readFileSync(path.join(root,'lib/sse-json.ts'),'utf8')),{exports:sse});ctx.createSseJsonParser=sse.createSseJsonParser;
 bind('lib/llm-http.ts',['fetchLlmPayload'],ctx,old);
 bind('lib/chat-engine.ts',['attachExternalAbort','parseSseEvents','createStreamingTimestampStripper','readSseStream','mergeToolCallDelta','finalizeStreamToolCalls','sendLLMRequest','sendLLMStreamRequest','sendLLMToolRequest','sendLLMToolStreamRequest'],ctx,old);
 const external=new AbortController();if(mode==='abort')external.abort();
 async function run(sender){const config={provider:'Custom',defaultModel:'fixture'},options={debugSessionId:'PRIVATE_SESSION',signal:external.signal,skipOutputRegex:true};
  const cb={onDelta:text=>{if(mode==='callback')throw err;deltas.push(text);},onToolCallStart:c=>toolStarts.push(c)};
  try{const value=sender==='sendLLMRequest'?await ctx[sender](config,null,raw,[],{},options):sender==='sendLLMStreamRequest'?await ctx[sender](config,null,raw,[],{},options,cb):sender==='sendLLMToolRequest'?await ctx[sender](config,null,raw,[],[],{},options):await ctx[sender](config,null,raw,[],[],{},options,cb);return {ok:true,value:json(value)};}catch(error){return {ok:false,name:error.name,message:error.message};}}
 return {ctx,run,store,writes,network,deltas,toolStarts,req,records:()=>captureExports.readFailedProviderRequests('PRIVATE_SESSION'),report:()=>captureExports.formatFailedProviderRequestReport('PRIVATE_SESSION'),bodyReads:()=>bodyReads,sentBody:()=>sentBody};
}
async function main(){let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
 const senders=['sendLLMRequest','sendLLMStreamRequest','sendLLMToolRequest','sendLLMToolStreamRequest'];
 for(const sender of senders){const stream=sender.includes('Stream');
  for(const proxy of [false,true])for(const budget of [50000,100000])for(const mode of ['ok','http400','http503','fetch','prepare','abort',stream?'stream':'json']){
   const now=fixture({mode,proxy,budget}),old=fixture({old:true,mode,proxy,budget});
   const [a,b]=await Promise.all([now.run(sender),old.run(sender)]);
   assert.deepEqual(a,b,`${sender}/${mode} result/errors unchanged`);assert.deepEqual(json(now.network),json(old.network),'exact request and proxy envelope unchanged');assert.deepEqual(now.deltas,old.deltas,'stream output unchanged');assert.deepEqual(json(now.toolStarts),json(old.toolStarts),'native calls unchanged');assert.equal(now.bodyReads(),old.bodyReads(),'diagnostic never consumes response');
   const records=now.records();if(mode==='ok'){assert.equal(records.length,0);assert.equal(now.writes.length,0);}else{assert.equal(records.length,1,`${sender}/${mode}`);const r=records[0];assert.equal(r.phase,/^http/.test(mode)?'http_status':mode==='prepare'?'payload_prepare':mode==='stream'?'stream_read':mode==='json'?'response_json':'fetch');assert.equal(r.streaming,stream);if(/^http/.test(mode))assert.equal(r.httpStatus,Number(mode.slice(4)));if(mode==='abort')assert.equal(r.kind,'abort');if(mode==='fetch')assert.equal(r.kind,'network');assert(r.anomalies.some(x=>x.code==='CALL_AFTER_ASSISTANT'));for(const forbidden of ['PRIVATE_PROMPT','PRIVATE_VISIBLE','PRIVATE_RESULT','PRIVATE_TOOL','PRIVATE_ARGS','PRIVATE_CALL_ID','PRIVATE_URL','PRIVATE_KEY','PRIVATE_ERROR_RESPONSE','PRIVATE_LOAD_FAILED','PRIVATE_PROTECTED_POLICY'])assert(!JSON.stringify([...now.store.values()]).includes(forbidden),forbidden);assert(!now.report().includes('PRIVATE_SESSION'));}
   checks++;
  }
  console.log('PASS '+sender+': success/errors/abort, direct+proxy, 50k+100k, exact pre-patch behavior');
 }
 const disabled=fixture({mode:'http400',storageDisabled:true});const disabledResult=await disabled.run('sendLLMRequest'),oldError=await fixture({old:true,mode:'http400'}).run('sendLLMRequest');check('storage failure cannot change HTTP error',()=>{assert.deepEqual(disabledResult,oldError);assert.equal(disabled.writes.length,0);});
 // Additional correctness checks for the actual sent structure and true read failures.
 const protectedFailure=fixture({mode:'http400',protectedPolicy:true});await protectedFailure.run('sendLLMRequest');
 check('failure structure matches final protected body',()=>assert.equal(protectedFailure.records()[0].messageCount,protectedFailure.sentBody().messages.length));
 for(const sender of senders)for(const proxy of [false,true])for(const mode of ['http400',sender.includes('Stream')?'stream':'json']) {
  const f=fixture({mode,proxy,protectedPolicy:true});await f.run(sender);const r=f.records()[0];
  check(sender+'/'+mode+': failure indexes include protected system turn',()=>{assert.equal(r.messageCount,5);assert.equal(r.anomalies.find(a=>a.code==='CALL_AFTER_ASSISTANT').index,3);});
 }
 const callbackFailure=fixture({mode:'callback'});await callbackFailure.run('sendLLMStreamRequest');
 check('callback error is not mislabeled as provider stream read failure',()=>assert.equal(callbackFailure.records().length,0));
 console.log(JSON.stringify({checks,scope:'synthetic transport; real current senders/fetch/read sites vs b456575; no user storage or remote model'}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={fixture};
