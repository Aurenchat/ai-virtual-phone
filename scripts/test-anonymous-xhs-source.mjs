// Source, adapter, identity and durable-continuation tests. No model claims; no package generation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);
const root=path.resolve('custom-apps/anonymous-xiaohongshu'),src=root+'/src/';
const read=file=>fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');
let checks=0;const results=[];
async function test(name,fn){await fn();checks++;results.push(name);console.log('PASS',name);}
const ast=s=>ts.createSourceFile('source.tsx',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const functions=s=>{const f=ast(s);return new Map(f.statements.filter(ts.isFunctionDeclaration).filter(n=>n.name).map(n=>[n.name.text,n.getText(f)]));};
const provenance=JSON.parse(read(root+'/upstream/provenance.json'));
const map=JSON.parse(read(root+'/source-map.json'));
for(const row of provenance.files)await test('pinned snapshot SHA256 '+row.path,()=>assert.equal(createHash('sha256').update(fs.readFileSync(root+'/upstream/'+row.path+'.source')).digest('hex'),row.sha256));
for(const row of map.files){
 if(!row.copiedDirectly)continue;
 await test('complete source counterpart '+row.upstream,()=>{
  if(row.upstream.endsWith('.png')){assert(fs.readFileSync(root+'/upstream/'+row.upstream+'.source').equals(fs.readFileSync(root+'/'+row.fork)));return;}
  const original=read(root+'/upstream/'+row.upstream+'.source'),fork=read(root+'/'+row.fork);
  if(!row.modifications.length)assert.equal(fork,original);
  for(const name of functions(original).keys())assert(functions(fork).has(name),'missing original function '+name);
 });
}
const originalUi=read(root+'/upstream/components/xiaohongshu/xiaohongshu-app.tsx.source'),forkUi=read(src+'fork/components/xiaohongshu/xiaohongshu-app.tsx');
await test('all top-level original UI helpers are exact copies',()=>{
 const original=functions(originalUi),fork=functions(forkUi);
 for(const [name,body] of original)if(name!=='XiaohongshuApp')assert.equal(fork.get(name),body.replaceAll('Date.now()','actionNow()').replaceAll('Math.random()','actionRandom()').replaceAll('crypto.randomUUID()','actionUuid()'),name);
});
await test('all nine native generation entrypoints retained',()=>{
 const original=functions(read(root+'/upstream/lib/xiaohongshu-engine.ts.source')),fork=functions(read(src+'fork/lib/xiaohongshu-engine.ts'));
 const names=[...original.keys()].filter(n=>n.startsWith('generateXiaohongshu'));assert.equal(names.length,9);
 for(const n of names)assert.equal(fork.get(n),original.get(n),n);
});
await test('native vision fallback consumes only the structured unsupported code',()=>{
 const engine=read(src+'fork/lib/xiaohongshu-engine.ts');
 assert(engine.includes('if (code === "MULTIMODAL_UNSUPPORTED") return true;'));
 assert(engine.includes('if (code) return false;'));
});
await test('full native settings and prompt editors retained',()=>{
 for(const text of ['INTERACTION','TRANSLATION','PARTICIPANTS','PROMPTS','NPC身份保护','帖子生成','评论用户帖子','回复用户评论','加载更多评论','回复私信','双语翻译','折叠翻译'])assert(forkUi.includes(text),text);
 const original=ast(originalUi),fork=ast(forkUi);let counts=f=>{let n=0;const visit=x=>{if(ts.isJsxElement(x)||ts.isJsxSelfClosingElement(x))n++;ts.forEachChild(x,visit);};visit(f);return n;};assert(counts(fork)>=counts(original));
});
await test('product CSS remains byte-equivalent after line-ending normalization',()=>{
 for(const file of ['checkphone','xiaohongshu'])assert.equal(read(src+`fork/styles/${file}.css`),read(root+`/upstream/styles/${file}.css.source`));
});
await test('required opt-in permissions and default build cannot package',()=>{
 const m=JSON.parse(read(root+'/manifest.json'));for(const p of ['ai.generateScoped','ai.tasks','app.policy.manage','memory.source.read','memory.source.write','chat.sendCard'])assert(m.permissions.includes(p));
 for(const p of ['ai.generate','memory.search','user.profile.read'])assert(!m.permissions.includes(p));
 assert(read('scripts/build-anonymous-xiaohongshu.mjs').includes("if (!process.argv.includes('--package'))"));
});
await test('identity-only prompt projection keeps original output protocol',()=>{
 const {projectPromptIdentity}=require(src+'identity/prompt-projection.ts');
 const prompt=projectPromptIdentity('以下名字属于真实角色或用户\n{{user}}\n#用户笔记互动\n[点赞用户1]someone\n[被@角色]friend','moth');assert(!prompt.includes('真实角色或用户'));assert(prompt.includes('moth'));assert(prompt.includes('#用户笔记互动'));assert(prompt.includes('[点赞用户1]'));assert(prompt.includes('[被@账号]'));
});

const db=new Map(),tasks=new Map(),revisions=new Map(),memories=new Map();let calls=0,consumes=0,namingError=false,lastRequest;
const scopeKey=s=>JSON.stringify([s.viewerCharacterId,s.sourceNamespace,s.sourceEntityId]);
const characters=[{id:'private-a',name:'Krueger',persona:'Krueger enjoys coffee; Chloe is a colleague.',avatar:'PRIVATE_AVATAR_A'},{id:'private-b',name:'Soap',persona:'Soap enjoys photography.',avatar:'PRIVATE_AVATAR_B'}];
global.window={dispatchEvent(){},AiPhone:{
 app:{async setPolicy(){}},characters:{async list(){return characters;}},
 db:{async get(c,id){return structuredClone(db.get(c+'.'+id));},async list(c){return [...db].filter(([k])=>k.startsWith(c+'.')).map(([,v])=>structuredClone(v));},async create(c,r){if(db.has(c+'.'+r.id))throw Error('duplicate row');db.set(c+'.'+r.id,structuredClone(r));return r;},async update(c,id,r){db.set(c+'.'+id,{...db.get(c+'.'+id),...structuredClone(r)});}},
 ai:{async startTask({idempotencyKey:key,request}){lastRequest=request;if(tasks.has(key))return tasks.get(key);calls++;let content='RESULT';
   if(request.appContext.includes('平台网名初始化工具')){if(namingError)throw Error('offline');const accounts=JSON.parse(request.messages[0].content.split('\n').slice(1).join('\n'));content=JSON.stringify({accounts:accounts.map(a=>({accountId:a.accountId,displayName:'nightfilm'}))});}
   const task={taskId:key,status:'completed',result:{content}};tasks.set(key,task);return task;},async getTask({taskId}){return tasks.get(taskId);},async consumeTask({taskId,writes}){const task=tasks.get(taskId);if(task.status==='consumed')return {applied:false};for(const w of writes)db.set(w.collection+'.'+w.id,structuredClone(w.value));task.status='consumed';consumes++;return {applied:true};}},
 memory:{async searchSource(s){const k=scopeKey(s);return {revision:revisions.get(k)||0,entries:[...(memories.get(k)||new Map()).values()]};},async invalidateSource(s){const k=scopeKey(s),r=(revisions.get(k)||0)+1;revisions.set(k,r);memories.delete(k);return {revision:r};},async writeSource(s){const k=scopeKey(s);assert.equal(s.expectedRevision,revisions.get(k)||0);const entries=memories.get(k)||new Map();const existing=entries.get(s.evidenceId);if(existing)assert.equal(existing.content,s.content);entries.set(s.evidenceId,{content:s.content});memories.set(k,entries);}}
}};
const storage=require(src+'adapters/storage.ts'),identity=require(src+'adapters/identity.ts'),chars=require(src+'adapters/characters.ts'),ids=require(src+'identity/accounts.ts'),disclosure=require(src+'identity/disclosure.ts'),task=require(src+'adapters/tasks.ts'),memory=require(src+'adapters/memory.ts'),nativeStorage=require(src+'fork/lib/xiaohongshu-storage.ts');
await storage.hydrate();identity.initIdentity();await chars.initializeCharacters();identity.setUserProfile('moth');
await test('one batch initializes multiple characters and resolves collisions',async()=>{
 const before=calls;await chars.initializeNicknames(chars.loadCharacters().map(c=>c.id));assert.equal(calls-before,1);assert.deepEqual(chars.loadCharacters().map(c=>c.name),['nightfilm','nightfilm_2']);
 const text=JSON.stringify(lastRequest.messages);for(const no of ['Krueger','Soap','Chloe','PRIVATE_AVATAR','private-a','private-b','ownerId','ownerKind'])assert(!text.includes(no),no);
 assert.equal(chars.loadCharacters()[0].avatar,'PRIVATE_AVATAR_A');
});
await test('stable bindings survive rename and historical names',()=>{
 const a=chars.loadCharacters()[0];chars.editNickname(a.id,'deadchannel');assert.equal(chars.loadCharacters()[0].id,a.id);assert.equal(identity.accountByName('nightfilm').accountId,a.id);
});
await test('temporary batch failure is non-blocking and a later background retry succeeds',async()=>{
 characters.push({id:'private-c',name:'Zimo',persona:'A thoughtful artist.',avatar:'PRIVATE_AVATAR_C'});await chars.initializeCharacters();
 const pending=chars.loadCharacters().at(-1),realTimer=global.setTimeout;let retry;
 global.setTimeout=(fn)=>{retry=fn;return 1;};namingError=true;
 try{await chars.initializeNicknames([pending.id]);assert(retry);assert.equal(chars.loadCharacters().at(-1).id,pending.id);assert(!chars.loadCharacters().at(-1).name.includes('Zimo'));}
 finally{global.setTimeout=realTimer;namingError=false;}
 await chars.initializeNicknames([pending.id]);assert.equal(chars.loadCharacters().at(-1).id,pending.id);assert.equal(chars.loadCharacters().at(-1).name,'nightfilm_3');retry();
});
await test('public DTO has no private identity or UI avatar',()=>{
 const payload=JSON.stringify(identity.publicContext('private-a'));for(const no of ['private-a','private-b','ownerId','ownerKind','ActorBinding','PRIVATE_AVATAR','Krueger','Soap','Chloe'])assert(!payload.includes(no));
 const ctx=identity.publicContext('private-a');assert.equal(ctx.identities.find(a=>a.accountId===chars.loadCharacters()[1].id).realWorldIdentity,'unknown');
});
await test('disclosure is viewer-local, revoke invalidates source and never resurrects',async()=>{
 const s=identity.identity(),account=s.userAccountId;
 await disclosure.confirmDisclosure(s,'private-a',account,'Chloe');assert.equal(identity.publicContext('private-a').identities.find(a=>a.accountId===account).realWorldIdentity.identity,'Chloe');assert.equal(identity.publicContext('private-b').identities.find(a=>a.accountId===account).realWorldIdentity,'unknown');
 await disclosure.revokeDisclosure(s,'private-a',account);assert.equal(identity.publicContext('private-a').identities.find(a=>a.accountId===account).realWorldIdentity,'unknown');assert.equal((await window.AiPhone.memory.searchSource({viewerCharacterId:'private-a',sourceNamespace:'identity_disclosure',sourceEntityId:account})).entries.length,0);
});
await test('durable raw results are consumed once and replay does not resend',async()=>{
 const req={characterId:'private-a',contextPolicy:{},appContext:'safe',messages:[{role:'user',content:'test'}]};const before=calls,c=consumes;
 assert.equal(await task.durableRaw(req,'replay-test','v1'),'RESULT');assert.equal(await task.durableRaw(req,'replay-test','v1'),'RESULT');assert.equal(calls-before,1);assert.equal(consumes-c,1);
 await assert.rejects(task.durableRaw(req,'replay-test','v2'),/身份知识已更新/);
});
await test('durable errors preserve machine-readable provider classification',async()=>{
 tasks.set('structured-error-test',{taskId:'structured-error-test',status:'failed',error:'image unsupported',errorCode:'MULTIMODAL_UNSUPPORTED'});
 await assert.rejects(task.durableRaw({contextPolicy:{},appContext:'safe',messages:[{role:'user',content:'test'}]},'structured-error-test'),error=>error.code==='MULTIMODAL_UNSUPPORTED');
});
await test('double clicks cannot create overlapping journals',async()=>{
 assert.equal(await task.beginAction('test',{},[]),true);const value=task.actionUuid();assert.equal(await task.beginAction('test',{},[]),false);assert(value.includes(task.pendingAction().id));await task.finishAction();assert.equal(task.pendingAction(),null);
});
await test('source subjects use explicit accountIds, never substring guessing',async()=>{
 const viewer=chars.loadCharacters()[0].id,a=identity.createAccount('小A'),b=identity.createAccount('小AB');identity.saveIdentity();
 memory.publishEventProjection(viewer,{id:'evt_1',content:'小AB 发了摄影笔记',timestamp:'now',noteId:'n1',subjectIds:[b.accountId]});await memory.flushMemories();
 assert.equal((await window.AiPhone.memory.searchSource({viewerCharacterId:'private-a',sourceNamespace:'social_posts',sourceEntityId:a.accountId})).entries.length,0);
 assert.equal((await window.AiPhone.memory.searchSource({viewerCharacterId:'private-a',sourceNamespace:'social_posts',sourceEntityId:b.accountId})).entries.length,1);
 memory.publishEventProjection(viewer,{id:'evt_2',content:'小AB 发了做饭笔记',timestamp:'now',noteId:'n2',subjectIds:[b.accountId]});await memory.flushMemories();
 memory.removeEventProjections({noteId:'n1'});await memory.flushMemories();
 const active=await window.AiPhone.memory.searchSource({viewerCharacterId:'private-a',sourceNamespace:'social_posts',sourceEntityId:b.accountId});assert.equal(active.entries.length,1);assert(active.entries[0].content.includes('做饭'));assert.equal(active.revision,1);
 memory.publishEventProjection(viewer,{id:'evt_1',content:'小AB 发了摄影笔记',timestamp:'now',noteId:'n1',subjectIds:[b.accountId]});await memory.flushMemories();assert.equal((await window.AiPhone.memory.searchSource({viewerCharacterId:'private-a',sourceNamespace:'social_posts',sourceEntityId:b.accountId})).entries.length,1);
});
await test('independent platform storage keeps original schema and graph semantics',()=>{
 const state=nativeStorage.createDefaultXiaohongshuState(),note=nativeStorage.createUserXiaohongshuNote({title:'range',body:'ten rounds',tags:[]},state.profile);state.notes=[note];const saved=nativeStorage.saveXiaohongshuState(state);assert.equal(saved.notes[0].authorId,identity.userAccount().accountId);assert.equal(saved.profile.nickname,'moth');assert.deepEqual(nativeStorage.loadXiaohongshuState().settings,state.settings);
});
await test('guard defines behavior only, never embeds private mapping',()=>{for(const no of ['ownerId','ownerKind','ActorBinding','Krueger','Chloe','kk'])assert(!ids.PROTECTED_RULE.includes(no));assert(ids.PROTECTED_RULE.includes('explicitly_disclosed'));});
await storage.flush();
fs.mkdirSync('scripts/anonymous-xhs-phase0/evidence-source',{recursive:true});fs.writeFileSync('scripts/anonymous-xhs-phase0/evidence-source/unit-results.json',JSON.stringify({checks,tests:results},null,2));
console.log(`${checks} source-fork checks passed.`);
