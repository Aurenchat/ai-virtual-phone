'use strict';
// Offline execution of real bridge, native reaction/memory, and chat generation functions.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),plain=x=>JSON.parse(JSON.stringify(x)),text=p=>fs.readFileSync(path.join(root,p),'utf8');
function transpile(code){return ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;}
function fn(file,name){
 const ast=ts.createSourceFile(file,text(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);let match;
 function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)match=n;ts.forEachChild(n,visit);}visit(ast);assert(match,name);return match.getText(ast).replace(/^export\s+/,'');
}
function mod(file,mocks){const m={exports:{}};new Function('module','exports','require',transpile(text('lib/'+file+'.ts')))(m,m.exports,id=>{assert(Object.hasOwn(mocks,id),'Unmocked boundary '+id);return mocks[id];});return m.exports;}
let state,chat,durable,store,uid=0,events,counters,summaries,notifications,reads,maxReads,loading,failCommit;
global.window={dispatchEvent(){notifications++;}};global.CustomEvent=class {constructor(type,options){this.type=type;this.detail=options?.detail;}};
const c=(id,type,parent)=>({id,noteId:'note',authorType:type,authorId:type==='character'?'other-role':id,authorName:id,text:'text:'+id,replyToCommentId:parent,createdAt:'yesterday',likeCount:2,dislikeCount:1,liked:true,disliked:false,unread:true});
function note(source='user'){return {id:'note',source,authorId:'poster',authorName:'Poster',type:'post',title:'Original title',body:'Real full post text',tags:['real-tag'],createdAt:'yesterday',updatedAt:'yesterday',likeCount:4,saveCount:3,commentCount:3,liked:true,saved:true,recentLikeNames:[],recentSaveNames:[],imageAssetIds:Array.from({length:9},(_,i)=>'image'+i),comments:[c('a','npc'),c('b','user','a'),c('c','character','b')]};}
const session={id:'session',contactId:'role'},role={id:'role',name:'Role'};
const share={id:'share',sessionId:'session',role:'user',mediaType:'xiaohongshu_note_share',mediaData:{xiaohongshuNoteId:'note'},content:'short card'};
const response={id:'assistant',sessionId:'session',role:'assistant',content:'Normal saved reply'};
const kv={
 registerDynamicPrefix(){},kvGet:k=>store.get(k)||null,kvSet:(k,v)=>{store.set(k,v);events.push(k);},
 kvUpdateAtomic:async(k,update)=>{const result=update(JSON.stringify(state));if(failCommit)throw Error('quota');state=JSON.parse(result.value);return result.result;}
};
const storage={
 loadXiaohongshuState:()=>state,
 makeXiaohongshuComment:input=>({...input,id:'comment-'+(++uid),createdAt:new Date().toISOString(),likeCount:0,dislikeCount:0,liked:false,disliked:false}),
 makeXiaohongshuNotification:input=>({...input,id:'notice-'+(++uid),createdAt:new Date().toISOString()})
};
const vision=mod('xiaohongshu-vision',{});
const bridge=mod('xiaohongshu-chat-share',{'./xiaohongshu-storage':storage,'./xiaohongshu-image-assets':{getXiaohongshuVisionDataUrl:async id=>{reads.push(id);loading++;maxReads=Math.max(maxReads,loading);await Promise.resolve();loading--;return 'data:image/jpeg;base64,'+Buffer.from(id).toString('base64');}},'./xiaohongshu-vision':vision});
const native= new Function('makeXiaohongshuComment','makeXiaohongshuNotification','resolveCharacterXiaohongshuDisplayName','addNames',transpile(fn('lib/xiaohongshu-engine.ts','applyCharacterReaction'))+';return applyCharacterReaction;')(storage.makeXiaohongshuComment,storage.makeXiaohongshuNotification,()=> 'Native display', (a,b)=>[...new Set([...a,...b])].slice(-8));
const memory=mod('xiaohongshu-memory',{'./kv-db':kv,'./llm-prompt-assembler':{formatChatTimestamp:x=>x}});
const commit=mod('xiaohongshu-chat-share-commit',{
 './xiaohongshu-chat-share':bridge,'./xiaohongshu-storage':storage,'./kv-db':kv,
 './xiaohongshu-engine':{applyCharacterReaction:native},'./xiaohongshu-character-profile':{resolveCharacterXiaohongshuDisplayName:()=> 'Native display'},
 './character-storage':{loadCharacters:()=>[role]},'./chat-storage':{loadChatMessages:()=>chat},
 './chat-db':{chatDb:{messages:{bulkGet:async ids=>ids.map(id=>durable.find(m=>m.id===id))},sessions:{get:async()=>session}}},
 './xiaohongshu-memory':memory,'./memory-storage':{incrementEventCounter:()=>counters++},'./memory-summarizer':{maybeRunSummarization:async()=>{summaries++;}}
});
function reset(source='user'){
 state={notes:[note(source),{...note(),id:'unrelated'}],notifications:[],settings:{}};chat=[plain(share),plain(response)];durable=plain(chat);
 store=new Map();events=[];counters=0;summaries=0;notifications=0;reads=[];maxReads=0;loading=0;failCommit=false;
}
let count=0;const pass=s=>{count++;console.log('PASS '+s);};
const action=(data)=>({like:false,save:false,replies:[],...data});
const pending=(data,turn)=>({shareMessageId:'share',noteId:'note',turnId:turn||'turn-'+(++uid),allowedReplyIds:['a','b','c'],action:action(data)});
const apply=(p,extra={})=>commit.commitXhsShareActions({sessionId:'session',characterId:'role',responseMessageId:'assistant',pending:p,...extra});
let outputs,requests,streaming,nativeMode,tools,providerFail,toolFailure,abortSignal,previews,visible,rawNative,metaTexts;
const fullOutput='Reply with [语音:hello] and [表情:fixture].\n<xhs_social_actions>{"like":true,"replies":[{"targetCommentId":"b","text":"valid reply"}]}</xhs_social_actions>';
async function request(messages,onDelta){
 requests.push(plain(messages));
 if(providerFail&&requests.length===1)throw Error(providerFail);
 if(abortSignal)abortSignal.abort();
 const value=outputs.shift();if(value instanceof Error)throw value;
 if(onDelta)for(let i=0;i<value.length;i+=7)await onDelta(value.slice(i,i+7));
 return value;
}
const env={
 ...bridge,buildChatPromptMessages:async(_session,history,opts)=>{
  let ids;const selected=opts?.xhsShareEnabled?bridge.newestXhsShareMessage(history,session.id):null;
  const llmMessages=selected?await bridge.buildXhsSharePromptForChat(selected,bridge.canUseXhsShareVision(api),x=>ids=x):[{role:'user',content:'plain'}];
  return {llmMessages,character:role,config:api,preset:null,regexes:[],userIdentity:{name:'User'},toolsEnabled:tools,xhsShareTargets:ids};
 },
 mergeAppTags:x=>x,loadChatSessions:()=>[session],getEnabledTools:()=>tools?[{name:'fixture'}]:[],nativeToolProtocolForConfig:()=>nativeMode,
 isSessionStreamingEnabled:()=>streaming,getMaxToolRounds:()=>3,
 sendLLMRequest:async(_api,_preset,messages)=>request(messages),
 sendLLMStreamRequest:async(_api,_preset,messages,_regex,_meta,_opts,callbacks)=>({content:await request(messages,callbacks.onDelta)}),
 sendLLMToolRequest:async(_api,_preset,messages)=>{const value=await request(messages);return {content:value,toolCalls:requests.length===1&&tools?[{id:'call',name:'fixture',args:{}}]:[]};},
 sendLLMToolStreamRequest:async(_api,_preset,messages,_definitions,_regex,_meta,_opts,callbacks)=>{const value=await request(messages,callbacks.onDelta);return {content:value,toolCalls:requests.length===1&&tools?[{id:'call',name:'fixture',args:{}}]:[]};},
 throwIfAborted:signal=>{if(signal?.aborted)throw Error('aborted');},
 stripPresetTexts:x=>x,parseActionTags:x=>({cleanText:x,actions:[]}),stripStateAndInnerForPrompt:x=>x,
 parseToolFetches:()=>[],parseToolCalls:x=>({toolCalls:tools&&x.includes('[fixture-tool]')?[{name:'fixture',args:{}}]:[]}),
 extractTextToolDirectiveText:x=>x.includes('[fixture-tool]')?'[fixture-tool]':'',
 createResponseBatchId:()=> 'batch',createToolExecutionId:()=> 'tool-id',
 executeToolCalls:async()=>{if(toolFailure)throw Error('tool failed');return [{name:'fixture',success:true,persistToHistory:true,continueConversation:true}];},
 formatToolResults:()=> 'fixture-result',
 formatNativeChatToolResult:()=> 'fixture-result',
 SHOPPING_SHARE_PURCHASE_TOOL_NAME:'shopping',incrementEventCounter(){},maybeRunSummarization:async()=>{},
 normalizeNativeExpandedToolSourceIds:()=>[],isNativeSingleTool:()=>true,nativeToolSourceKey:()=> 'fixture',
 buildNativeChatTools:()=>({definitions:[],loaderMap:new Map(),nameMap:new Map(),displayNameMap:new Map(),realToolSourceMap:new Map()}),
 toLlmRequestMessages:plain,nativeChatToolCallToTextCall:call=>call,
 require:id=>{if(id==='./push-bailout-client')return {armReplyBailout:async()=>null};throw Error(id);},
 maybeAppendShortcutCapability(){},buildProviderRequest:()=>({})
};
const api={id:'api',provider:'OpenAI',baseUrl:'fixture',defaultModel:'vision',enableImageRecognition:true};
const source=['generateNativeChatCompletion','generateChatCompletionCore','generateChatCompletion'].map(n=>fn('lib/chat-engine.ts',n)).join('\n');
const engine=new Function(...Object.keys(env),transpile(source)+';return {generateChatCompletion};')(...Object.values(env));
async function gen(extra={}){
 previews=[];visible=[];rawNative=[];metaTexts=[];requests=[];
 return engine.generateChatCompletion(session,chat.filter(m=>m.id==='share'),{xhsShareEnabled:true,diagnosticRunId:'engine-turn',...extra},{
 onStreamDelta:t=>previews.push(t),onTextPart:(t,_s,meta)=>{visible.push(t);if(meta)metaTexts.push(meta.rawResponseText);},
 onNativeToolAssistantTurn:t=>{rawNative.push(t.rawContent);visible.push(t.content);}
 });
}
async function main(){
 reset();const messages=await bridge.buildXhsSharePromptForChat(share,true);
 assert.equal(reads.length,9);assert.equal(maxReads,1);assert.equal(messages[0].content.filter(p=>p.type==='image_url').length,9);
 const context=messages[0].content.filter(p=>p.type==='text').map(p=>p.text).join('\n');
 for(const s of ['Real full post text','real-tag','[作者类型]user','[发布于]yesterday','[评论ID]c [回复父ID]b'])assert(context.includes(s));
 assert.equal(events.length,0);pass('real original text, tags, identity, parent IDs, nine ordered images; sequential reads and no read memory');
 assert.equal(bridge.newestXhsShareMessage([share,response],session.id),null);
 assert.equal(bridge.newestXhsShareMessage([{...share,mediaData:{} }],session.id),null);pass('later chat and legacy cards do not reopen images');
 reset();state.notes[0].imageAssetIds=['image0'];await bridge.buildXhsSharePromptForChat(share,true);assert.equal(reads.length,1);
 reset();await bridge.buildXhsSharePromptForChat(share,false);assert.equal(reads.length,0);
 state.notes=[];const missing=await bridge.buildXhsSharePromptForChat({...share,mediaData:{...share.mediaData,xiaohongshuBody:'old short summary'}},true);assert(missing[0].content.includes('old short summary'));assert.equal(reads.length,0);
 pass('single image, disabled vision and deleted original use bounded reads and truthful stored-summary fallback');
 const huge=note();huge.comments=Array.from({length:100},(_,i)=>c(String(i),'npc',i?String(i-1):undefined));
 const chosen=bridge.selectCommentsForContext(huge);assert(chosen.length<=30);assert(chosen.every(c=>!c.replyToCommentId||chosen.some(x=>x.id===c.replyToCommentId)));
 pass('bounded context never retains a child while omitting an existing parent');
 for(const sourceType of ['user','npc','character'])for(const operation of [{like:true},{save:true},{comment:'main'},{replies:[{targetCommentId:'b',text:'reply'}]},{like:true,save:true,comment:'main',replies:[{targetCommentId:'c',text:'deep reply'}]}]){
  reset(sourceType);const before=plain(state);const p=pending(operation);const result=await apply(p);assert(result.applied);
  const n=state.notes[0];assert.deepEqual(n.comments.slice(0,3),before.notes[0].comments);assert(n.comments.slice(3).every(c=>c.authorType==='character'&&c.authorId==='role'&&c.authorName==='Native display'));
  assert.equal(n.liked,true);assert.equal(n.saved,true);assert.equal(n.commentCount,n.comments.length);
  assert.deepEqual(state.notes[1],before.notes[1]);assert.equal(events.length,Number(!!operation.comment)+Number(!!operation.replies));
  assert.equal(counters,Number(!!operation.comment||!!operation.replies));assert.equal(summaries,counters);
  assert.equal((await apply(p)).duplicate,true);
  if(!operation.comment&&!operation.replies){assert.equal(n.comments.length,3);assert.equal(events.length,0);}
 }
 pass('all five action combinations on three author types use real native semantics, notifications and memory');
 reset();const p=pending({comment:'today'});await Promise.all([apply(p),apply({...p})]);assert.equal(state.notes[0].comments.length,4);
 for(const v of store.values()){assert(!v.includes('yesterday'));assert(v.includes('评论'));}pass('same-turn async reentry writes once; memory refers to today comment, not yesterday posting');
 reset();const q=pending({comment:'new round'});await apply(q);await apply(pending({comment:'retry'}));assert.equal(state.notes[0].comments.length,5);chat=[];assert.equal(state.notes[0].comments.length,5);pass('explicit new generation may interact again; deleting chat does not undo social history');
 const failures=[
 ()=>{durable=durable.filter(m=>m.id!=='assistant');},
 ()=>{chat=chat.filter(m=>m.id!=='share');},
 ()=>{state.notes=[];},
 ()=>{session.contactId='someone';},
 ()=>{failCommit=true;},
 ()=>{durable[1].sessionId='elsewhere';}
 ,()=>{chat.push({id:'new-user',sessionId:'session',role:'user',content:'new input'});}
 ];
 for(const change of failures){reset();change();const before=JSON.stringify(state);assert.equal((await apply(pending({like:true,comment:'invalid'}))).applied,false);assert.equal(JSON.stringify(state),before);assert.equal(events.length,0);session.contactId='role';}
 reset();assert.equal((await apply(pending({like:true}),{isActive:()=>false})).applied,false);
 assert.equal((await apply(pending({like:true,replies:[{targetCommentId:'unrelated',text:'bad'}]}))).applied,false);
 assert.equal((await apply(pending({authorId:'someone',like:true}))).applied,false);
 pass('missing durable reply/share/note, impersonation, foreign target, cancellation and quota cause zero social writes');
 reset();for(const bad of ['{"like":"true"}','{"noteId":"other","like":true}','{"replies":[{"targetCommentId":"b","text":""}]}'])assert.equal(bridge.parseXhsSocialActions('<xhs_social_actions>'+bad+'</xhs_social_actions>').actions,null);
 assert.equal(bridge.parseXhsSocialActions('<xhs_social_actions>{"like":true}</xhs_social_actions><xhs_social_actions>{"save":true}</xhs_social_actions>').actions,null);
 pass('malformed, duplicate and identity-changing model directives rejected as a whole');
 for(nativeMode of [false,true])for(streaming of [false,true]){
  reset();tools=false;outputs=[fullOutput];providerFail=null;toolFailure=false;abortSignal=null;
  const result=await gen();assert(result.xiaohongshuAction);assert.equal(result.xiaohongshuAction.allowedReplyIds.length,3);
  assert.equal(reads.length,9);for(const value of [...visible,...rawNative,...metaTexts,previews.join(''),result.parts.map(p=>p.text).join('')])assert(!/xhs_social_actions|"like"/.test(value));
  assert(visible.join('').includes('[语音:hello]'));assert(visible.join('').includes('[表情:fixture]'));
 }
 pass('real chat core: native/plain x streaming/nonstreaming sanitize bubbles/raw fields and preserve rich directives');
 for(nativeMode of [false,true]){
  reset();streaming=true;tools=true;outputs=[(nativeMode?'':'[fixture-tool]\n')+fullOutput,'Final visible reply'];providerFail=null;
  const result=await gen();assert(result.xiaohongshuAction);assert.equal(requests.length,2);assert.equal(reads.length,9);assert(rawNative.every(s=>!s.includes('xhs_social_actions')));assert(metaTexts.every(s=>!s.includes('xhs_social_actions')));
  reset();outputs=[(nativeMode?'':'[fixture-tool]\n')+fullOutput,Error('second API failure')];const failed=await gen();assert.equal(failed.xiaohongshuAction,undefined);
 }
 pass('native/text tools keep control JSON out of raw history; later API failure discards proposals');
 reset();nativeMode=false;streaming=false;tools=false;outputs=['text fallback'];providerFail='API Error 400: model does not support images';
 const fallback=await gen();assert.equal(requests.length,2);assert.equal(typeof requests[1][0].content,'string');assert(requests[1][0].content.includes('不得声称看过图片'));assert.equal(fallback.xiaohongshuAction,undefined);
 reset();outputs=['next share'];providerFail=null;await gen();assert.equal(reads.length,0);
 api.defaultModel='new-vision';reset();outputs=['fresh'];await gen();assert.equal(reads.length,9);
 pass('unsupported vision retries once in text, avoids later image reads; a new model restores vision');
 reset();outputs=['No social choice'];await gen();assert.equal(events.length,0);assert.equal(state.notes[0].comments.length,3);
 reset();outputs=[Error('generation failed')];await assert.rejects(gen(),/generation failed/);assert.equal(events.length,0);
 reset();outputs=[fullOutput];abortSignal=new AbortController();await assert.rejects(gen({signal:abortSignal.signal}),/aborted/);abortSignal=null;
 pass('no operation, failed generation and abort cannot execute social effects inside engine');
 const chatRoom=text('components/chat/chat-room.tsx'),background=text('lib/follow-up-service.ts');
 assert.equal((chatRoom.match(/await commitSharedNoteActionAfterSave/g)||[]).length,2);
 assert(chatRoom.includes('onMessageCommit: value'));assert(background.includes('await awaitMessageCommits()'));assert(background.includes('responseMessageId: savedReplyIds[0]'));
 assert(!text('lib/xiaohongshu-chat-share.ts').includes('recordXiaohongshu'));
 pass('front and background save routes confirm commits before actions; read path has no native event write');
 const roomAst=ts.createSourceFile('room.tsx',chatRoom,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let saveAction;
 function findSave(n){if(ts.isVariableDeclaration(n)&&n.name?.text==='commitSharedNoteActionAfterSave')saveAction=n.initializer.getText(roomAst);ts.forEachChild(n,findSave);}findSave(roomAst);assert(saveAction);
 let helperCalls=0,savedNotices=[];
 const bindings={session,isXhsSavedChatReply:bridge.isXhsSavedChatReply,commitXhsShareActions:async()=>{helperCalls++;return {applied:false,reason:'synthetic social failure'};},pushChatMessage:msg=>{savedNotices.push(msg);return msg;},setMessages(){},showChatToast(){}};
 const saveHelper=new Function(...Object.keys(bindings),transpile('const saveAction='+saveAction)+';return saveAction;')(...Object.values(bindings));
 let confirm;let active=true;const wait=new Promise(r=>confirm=r);
 const processing=saveHelper(pending({like:true}),[{message:response,committed:wait}],{isActive:()=>active});
 await Promise.resolve();assert.equal(helperCalls,0);active=false;confirm(true);await processing;assert.equal(helperCalls,0);
 await saveHelper(pending({like:true}),[{message:response,committed:Promise.resolve(true)},{message:response,committed:Promise.resolve(false)}],{isActive:()=>true});assert.equal(helperCalls,0);
 await saveHelper(pending({like:true}),[{message:response,committed:Promise.resolve(true)}],{isActive:()=>true});assert.equal(helperCalls,1);assert(savedNotices[0].content.includes('小红书操作未执行'));
 pass('actual frontend save helper waits for every segment commit, rejects cancelled/partial saves and surfaces social failure');
 console.log('PASS: '+count+' native share integration groups (mock network/storage, actual core/reaction/projection code)');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
