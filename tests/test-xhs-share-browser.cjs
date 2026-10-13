'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),ts=require('typescript');
async function main(){
 const repo=path.resolve(__dirname,'..'),temp=await fs.mkdtemp(path.join(os.tmpdir(),'xhs-share-browser-'));
 const engine=await fs.readFile(path.join(repo,'lib/xiaohongshu-engine.ts'),'utf8'),ast=ts.createSourceFile('engine.ts',engine,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 let reaction;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='applyCharacterReaction')reaction=n.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert(reaction);
 const native='import {makeXiaohongshuComment,makeXiaohongshuNotification,addNames} from '+JSON.stringify(path.join(repo,'lib/xiaohongshu-storage'))+';\nimport {resolveCharacterXiaohongshuDisplayName} from '+JSON.stringify(path.join(repo,'lib/xiaohongshu-character-profile'))+';\n'+reaction;
 await fs.writeFile(path.join(temp,'native.ts'),native);
 await fs.writeFile(path.join(temp,'role.ts'),'export const loadCharacters=()=>[{id:"role",name:"Fixture role"}];');
 await fs.writeFile(path.join(temp,'summary.ts'),'export const maybeRunSummarization=async()=>{(window as any).summaryCalls++;};');
 await fs.writeFile(path.join(temp,'time.ts'),'export const formatChatTimestamp=(s:string)=>s;');
 const entry=[
 'import * as kv from '+JSON.stringify(path.join(repo,'lib/kv-db'))+';',
 'import * as chat from '+JSON.stringify(path.join(repo,'lib/chat-storage'))+';',
 'import {chatDb} from '+JSON.stringify(path.join(repo,'lib/chat-db'))+';',
 'import * as share from '+JSON.stringify(path.join(repo,'lib/xiaohongshu-chat-share'))+';',
 'import {commitXhsShareActions} from '+JSON.stringify(path.join(repo,'lib/xiaohongshu-chat-share-commit'))+';',
 'import * as assets from '+JSON.stringify(path.join(repo,'lib/xiaohongshu-image-assets'))+';',
 'import {loadXiaohongshuState} from '+JSON.stringify(path.join(repo,'lib/xiaohongshu-storage'))+';',
 'const w=window as any,key="ai_phone_xiaohongshu_state_v1";w.summaryCalls=0;w.updates=[];w.failures=[];',
 'window.addEventListener("xiaohongshu-updated",(e:any)=>w.updates.push({detail:e.detail,state:loadXiaohongshuState()}));',
 'async function seed(){const images:string[]=[];for(let i=0;i<9;i++){const c=document.createElement("canvas");c.width=90;c.height=160;const x=c.getContext("2d")!;x.fillStyle=["red","green","blue"][i%3];x.fillRect(0,0,90,160);const b=await new Promise<Blob>(r=>c.toBlob(b=>r(b!)));const thumb=await assets.makeXiaohongshuThumbnail(b);images.push(await assets.saveXiaohongshuImagePair(b,thumb.blob));c.width=c.height=0;}',
 'const comment={id:"target",noteId:"note",authorType:"npc",authorId:"npc",authorName:"NPC",text:"Original target",createdAt:"2026-10-13",likeCount:2,dislikeCount:0,liked:true,disliked:false};',
 'const note={id:"note",type:"post",source:"user",authorId:"user",authorName:"Poster",title:"Native post",body:"Full native body",tags:["real-tag"],createdAt:"2026-10-13",updatedAt:"old",imageAssetIds:images,imageAssetId:images[0],comments:[comment],commentCount:1,likeCount:2,saveCount:1,liked:true,saved:true,recentLikeNames:[],recentSaveNames:[],coverIcon:"X",tone:"ivory"};',
 'await kv.kvUpdateAtomic(key,()=>({value:JSON.stringify({notes:[note,{...note,id:"other",comments:[]}],notifications:[],profile:{},settings:{}}),result:null}));',
 'await chatDb.sessions.put({id:"session",contactId:"role",updatedAt:"now",unreadCount:0});',
 'await chat.hydrateChatStorage();const post=(msg:any)=>new Promise<any>(resolve=>{let confirmed:Promise<boolean>;const saved=chat.pushChatMessage(msg,{onMessageCommit:p=>confirmed=p});confirmed!.then(ok=>resolve({ok,saved}));});',
 'await post({id:"share",sessionId:"session",role:"user",content:"short reference",mediaType:"xiaohongshu_note_share",mediaData:{xiaohongshuNoteId:"note",xiaohongshuTitle:"Native post"}});',
 'await post({id:"reply",sessionId:"session",role:"assistant",content:"Saved chat reply"});return note;}',
 'w.test={kv,chat,chatDb,share,commitXhsShareActions,assets,key,seed,pending:(action:any,turnId:string)=>({shareMessageId:"share",noteId:"note",allowedReplyIds:["target"],turnId,action:{like:false,save:false,replies:[],...action}}),',
 'apply(pending:any,isActive=()=>true){return commitXhsShareActions({sessionId:"session",characterId:"role",responseMessageId:"reply",pending,isActive});},async state(){return JSON.parse((await kv.kvReadFresh(key))!);}};',
 'kv.registerKvMigration(key);kv.hydrateKvDb().then(()=>w.ready=true);'
 ].join('\n');
 await fs.writeFile(path.join(temp,'entry.ts'),entry);
 const wp=require('next/dist/compiled/webpack/webpack');wp.init();
 const swaps=[[/xiaohongshu-engine$/,path.join(temp,'native.ts')],[/character-storage$/,path.join(temp,'role.ts')],[/memory-summarizer$/,path.join(temp,'summary.ts')],[/llm-prompt-assembler$/,path.join(temp,'time.ts')]];
 await new Promise((resolve,reject)=>wp.webpack({mode:'development',target:'web',devtool:false,context:repo,entry:path.join(temp,'entry.ts'),output:{path:temp,filename:'fixture.js'},
 resolve:{extensions:['.ts','.tsx','.js'],alias:{'@':repo},modules:[path.join(repo,'node_modules')],fallback:{fs:false,path:false,crypto:false}},
 module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(repo,'scripts/anonymous-xhs-phase0/ts-loader.cjs')}]},
 plugins:[...swaps.map(([pattern,to])=>new wp.webpack.NormalModuleReplacementPlugin(pattern,r=>r.request=to)),new wp.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})]},(e,s)=>e||s.hasErrors()?reject(e||Error(s.toString({all:false,errors:true}))):resolve()));
 const server=http.createServer(async(req,res)=>{try{if(/^\/[\w.-]+\.js$/.test(req.url)){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(path.join(temp,path.basename(req.url))));}else{res.setHeader('Content-Type','text/html');res.end('<meta charset="utf-8"><script>window.process={env:{NODE_ENV:"development"}};window.unhandled=[];addEventListener("unhandledrejection",e=>unhandled.push(String(e.reason)));</script><script src="/fixture.js"></script>');}}catch(e){res.statusCode=500;res.end(String(e));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
 let checks=0;const check=(s,v)=>{assert(v,s);checks++;console.log('PASS '+s);};
 try{
  const ctx=await browser.newContext(),page=await ctx.newPage(),other=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+server.address().port;await page.goto(url);await page.waitForFunction(()=>window.ready);await page.evaluate(()=>test.seed());
  const prepared=await page.evaluate(async()=>{const m=await test.chatDb.messages.get("share"),prompt=await test.share.buildXhsSharePromptForChat(m,true);return {message:m,parts:prompt[0].content,events:test.kv.kvKeysWithPrefix("ai_phone_xiaohongshu_events_")};});
  check('actual ChatDB card has only reference/summary, no post/comment/HD bytes',!JSON.stringify(prepared.message).includes('base64')&&!JSON.stringify(prepared.message).includes('Full native body')&&!prepared.message.mediaData.imageAssetIds);
  check('real nine-image media conversion enters ordered visual payload',prepared.parts.filter(p=>p.type==='image_url').length===9&&prepared.parts.filter(p=>p.type==='text'&&p.text.startsWith('[笔记图片')).every((p,i)=>p.text==='[笔记图片 '+(i+1)+'/9]'));
  check('reading creates no native memory event',prepared.events.length===0);
  await page.evaluate(()=>test.chatDb.messages.delete("reply"));
  const failed=await page.evaluate(()=>test.apply(test.pending({comment:"must not save"},"no-durable-reply")));
  check('cache-visible but uncommitted/deleted durable reply cannot trigger actions',!failed.applied&&(await page.evaluate(()=>test.state())).notes[0].commentCount===1);
  await page.evaluate(()=>test.chatDb.messages.put(test.chat.loadChatMessages("session").find(m=>m.id==="reply")));
  await other.goto(url);await other.waitForFunction(()=>window.ready);
  await other.evaluate(()=>test.kv.kvUpdateAtomic(test.key,raw=>{const s=JSON.parse(raw);s.notes[1].body="other-tab edit";s.notes[0].likeCount=20;return {value:JSON.stringify(s),result:null};}));
  const result=await page.evaluate(()=>test.apply(test.pending({like:true,save:true,comment:"today comment",replies:[{targetCommentId:"target",text:"today reply"}]},"combined")));
  const state=await page.evaluate(()=>test.state());
  check('atomic fresh update preserves another tab changes and user flags',result.applied&&state.notes[1].body==='other-tab edit'&&state.notes[0].likeCount===21&&state.notes[0].liked&&state.notes[0].saved);
  check('native comments/replies use actual actor, parent ID and updated counts',state.notes[0].commentCount===3&&state.notes[0].comments.slice(1).every(c=>c.authorType==='character'&&c.authorId==='role')&&state.notes[0].comments[2].replyToCommentId==='target');
  check('native notifications and social-only UI event fire after commit',state.notifications.length===4&&await page.evaluate(()=>updates.length===1&&updates[0].detail.socialOnly&&updates[0].state.notes[0].commentCount===3));
  const projected=await page.evaluate(()=>JSON.parse(test.kv.kvGet('ai_phone_xiaohongshu_events_role')));
  check('original native projection functions record today actual comment/reply only',projected.length===2&&projected.some(e=>e.id.startsWith('xiaohongshu_comment_'))&&projected.some(e=>e.id.startsWith('xiaohongshu_reply_'))&&projected.every(e=>e.timestamp!=="2026-10-13"));
  check('original summarization entry triggered once for combined text interaction',await page.evaluate(()=>summaryCalls===1));
  const duplicate=await page.evaluate(()=>test.apply(test.pending({comment:"duplicate"},"combined")));
  check('same generation remains idempotent across repeated commits',duplicate.duplicate&&(await page.evaluate(()=>test.state())).notes[0].commentCount===3);
  const before=JSON.stringify(await page.evaluate(()=>test.state()));
  const quota=await page.evaluate(async()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,...args){if(v?.key===test.key)throw new DOMException("fixture quota","QuotaExceededError");return put.call(this,v,...args);};try{return await test.apply(test.pending({comment:"failure"},"quota"));}finally{IDBObjectStore.prototype.put=put;}});
  check('social quota failure leaves saved chat reply and native archive intact',!quota.applied&&before===JSON.stringify(await page.evaluate(()=>test.state()))&&await page.evaluate(async()=>!!await test.chatDb.messages.get("reply")));
  const cancelled=await page.evaluate(()=>test.apply(test.pending({like:true},"cancelled"),()=>false));
  check('cancelled generation performs no social write',!cancelled.applied&&before===JSON.stringify(await page.evaluate(()=>test.state())));
  const busy=await page.evaluate(async()=>{const block=e=>e.preventDefault();window.addEventListener('xiaohongshu-before-share-commit',block);try{return await test.apply(test.pending({comment:'blocked'},'busy-native'));}finally{window.removeEventListener('xiaohongshu-before-share-commit',block);}});
  check('busy native writer rejects social commit without overwriting its archive',!busy.applied&&before===JSON.stringify(await page.evaluate(()=>test.state())));
  await page.reload();await page.waitForFunction(()=>window.ready);
  check('native social changes persist after browser reload',await page.evaluate(async()=>{const s=await test.state();return s.notes[0].comments.some(c=>c.text==="today reply");}));
  check('no browser exceptions/unhandled rejections',errors.length===0&&await page.evaluate(()=>unhandled.length===0));
  console.log('PASS: '+checks+' Chromium actual ChatDB/KV/media/native memory checks');await ctx.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
