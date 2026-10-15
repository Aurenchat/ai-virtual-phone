'use strict';
// Execute the real React panel in a fresh browser context. Engine reports come from
// the real synthetic pipeline regression; UI-only seams control latency and failures.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),ts=require('typescript');
async function main(){
 const repo=path.resolve(__dirname,'..'),temp=await fs.mkdtemp(path.join(os.tmpdir(),'float-protocol-ui-'));
 const reports=await require('./test-protocol-audit-integration.cjs').run();
 const source=await fs.readFile(path.join(repo,'components/debug-prompt-panel.tsx'),'utf8');
 const ast=ts.createSourceFile('panel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),swaps=[];
 for(const stmt of ast.statements){
  if(!ts.isImportDeclaration(stmt)||stmt.importClause?.isTypeOnly)continue;
  const id=stmt.moduleSpecifier.text;
  if(!id.startsWith('@/')||id.endsWith('/chat-protocol-audit')||id.endsWith('/chat-request-failure-diagnostics'))continue;
  const names=stmt.importClause?.namedBindings?.elements?.filter(n=>!n.isTypeOnly).map(n=>(n.propertyName||n.name).text)||[];
  if(!names.length)continue;
  const file=path.join(temp,'mock-'+swaps.length+'.ts');
  await fs.writeFile(file,names.map(n=>['EXTRA_PROMPT_APPS','CHECKPHONE_APP_SPECS'].includes(n)?`export const ${n}=[];`:n==='CHAT_APP_SETTINGS_UPDATED_EVENT'?`export const ${n}='chat-app-settings-updated';`:n==='ChatEngineError'?`export class ChatEngineError extends Error {}`:`export const ${n}=(...args:any[])=>(window as any).__ui.functions[${JSON.stringify(n)}](...args);`).join('\n'));
  swaps.push([id,file]);
 }
 const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import {DebugPromptPanel} from ${JSON.stringify(path.join(repo,'components/debug-prompt-panel.tsx'))};
 import {captureFailedProviderRequest,formatFailedProviderRequestReport} from ${JSON.stringify(path.join(repo,'lib/chat-request-failure-diagnostics.ts'))};
 const w=window as any;const listeners=new Set<()=>void>();
 const sessions=[{id:'s1',contactId:'c1',updatedAt:'2026-10-15'},{id:'s2',contactId:'c2',updatedAt:'2026-10-15'},{id:'group',isGroup:true,participantIds:['c1'],groupName:'Fixture group',updatedAt:'2026-10-15'}];
 const chars=[{id:'c1',name:'Krueger synthetic'},{id:'c2',name:'Other synthetic'}];
 const dock={primaryTool:'prompt-viewer',isDocked:false,isExpanded:true,anchorPosition:{left:18,top:600},dockSide:'left'};
 const u=w.__ui={reports:${JSON.stringify(reports)},mode:'ok',calls:[],previewCalls:0,snapshot:null,pending:null,clipboard:[],fallback:[],writes:[],settings:{promptViewerEnabled:true,floatingDockEnabled:true,quickActionEnabled:true},dock};
 u.captureFailure=(id:string,status:number)=>captureFailedProviderRequest({providerKind:'openai-compatible',body:{messages:[{role:'user',content:'PRIVATE_PROMPT'},{role:'assistant',content:'PRIVATE_VISIBLE'},{role:'assistant',tool_calls:[{id:'PRIVATE_CALL_ID',function:{name:'PRIVATE_TOOL',arguments:'PRIVATE_ARGS'}}]},{role:'tool',tool_call_id:'PRIVATE_CALL_ID',content:'PRIVATE_RESULT'}]}},{sessionId:id,phase:'http_status',httpStatus:status});
 const noop=()=>{};const functions:any={
 getDebugChatState:()=>null,getDebugPromptSnapshot:()=>u.snapshot,subscribeDebugChatState:()=>noop,subscribeDebugPromptSnapshot:(fn:any)=>{listeners.add(fn);return()=>listeners.delete(fn);},
 getFloatingDockState:()=>dock,subscribeFloatingDockState:()=>noop,expandFloatingDock:noop,collapseFloatingDock:noop,setFloatingDockAnchor:noop,setActiveFloatingTool:noop,
 loadChatAppSettings:()=>u.settings,hydrateChatStorage:async()=>{},loadChatSessions:()=>sessions,loadCharacters:()=>chars,
 loadChatMessages:(id:string)=>[{id:'fixture',sessionId:id,role:'user',content:'PRIVATE_BODY'.repeat(42000)}],loadChatContacts:()=>[],getWeekStartIso:()=> '2026-10-12',
 resolveUserIdentity:()=>({name:'Fixture user'}),loadBooks:()=>[],loadMapWorlds:()=>[],getAllPosts:()=>[],loadStorySessions:()=>[],loadVnSessions:()=>[],loadDiaryEntries:()=>[],
 auditChatPromptRequest:async(s:any,h:any[])=>{u.calls.push({session:s.id,count:h.length});if(u.mode==='fail')throw new Error('Load failed');if(u.mode==='pending')return new Promise((resolve,reject)=>u.pending={resolve,reject});return u.reports['100000-native'];},
 previewPromptRequestSnapshot:async(s:any)=>{u.previewCalls++;u.snapshot={id:'preview',sessionId:s.id,appId:'chat',messages:[{role:'user',content:'Existing preview works'}],characterName:'Fixture',model:'fixture',presetName:'fixture'};listeners.forEach(fn=>fn());},
 };
 u.functions=new Proxy(functions,{get:(o,k)=>k in o?o[k]:(...args:any[])=>{throw new Error('Unmocked UI dependency '+String(k));}});
 createRoot(document.getElementById('app')!).render(<DebugPromptPanel/>);`;
 await fs.writeFile(path.join(temp,'entry.tsx'),entry);
 const wp=require('next/dist/compiled/webpack/webpack');wp.init();
 await new Promise((resolve,reject)=>wp.webpack({mode:'development',target:'web',devtool:false,context:repo,entry:path.join(temp,'entry.tsx'),output:{path:temp,filename:'fixture.js'},
 resolve:{extensions:['.ts','.tsx','.js'],alias:{'@':repo},modules:[path.join(repo,'node_modules')]},
 module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(repo,'scripts/anonymous-xhs-phase0/ts-loader.cjs')}]},
 plugins:[...swaps.map(([id,file])=>new wp.webpack.NormalModuleReplacementPlugin(new RegExp('^'+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'),r=>r.request=file)),new wp.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})]},(e,s)=>e||s.hasErrors()?reject(e||Error(s.toString({all:false,errors:true}))):resolve()));
 const css=(await fs.readFile(path.join(repo,'styles/base.css'),'utf8'))+'\n'+(await fs.readFile(path.join(repo,'styles/components.css'),'utf8'));
 const server=http.createServer(async(req,res)=>{if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(path.join(temp,'fixture.js')));}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><style>:root{--c-text:#222;--c-bg:#fff;--c-card:#fff;--c-border:#bbb;--c-sub:#555;--c-accent:#467}body{font-family:system-ui}.pv-panel{background:white}</style><button id="plugin-fixture">Existing plugin fixture</button><div id="app"></div><script src="/fixture.js"></script>');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 let checks=0;const check=(name,value)=>{assert(value,name);checks++;console.log('PASS UI '+name);};
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('button',{name:'打开提示词查看器'}).waitFor();
  await page.evaluate(()=>{localStorage.setItem('sentinel','PRIVATE_PERSISTED');const native=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){window.__ui.writes.push(args[0]);return native.apply(this,args);};Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>window.__ui.clipboard.push(t)}});});
  await page.getByRole('button',{name:'打开提示词查看器'}).click();
  const audit=()=>page.getByRole('button',{name:'一键诊断',exact:true}),report=()=>page.getByRole('region',{name:'聊天协议诊断报告'}),select=()=>page.locator('.pv-toolbar select').first();
  await audit().click();await report().waitFor();
  check('bounded content-free report at mobile viewport',(await report().innerText()).length<6000&&!(await page.locator('body').innerText()).includes('PRIVATE_BODY'));
  check('diagnosis leaves Prompt preview unopened',await page.evaluate(()=>window.__ui.previewCalls===0));
  check('scrollable report max height',await report().evaluate(e=>e.getBoundingClientRect().height<=261&&getComputedStyle(e).overflowY==='auto'));
  await page.getByRole('button',{name:'复制报告',exact:true}).click();await page.getByRole('button',{name:'已复制',exact:true}).waitFor();
  check('Clipboard API contains report only',await page.evaluate(()=>window.__ui.clipboard.length===1&&!window.__ui.clipboard[0].includes('PRIVATE')));
  await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('denied');};document.execCommand=(command)=>{window.__ui.fallback.push(document.activeElement.value);return command==='copy';};});
  await page.getByRole('button',{name:'已复制',exact:true}).click();
  check('WKWebView copy fallback removes textarea',await page.evaluate(()=>window.__ui.fallback.length===1&&document.querySelectorAll('textarea').length===0));
  await page.evaluate(()=>document.execCommand=()=>false);await page.getByRole('button',{name:'已复制',exact:true}).click();await page.getByText('复制失败；可长按下方报告手动复制。').waitFor();
  check('copy failure retains selectable report',await report().locator('pre').evaluate(e=>getComputedStyle(e).userSelect==='text'));
  await page.getByRole('button',{name:'预览 Prompt',exact:true}).click();await page.getByText('Existing preview works').waitFor();
  check('existing preview and diagnosis coexist',await report().isVisible());
  await select().selectOption('group');check('group diagnosis disabled',await audit().isDisabled());check('switch clears prior report',await report().count()===0);
  await select().selectOption('s1');await page.evaluate(()=>window.__ui.mode='pending');await audit().click();
  check('in-flight diagnosis button disabled',await page.getByRole('button',{name:'诊断中...'}).isDisabled());
  const count=await page.evaluate(()=>window.__ui.calls.length);
  await page.getByRole('button',{name:'诊断中...'}).evaluate(e=>{e.click();e.click();});check('rapid repeated clicks issue one diagnosis',await page.evaluate(()=>window.__ui.calls.length)===count);
  await select().selectOption('s2');await page.evaluate(()=>window.__ui.pending.resolve(window.__ui.reports['100000-native']));await page.waitForFunction(()=>!document.body.innerText.includes('诊断中'));
  check('switch discards stale success',await report().count()===0);
  await page.evaluate(()=>window.__ui.mode='pending');await audit().click();await page.getByRole('button',{name:'朋友圈',exact:true}).click();await page.evaluate(()=>window.__ui.pending.reject(Error('stale failure')));
  await page.getByRole('button',{name:'聊天',exact:true}).click();check('mode switch discards stale rejection',await report().count()===0);
  await page.evaluate(()=>window.__ui.mode='fail');await audit().click();await page.getByText('Load failed',{exact:true}).waitFor();check('Load failed releases busy state',await audit().isEnabled());
  await page.evaluate(()=>window.__ui.mode='ok');await audit().click();await report().locator('pre').waitFor();check('retry after Load failed succeeds',!(await report().innerText()).includes('Load failed'));
  await page.screenshot({path:path.join(temp,'diagnostic-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'关闭提示词查看器'}).click();await page.getByRole('button',{name:'打开提示词查看器'}).click();check('floating button reopens panel',await audit().isVisible());
  await page.getByRole('button',{name:'关闭提示词查看器'}).click();check('plugin fixture remains usable',await page.locator('#plugin-fixture').isVisible());await page.locator('#plugin-fixture').click();
  check('persistent sentinel untouched and no storage writes',await page.evaluate(()=>localStorage.getItem('sentinel')==='PRIVATE_PERSISTED'&&window.__ui.writes.length===0));
  await page.evaluate(()=>window.__ui.captureFailure('s1',400));
  await page.getByRole('button',{name:'打开提示词查看器'}).click();await select().selectOption('s1');await audit().click();await report().locator('pre').waitFor();
  check('stored HTTP 400 and suspect adjacency appear in selected session',/HTTP 400/.test(await report().innerText())&&/CALL_AFTER_ASSISTANT/.test(await report().innerText()));
  await page.evaluate(()=>navigator.clipboard.writeText=async t=>window.__ui.clipboard.push(t));
  await page.getByRole('button',{name:'复制报告',exact:true}).click();await page.getByRole('button',{name:'已复制',exact:true}).waitFor();
  check('clipboard combines current structural report with captured failure',await page.evaluate(()=>{const t=window.__ui.clipboard.at(-1);return t.includes('HTTP 400')&&t.includes('Float 聊天工具协议只读诊断')&&!t.includes('PRIVATE_')&&!t.includes('s1');}));
  await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('denied');};document.execCommand=(command)=>{window.__ui.fallback.push(document.activeElement.value);return command==='copy';};});
  await page.getByRole('button',{name:'已复制',exact:true}).click();
  check('clipboard fallback also includes captured failure',await page.evaluate(()=>window.__ui.fallback.at(-1).includes('HTTP 400')));
  await select().selectOption('s2');await audit().click();await report().locator('pre').waitFor();
  check('different session cannot see prior failure',!/HTTP 400/.test(await report().innerText())&&/暂无记录/.test(await report().innerText()));
  await page.evaluate(()=>window.__ui.captureFailure('s2',503));await audit().click();await report().locator('pre').waitFor();
  check('HTTP 503 remains separate from HTTP 400',/HTTP 503/.test(await report().innerText())&&!/HTTP 400/.test(await report().innerText()));
  check('only dedicated diagnostic key is written',await page.evaluate(()=>window.__ui.writes.length===2&&window.__ui.writes.every(k=>k==='float:chat-request-failures:v1')&&localStorage.getItem('sentinel')==='PRIVATE_PERSISTED'));
  await page.reload();await page.getByRole('button',{name:'打开提示词查看器'}).click();await select().selectOption('s1');await audit().click();await report().locator('pre').waitFor();
  check('failure ring survives reload',/HTTP 400/.test(await report().innerText()));
  await page.screenshot({path:path.join(temp,'diagnostic-mobile.png'),fullPage:true});
  await report().evaluate(e=>e.scrollTop=e.scrollHeight);
  await page.screenshot({path:path.join(temp,'failure-report-mobile.png'),fullPage:true});
  check('no browser runtime errors',errors.length===0);
  console.log(JSON.stringify({checks,screenshot:path.join(temp,'diagnostic-mobile.png'),failureScreenshot:path.join(temp,'failure-report-mobile.png'),scope:'real React component with synthetic engine seam; not IPA device evidence'}));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
