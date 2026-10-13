'use strict';
// Fresh localhost origin/context only. Actual KvDB transactions; never opens production archives.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),ts=require('typescript');
async function main(){
 const repo=path.resolve(__dirname,'..'),temp=await fs.mkdtemp(path.join(os.tmpdir(),'xhs-reroll-browser-'));
 const source=await fs.readFile(path.join(repo,'components/xiaohongshu/xiaohongshu-app.tsx'),'utf8');
 const ast=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=name=>{let result;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)result=n;ts.forEachChild(n,walk);}walk(ast);assert(result,name);return result.getText(ast);};
 const entry=[
 'import React,{useState,useRef} from '+JSON.stringify(require.resolve('react'))+';',
 'import {createRoot} from '+JSON.stringify(require.resolve('react-dom/client'))+';',
 'import {flushSync} from '+JSON.stringify(require.resolve('react-dom'))+';',
 'import {Heart} from '+JSON.stringify(require.resolve('lucide-react'))+';',
 'import * as kv from '+JSON.stringify(path.join(repo,'lib/kv-db'))+';',
 'import * as api from '+JSON.stringify(path.join(repo,'lib/xiaohongshu-comment-regeneration'))+';',
 'const {applyXiaohongshuCommentRegeneration,commitXiaohongshuCommentRegeneration,contextForXiaohongshuCommentRegeneration,planXiaohongshuCommentRegeneration,readXiaohongshuCommentRegenerationState}=api;',
 'const w=window as any,key="ai_phone_xiaohongshu_state_v1",eventKey="ai_phone_xiaohongshu_events_character";',
 'const root=createRoot(document.getElementById("app")!);w.requests=[];w.failures=[];w.pending=[];',
 'kv.registerKvMigration(key);',
 'function XhsAvatar({name}:any){return <span>{name}</span>;} function CheckPhoneBilingualText({text}:any){return <span>{text}</span>;}',
 fn('formatCount'),fn('formatTime'),fn('XhsDislikeIcon'),fn('orderCommentsForDisplay'),fn('CommentList'),
 'async function generateXiaohongshuRegeneratedCommentText(note:any,item:any,_settings:any,includeVision:boolean){w.requests.push({id:item.id,note,includeVision});if(w.defer)await new Promise<void>(r=>w.pending.push(r));if(w.apiFailure)throw new Error("fixture API failed");return "new:"+item.id;}',
 'function View({initial}:any){const [state,setState]=useState(initial),[busy,setBusy]=useState("idle"),[regeneratingCommentId,setRegeneratingCommentId]=useState<string|null>(null),commentRegenerationInFlightRef=useRef(false);',
 'function clearErrorState(){} function handleGenerationError(e:any){w.failures.push(e.message)} function onNotice(){}',
 fn('handleRegenerateComment'),
 'return <div className="cp-xhs-note-comments"><CommentList comments={state.notes[0].comments} getAvatar={()=>undefined} onReply={()=>w.replies++} onDeleteComment={()=>w.deletes++} onVoteComment={()=>w.votes++} onRegenerateComment={c=>void handleRegenerateComment(c)} regenerationDisabled={busy!=="idle"} regeneratingCommentId={regeneratingCommentId} collapseBilingualTranslation={false}/></div>;}',
 'w.test={kv,api,key,eventKey,async seed(){const c=(id:string,authorType:string,parent?:string)=>({id,noteId:"n",authorType,authorId:authorType==="character"?"character":id,authorName:id,text:"old:"+id,replyToCommentId:parent,likeCount:4,dislikeCount:0,liked:true,disliked:false,createdAt:"old",unread:true});',
 'const state={notes:[{id:"n",type:"post",source:"user",authorName:"User",title:"fixture",body:"fixture",tags:[],likeCount:2,saveCount:3,commentCount:4,comments:[c("root","character"),c("b","npc","root"),c("u","user","root"),c("deep","npc","u")],createdAt:"old",updatedAt:"old"}],notifications:[{id:"notice",type:"comment",noteId:"n",actorName:"root",text:"old:root",createdAt:"old",unread:false}],settings:{},profile:{}};',
 'await kv.kvUpdateManyAtomic([key,eventKey],()=>({values:new Map([[key,JSON.stringify(state)],[eventKey,JSON.stringify([{id:"xiaohongshu_comment_root",noteId:"n",commentId:"root",timestamp:"old",content:"Role，评论：“old:root”。点赞：是，收藏：否。"}])]]),result:null}));',
 'w.requests=[];w.failures=[];w.defer=false;w.apiFailure=false;w.pending=[];flushSync(()=>root.render(<View key={Math.random()} initial={state}/>));return state;},release(){w.defer=false;w.pending.splice(0).forEach((r:any)=>r());},async dump(){return {state:await kv.kvReadFresh(key),event:await kv.kvReadFresh(eventKey)}}};',
 'kv.hydrateKvDb().then(()=>w.ready=true);'
 ].join('\n');
 await fs.writeFile(path.join(temp,'entry.tsx'),entry);
 await fs.writeFile(path.join(temp,'time.ts'),'export const formatChatTimestamp=(s:string)=>s;');
 const wp=require('next/dist/compiled/webpack/webpack');wp.init();
 await new Promise((resolve,reject)=>wp.webpack({mode:'development',target:'web',devtool:false,context:repo,entry:path.join(temp,'entry.tsx'),output:{path:temp,filename:'fixture.js'},
 resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':repo},modules:[path.join(repo,'node_modules')]},
 module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(repo,'scripts/anonymous-xhs-phase0/ts-loader.cjs')}]},
 plugins:[new wp.webpack.NormalModuleReplacementPlugin(/llm-prompt-assembler$/,r=>r.request=path.join(temp,'time.ts')),
 new wp.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})]},(e,s)=>e||s.hasErrors()?reject(e||Error(s.toString({all:false,errors:true}))):resolve()));
 const css=await fs.readFile(path.join(repo,'styles/xiaohongshu.css'),'utf8');
 const server=http.createServer(async(req,res)=>{try{
  if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(path.join(temp,'fixture.js')));}
  else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);}
  else{res.setHeader('Content-Type','text/html');res.end('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="app"></div><script>window.process={env:{NODE_ENV:"development"}};window.unhandled=[];addEventListener("unhandledrejection",e=>unhandled.push(String(e.reason)));</script><script src="/fixture.js"></script>');}
 }catch(e){res.statusCode=500;res.end(String(e));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const runtime=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE||runtime),browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
 let checks=0;const check=(s,v)=>{assert(v,s);checks++;console.log('PASS '+s);};
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),other=await ctx.newPage(),exceptions=[];
  page.on('pageerror',e=>exceptions.push(e.message));other.on('pageerror',e=>exceptions.push(e.message));
  const url='http://127.0.0.1:'+server.address().port;await page.goto(url);await page.waitForFunction(()=>window.ready);
  await page.evaluate(()=>test.seed());await other.goto(url);await other.waitForFunction(()=>window.ready);
  check('shared comment UI shows only AI reroll buttons, original reply/delete/vote actions present',
    await page.locator('.xhs-comment-reroll').count()===3&&await page.getByRole('button',{name:'回复',exact:true}).count()===4&&await page.getByRole('button',{name:'删除',exact:true}).count()===4&&await page.getByLabel('点赞评论',{exact:true}).count()===4);
  check('all descendants remain flat second-level cards',await page.locator('.cp-xhs-comment-card--depth-1').count()===3);
  await page.evaluate(()=>{defer=true;});await page.getByLabel('重新生成root的评论').click();await page.waitForFunction(()=>pending.length===1);
  check('loading feedback disables every reroll and preserves old text',await page.getByText('生成中…',{exact:true}).count()===1&&await page.locator('.xhs-comment-reroll:disabled').count()===3&&await page.getByText('old:root',{exact:true}).count()===1);
  await page.evaluate(()=>{document.querySelector('.xhs-comment-reroll').click();});check('repeated click produces one pending request',await page.evaluate(()=>requests.length===1));
  await page.evaluate(()=>test.release());await page.waitForFunction(()=>document.querySelector('.xhs-comment-reroll:not(:disabled)')&&document.body.textContent.includes('new:deep'));
  const result=await page.evaluate(()=>test.dump()),saved=JSON.parse(result.state),event=JSON.parse(result.event);
  check('real IndexedDB commits root and cross-user NPC descendants in place',saved.notes[0].comments.map(c=>c.text).join(',')==='new:root,new:b,old:u,new:deep'&&saved.notes[0].comments.every(c=>c.likeCount===4&&c.createdAt==='old'&&c.unread===true));
  check('notification and existing projection commit with comments, no duplicate entries',saved.notifications.length===1&&saved.notifications[0].text==='new:root'&&event.length===1&&event[0].timestamp==='old'&&event[0].content.includes('new:root'));
  const snapshot=await page.evaluate(()=>test.seed());
  const plan=await page.evaluate(()=>test.api.planXiaohongshuCommentRegeneration(JSON.parse(test.kv.kvGet(test.key)).notes[0],'root'));
  await other.evaluate(async()=>test.kv.kvUpdateAtomic(test.key,raw=>{const s=JSON.parse(raw);s.notes[0].comments[2].text='other-tab edit';return {value:JSON.stringify(s),result:null};}));
  const conflict=await page.evaluate(async({snapshot,plan})=>{try{await test.api.commitXiaohongshuCommentRegeneration(snapshot.notes[0],plan,new Map(plan.comments.map(c=>[c.id,'new:'+c.id])));return false;}catch(e){return /发生变化/.test(e.message);}}, {snapshot,plan});
  check('another tab edit is rejected despite stale local cache',conflict&&JSON.parse((await other.evaluate(()=>test.dump())).state).notes[0].comments[2].text==='other-tab edit');
  const before=await page.evaluate(async()=>{await test.seed();return test.dump();});
  const abort=await page.evaluate(async()=>{
   const snapshot=await test.api.readXiaohongshuCommentRegenerationState(),plan=test.api.planXiaohongshuCommentRegeneration(snapshot.notes[0],'root');
   const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){if(value?.key===test.eventKey)throw new DOMException('fixture quota','QuotaExceededError');return put.call(this,value,...args);};
   try{await test.api.commitXiaohongshuCommentRegeneration(snapshot.notes[0],plan,new Map(plan.comments.map(c=>[c.id,'new:'+c.id])));return false;}catch{return true;}finally{IDBObjectStore.prototype.put=put;}
  });
  const after=await page.evaluate(()=>test.dump());
  check('projection put failure rolls back already queued note/notification writes in same transaction',abort&&before.state===after.state&&before.event===after.event);
  await page.evaluate(()=>{apiFailure=true;});await page.getByLabel('重新生成root的评论').click();await page.waitForFunction(()=>failures.length===1);
  check('API failure leaves old comments visible and releases busy lock',await page.getByText('old:root',{exact:true}).count()===1&&await page.locator('.xhs-comment-reroll:not(:disabled)').count()===3);
  await page.reload();await page.waitForFunction(()=>window.ready);
  check('rejected changes stay rejected after page reload',await page.evaluate(async()=>{const s=JSON.parse(await test.kv.kvReadFresh(test.key));return s.notes[0].comments[0].text==='old:root';}));
  check('no browser exceptions or unhandled rejections',exceptions.length===0&&await page.evaluate(()=>unhandled.length===0));
  console.log('PASS: '+checks+' Chromium UI / fresh multi-tab IndexedDB / atomic rollback checks');await ctx.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
