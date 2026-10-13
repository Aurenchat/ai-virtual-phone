'use strict';
// Real handler/engine/projection code; explicit offline storage and network boundaries.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const repo=path.resolve(__dirname,'..'),clone=x=>JSON.parse(JSON.stringify(x));
const read=p=>fs.readFileSync(path.join(repo,p),'utf8');
const stateKey='ai_phone_xiaohongshu_state_v1',eventKey='ai_phone_xiaohongshu_events_character';
let db,commits,requests,reads,inputs,failAt,rawResponse,onRequest,commitFailure,release,errors,notices;
const globalApi={id:'global',provider:'OpenAI',defaultModel:'npc-fixture',enableImageRecognition:true};
const characterApi={...globalApi,id:'character-api',defaultModel:'independent-character-fixture'};
const preset={id:'character-preset'},character={id:'character',name:'Role'};
const kv={
 registerDynamicPrefix(){},registerKvMigration(){},
 kvGet:key=>db.get(key)||null,kvReadFresh:async key=>db.get(key)||null,
 kvKeysWithPrefix:prefix=>[...db.keys()].filter(k=>k.startsWith(prefix)),
 kvUpdateManyAtomic:async(keys,update)=>{
  const next=update(new Map(keys.map(k=>[k,db.get(k)||null])));
  if(commitFailure)throw Error('transaction failed before commit');
  for(const [k,v] of next.values)assert(keys.includes(k));
  for(const [k,v] of next.values)v===null?db.delete(k):db.set(k,v);
  commits++;return next.result;
 },
 kvSet(){throw Error('unexpected non-atomic write')},kvRemove(){throw Error('unexpected deletion')}
};
const mocks={
 './kv-db':kv,
 './xiaohongshu-image-assets':{getXiaohongshuVisionDataUrl:async id=>{reads.push(id);return 'data:image/png;base64,'+Buffer.from(id).toString('base64');}},
 './chat-engine':{ChatEngineError:Error,sendLLMRequest:async(config,selectedPreset,messages,regexes,_identity,options)=>{
   requests.push({config,selectedPreset,messages:clone(messages),regexes,options});
   const i=requests.length;if(onRequest)await onRequest(i);
   if(i===failAt)throw Error('fixture API failure '+i);
   if(rawResponse!==null)return rawResponse;
   const body=messages.flatMap(m=>typeof m.content==='string'?[m.content]:m.content.filter(p=>p.type==='text').map(p=>p.text)).join('\n');
   const id=/\[固定评论ID\]([^\n]+)/.exec(body)[1];
   return '#单条评论\n[作者]MALICIOUS AUTHOR\n[ID]new-id\n[内容]new:'+id;
 }},
 './character-storage':{loadCharacters:()=>[character]},
 './xiaohongshu-character-profile':{resolveCharacterXiaohongshuDisplayName:c=>c.name},
 './llm-prompt-assembler':{formatChatTimestamp:x=>x,assemblePromptPayload:input=>{
   inputs.push(clone(input));return [{role:'system',content:'role '+input.character.id+' memory '+input.longTermMemories},{role:'user',content:input.xiaohongshuCommentContext}];
 }},
 './bilingual-prompt-defaults':{resolveBilingualPrompt:()=>''},
 './memory-injector':{formatCoreMemories:()=> 'core-fixture',formatLongTermMemories:()=> 'memory-fixture'},
 './memory-storage':{loadMemoryConfig:()=>({})},
 './memory-service':{retrieveCoreMemoriesForPrompt:async()=>[],retrieveMemoriesForPrompt:async()=>[]},
 './short-term-assembler':{prepareShortTermContext:()=>({wbActivationContext:'context',recentBlocks:[],unifiedRecentItems:[]})},
 './settings-storage':{
  loadApiConfigs:()=>[globalApi,characterApi],loadBindingConfig:()=>({globalDefaults:{apiConfigId:globalApi.id}}),
  loadPresets:()=>[preset],loadWorldBooks:()=>[],loadRegexes:()=>[],
  resolveBinding:(_bindings,id,app)=>{assert.equal(id,'character');assert.equal(app,'xiaohongshu');return {apiConfigId:characterApi.id,presetId:preset.id};},
  resolveUserIdentity:()=>({name:'User'})
 },
 './xiaohongshu-storage':{
  loadXiaohongshuState:()=>JSON.parse(db.get(stateKey)),
  makeXiaohongshuNpcId:name=>'npc-'+name,
  makeXiaohongshuComment(){throw Error('must not create comments')},
  makeXiaohongshuNotification(){throw Error('must not create notifications')}
 }
};
const cache=new Map();
function load(id){
 if(Object.hasOwn(mocks,id))return mocks[id];
 if(cache.has(id))return cache.get(id);
 const filename=path.join(repo,'lib',id.slice(2)+'.ts'),exports={};cache.set(id,exports);
 const result=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 new Function('exports','require',result.outputText)(exports,load);return exports;
}
const api=load('./xiaohongshu-comment-regeneration'),engine=load('./xiaohongshu-engine'),memory=load('./xiaohongshu-memory');
const app=read('components/xiaohongshu/xiaohongshu-app.tsx');
const ast=ts.createSourceFile('app.tsx',app,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function extract(name){let found;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found=n;ts.forEachChild(n,visit);}visit(ast);assert(found,name);return found.getText(ast);}
function handler(){
 const source='let busy="idle"; const commentRegenerationInFlightRef={current:false};'+
  'function setBusy(v){busy=v} function setRegeneratingCommentId(){} function clearErrorState(){} function setState(){}'+
  extract('handleRegenerateComment')+'; return handleRegenerateComment;';
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const vars={...api,generateXiaohongshuRegeneratedCommentText:engine.generateXiaohongshuRegeneratedCommentText,
  handleGenerationError:e=>errors.push(e.message),onNotice:s=>notices.push(s)};
 return new Function(...Object.keys(vars),js)(...Object.values(vars));
}
function c(id,type,parent,text='old:'+id){return {id,noteId:'n',authorType:type,authorId:type==='character'?'character':id,authorName:id,text,replyTo:parent?'name:'+parent:undefined,replyToCommentId:parent,createdAt:'2026-01-01',liked:true,disliked:false,likeCount:5,dislikeCount:2,unread:true};}
function fixture(rootType='npc'){
 const comments=[c('root',rootType),c('b','npc','root'),c('u','user','root'),c('e','character','root'),c('d','npc','u'),c('deep','npc','d'),c('f','npc','e'),c('other','npc'),{...c('legacy','npc'),replyTo:'root'}];
 const note={id:'n',type:'post',source:'user',authorName:'User',title:'fixture',body:'fixture body',tags:[],comments,commentCount:comments.length,likeCount:10,saveCount:5,imageAssetIds:Array.from({length:9},(_,i)=>'photo-'+i),createdAt:'2026-01-01',updatedAt:'2026-01-01'};
 return {notes:[note],profile:{nickname:'User'},settings:{bilingualTranslationEnabled:false},notifications:[{id:'notice',type:'comment',noteId:'n',actorName:'root',text:'old:root',unread:false,createdAt:'old'}],userInteractions:{untouched:true},socialGraph:{untouched:true}};
}
function reset(rootType='npc'){
 db=new Map([[stateKey,JSON.stringify(fixture(rootType))]]);
 commits=0;requests=[];reads=[];inputs=[];failAt=-1;rawResponse=null;onRequest=null;commitFailure=false;errors=[];notices=[];release=null;
}
function saved(){return JSON.parse(db.get(stateKey));}
function body(r){return r.messages.flatMap(m=>typeof m.content==='string'?[m.content]:m.content.filter(p=>p.type==='text').map(p=>p.text)).join('\n');}
function verifyIdentity(before,after,targets){
 assert.equal(after.comments.length,before.comments.length);
 for(let i=0;i<before.comments.length;i++){
  const expected=targets.has(before.comments[i].id)?{...before.comments[i],text:'new:'+before.comments[i].id}:before.comments[i];
  assert.deepEqual(after.comments[i],clone(expected));
 }
}
let checks=0;function pass(s){checks++;console.log('PASS '+s);}
async function main(){
 reset();const before=fixture(),run=handler();await run(before.notes[0].comments[0]);
 assert.equal(commits,1);assert.equal(errors.length,0);
 assert.deepEqual(requests.map(r=>/\[固定评论ID\]([^\n]+)/.exec(body(r))[1]),['root','b','d','f','deep']);
 verifyIdentity(before.notes[0],saved().notes[0],new Set(['root','b','d','f','deep']));
 assert.deepEqual(saved().userInteractions,before.userInteractions);assert.equal(saved().notifications.length,1);assert.equal(saved().notifications[0].text,'new:root');
 assert.equal(reads.length,9);assert(requests.every(r=>r.config.id==='global'));
 for(const r of requests.slice(1)){assert(body(r).includes('new:root'));for(const id of ['b','d','f','deep'])if(id!==/\[固定评论ID\]([^\n]+)/.exec(body(r))[1])assert(!new RegExp('old:'+id+'(?![a-z])').test(body(r)));}
 pass('NPC cross-layer BFS: only root/NPC descendants change, one commit, IDs/votes/user replies preserved');
 pass('fresh ancestry reaches deep NPCs, pending old NPC text excluded; nine pictures sent only once');
 reset('character');const characterBefore=fixture('character'),root=characterBefore.notes[0].comments[0];
 db.set(eventKey,JSON.stringify([{id:'xiaohongshu_comment_root',noteId:'n',commentId:'root',timestamp:'old',content:'Role，评论：“old:root”。点赞：是，收藏：否。'}]));
 await handler()(root);
 assert.equal(requests[0].config.id,'character-api');assert.equal(requests[0].selectedPreset.id,'character-preset');assert.equal(inputs[0].character.id,'character');assert.equal(inputs[0].longTermMemories,'memory-fixture');
 assert(requests.slice(1).every(r=>r.config.id==='global'));assert.equal(commits,1);
 assert.equal(JSON.parse(db.get(eventKey))[0].content,'Role，评论：“new:root”。点赞：是，收藏：否。');
 verifyIdentity(characterBefore.notes[0],saved().notes[0],new Set(['root','b','d','f','deep']));
 pass('character uses independent XHS API/preset/memory, NPC descendants use global API; projection joins commit');
 reset();await handler()(fixture().notes[0].comments.find(x=>x.id==='d'));
 verifyIdentity(fixture().notes[0],saved().notes[0],new Set(['d','deep']));assert.equal(requests.length,2);
 pass('single nested NPC rerolls only itself and its own NPC descendants; nickname-only comments untouched');
 for(const index of [1,2,3,5]){
  reset('character');const original=db.get(stateKey);db.set(eventKey,'[]');failAt=index;await handler()(fixture('character').notes[0].comments[0]);
  assert.equal(db.get(stateKey),original);assert.equal(db.get(eventKey),'[]');assert.equal(commits,0);assert.equal(errors.length,1);
 }
 for(const raw of ['','#单条评论\n[内容]','#别的事件\n[内容]bad','#单条评论\n[内容]新评论正文','#单条评论\n[内容]old:root']){
  reset();rawResponse=raw;const original=db.get(stateKey);await handler()(fixture().notes[0].comments[0]);assert.equal(db.get(stateKey),original);assert.equal(commits,0);
 }
 pass('API failure at first/second/third/last reply and invalid/unchanged output all preserve entire archive');
 const mutations=[
  s=>s.notes[0].comments[0].text='external',
  s=>s.notes[0].comments=s.notes[0].comments.filter(x=>x.id!=='root'),
  s=>s.notes[0].comments.find(x=>x.id==='u').text='changed intermediary',
  s=>s.notes[0].comments.find(x=>x.id==='e').replyToCommentId='other',
  s=>s.notes[0].comments.push(c('new-child','npc','u')),
  s=>s.notes[0].comments.push(c('new-user','user','root')),
  s=>s.notes[0].comments[0].likeCount++,
  s=>s.notes[0].comments.find(x=>x.id==='d').replyTo='changed label',
  s=>s.notes[0].comments.reverse(),
  s=>s.notes[0].body='changed note context'
 ];
 for(const mutate of mutations){
  reset();let modified;onRequest=i=>{if(i===2){const s=saved();mutate(s);modified=JSON.stringify(s);db.set(stateKey,modified);}};
  await handler()(fixture().notes[0].comments[0]);assert.equal(db.get(stateKey),modified);assert.equal(commits,0);assert.match(errors[0],/发生变化/);
 }
 pass('10 concurrent edits/deletions/votes/relinks/order/context changes rejected against durable fresh state');
 reset();commitFailure=true;const original=db.get(stateKey);await handler()(fixture().notes[0].comments[0]);assert.equal(db.get(stateKey),original);assert.equal(commits,0);
 pass('storage transaction failure makes no partial comment/notification/projection writes');
 reset();onRequest=async i=>{if(i===1)await new Promise(r=>release=r);};const sameHandler=handler(),pending=sameHandler(fixture().notes[0].comments[0]);
 while(!release)await new Promise(r=>setTimeout(r,1));await sameHandler(fixture().notes[0].comments[0]);assert.equal(requests.length,1);release();await pending;assert.equal(commits,1);assert.equal(requests.length,5);
 pass('rapid repeated clicks produce one generation chain and one commit');
 reset();await handler()(fixture().notes[0].comments.find(x=>x.id==='u'));assert.equal(requests.length,0);assert.equal(commits,0);
 globalApi.enableImageRecognition=false;reset();await handler()(fixture().notes[0].comments[0]);assert.equal(reads.length,0);globalApi.enableImageRecognition=true;
 pass('user targets rejected; disabled vision performs zero image reads');
 const equal=c('equal','character',undefined,'same'),entries=[
  {id:'xiaohongshu_reply_equal',noteId:'n',commentId:'equal',timestamp:'old',content:'Role，User评论：“same”，回复：“same”。'},
  {id:'xiaohongshu_reply_equal',noteId:'other',commentId:'equal',timestamp:'old',content:'Role，回复：“same”。'},
  {id:'ambiguous',noteId:'n',commentId:'equal',timestamp:'old',content:'Role，回复：“same”。'}
 ];
 const revised=memory.reviseXiaohongshuRegeneratedCommentProjectionEntries(entries,eventKey,new Map([['equal',{before:equal,afterText:'replacement'}]]));
 assert.equal(revised[0].content,'Role，User评论：“same”，回复：“replacement”。');assert.deepEqual(revised.slice(1),entries.slice(1));assert.equal(revised.length,entries.length);
 assert.strictEqual(memory.reviseXiaohongshuRegeneratedCommentProjectionEntries(entries,'ai_phone_xiaohongshu_events_other',new Map([['equal',{before:equal,afterText:'replacement'}]])),entries);
 pass('projection updates only matching note/owner/canonical event and own snippet; no quoted-parent rewrite');
 const collisionNote={...fixture().notes[0],comments:[{...c('a','npc',undefined,'A'),authorName:'same'},{...c('b','npc',undefined,'B'),authorName:'same'}]};
 const collisionNotices=[{id:'a',type:'comment',noteId:'n',actorName:'same',text:'A'}];
 assert.equal(api.reviseXiaohongshuCommentNotifications(collisionNotices,collisionNote,new Map([['a','B'],['b','C']]))[0].text,'B');
 pass('notification matching uses original texts and cannot cascade into another comment');
 const orderSource=ts.transpileModule(extract('orderCommentsForDisplay'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const order=new Function(orderSource+';return orderCommentsForDisplay;')();
 const sample=fixture().notes[0],changed=api.applyXiaohongshuCommentRegeneration(sample,new Map([['root','new:root']]));
 assert.deepEqual(order(sample.comments).map(x=>x.id),order(changed.comments).map(x=>x.id));
 const baseline=require('node:child_process').execFileSync('git',['show','b97019f4beea0507efd1920c5f6ddd0ad6c3142c:components/xiaohongshu/xiaohongshu-app.tsx'],{cwd:repo,encoding:'utf8'});
 assert(baseline.includes(extract('orderCommentsForDisplay').replace(/\r/g,'')));
 assert.equal((app.match(/onRegenerateComment=\{comment => void handleRegenerateComment\(comment\)\}/g)||[]).length,2);
 pass('existing flat display function unchanged; detail and video both wire the shared action');
 assert(!/recordXiaohongshu|incrementEventCounter|retrieveMemories|saveMemory/.test(read('lib/xiaohongshu-comment-regeneration.ts')));
 console.log('PASS: '+checks+' offline regeneration integration groups (no live API calls)');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
