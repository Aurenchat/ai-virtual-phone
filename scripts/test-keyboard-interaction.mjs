// Real Hook and ChatRoom, synthetic stores, local SSE only. No production data.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const repo=process.cwd(),require=createRequire(path.join(repo,'package.json'));
const output=process.env.KEYBOARD_EVIDENCE||await fs.mkdtemp(path.join(os.tmpdir(),'keyboard-guard-'));
await fs.mkdir(output,{recursive:true});
const wp=require('next/dist/compiled/webpack/webpack');wp.init();
await new Promise((resolve,reject)=>wp.webpack({mode:'development',target:'web',devtool:false,context:repo,entry:path.join(repo,'scripts/keyboard-interaction/fixture.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':repo},fallback:{fs:false,path:false,crypto:false}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(repo,'scripts/anonymous-xhs-phase0/ts-loader.cjs')}]},plugins:[new wp.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})]},(err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString({all:false,errors:true}))):resolve()));
console.log('Browser fixture compiled');
const css=(await require('postcss')([require('@tailwindcss/postcss')({base:repo})]).process(await fs.readFile(path.join(repo,'app/globals.css'),'utf8'),{from:path.join(repo,'app/globals.css')})).css;
const requests=[],streams=new Set();let hold=false;
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/fixture.js')res.end(await fs.readFile(path.join(output,'fixture.js')));
 else if(url.pathname==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);}
 else if(url.pathname.startsWith('/theme/')){try{res.end(await fs.readFile(path.join(process.env.KEYBOARD_THEME||path.join(repo,'themes/imessage-native-day'),path.basename(url.pathname))));}catch{res.writeHead(404);res.end();}}
 else if(url.pathname==='/collect.zip'&&process.env.KEYBOARD_COLLECT_ZIP)res.end(await fs.readFile(process.env.KEYBOARD_COLLECT_ZIP));
 else if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>html,body,#app{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="app"></div><script>window.process={env:{NODE_ENV:"development"}}</script><script src="/fixture.js"></script>');}
 else if(url.pathname==='/api/llm-proxy'||url.pathname==='/v1/chat/completions'){
  requests.push({path:url.pathname,at:Date.now()});res.setHeader('Content-Type','text/event-stream');res.setHeader('Cache-Control','no-cache');
  res.write('data: '+JSON.stringify({choices:[{delta:{content:'Synthetic stream continues'}}]})+'\n\n');
  const end=()=>res.end('data: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');
  if(hold){streams.add(end);res.on('close',()=>streams.delete(end));}else end();
 }else{res.writeHead(404);res.end();}
}catch(e){res.writeHead(500);res.end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({headless:true,channel:process.env.KEYBOARD_BROWSER||'msedge'});
const checks=[],errors=[];const check=(ok,label)=>{assert.ok(ok,label);checks.push(label);console.log('PASS '+label);};
const context=await browser.newContext({viewport:{width:402,height:874},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const realWait=ms=>new Promise(r=>setTimeout(r,ms));
const tick=async ms=>{await page.clock.runFor(ms);await realWait(40);};
const count=()=>page.evaluate(()=>window.keyboardTest.triggers());
const state=async patch=>{await page.evaluate(p=>window.keyboardTest.update(s=>({...s,...p})),patch);await tick(32);};
const scene=async(delay=2000,mode='probe',group=false)=>{await page.evaluate(({delay,mode,group})=>window.keyboardTest.scene(delay,mode,group),{delay,mode,group});await tick(120);};
const dismiss=()=>page.evaluate(()=>{const ta=document.querySelector('.chat-input-textarea');ta.focus();ta.blur();});
const signal=open=>page.evaluate(open=>document.querySelector('.chat-room-wrapper').dispatchEvent(new CustomEvent('float:chat-keyboard-interaction',{detail:{surface:'im-toolbar-test',open}})),open);
const click=selector=>page.evaluate(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);for(const type of ['pointerdown','pointerup'])el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',pointerId:3,isPrimary:true}));el.click();},selector);
const menuItem=label=>page.evaluate(label=>{const el=[...document.querySelectorAll('.chat-plus-menu-item')].find(e=>e.querySelector(':scope > span')?.textContent.trim()===label);if(!el)throw Error('Missing menu item '+label);el.click();},label);
const plus=()=>click('.im-plus');
const more=async()=>{await plus();await tick(32);await page.evaluate(()=>{const b=[...document.querySelectorAll('.im-toolbar-menu button')].find(e=>e.textContent==='更多功能');if(!b)throw Error('No native more');b.click();});await tick(32);};
const prepareChat=async(delay=2000,group=false)=>{await scene(delay,'chat',group);await page.evaluate(()=>{const ta=document.querySelector('.chat-input-textarea');const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;set.call(ta,'Synthetic new message');ta.dispatchEvent(new Event('input',{bubbles:true}));});await tick(32);await click('.chat-input-actions button[aria-label="发送"]');await tick(32);};
try{
 await page.goto(origin);await page.waitForFunction(()=>!!window.keyboardTest);await page.evaluate(()=>window.keyboardTest.init());
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
 for(let repeat=1;repeat<=2;repeat++)for(const delay of [0,2000,5000]){
  await scene(delay);await dismiss();await page.evaluate(()=>window.keyboardProbe.beginProtectedGesture());await tick(delay+1000);
  check(await count()===0,`${repeat}/${delay}: pointer held before menu blocks`);
  await state({interactionOpen:true});await page.evaluate(()=>window.keyboardProbe.endProtectedGesture());await tick(delay+600);
  check(await count()===0,`${repeat}/${delay}: menu holds indefinitely`);
  await state({interactionOpen:false});if(delay>100) {await tick(delay-100-32);check(await count()===0,`${repeat}/${delay}: full interval required`);await tick(100);}else await tick(1);
  check(await count()===1,`${repeat}/${delay}: exactly one restart`);
 }
 await scene();await dismiss();await tick(1500);await state({panelOpen:true});await state({panelOpen:false,interactionOpen:true});await tick(8000);check(await count()===0,'native panel -> rich modal handoff has no timer gap');await state({interactionOpen:false});await tick(1000);await signal(true);await tick(5000);check(await count()===0,'second interaction cancels restarted timer');await signal(false);await tick(1990);check(await count()===0,'plugin close needs full 2 seconds');await tick(20);check(await count()===1,'plugin close restarts once');
 await scene();await dismiss();await signal(true);await page.evaluate(()=>document.querySelector('.chat-input-textarea').focus());await signal(false);await tick(5000);check(await count()===0,'actual composer focus discards deferred intent');await page.evaluate(()=>document.querySelector('.chat-input-textarea').blur());await tick(2000);check(await count()===1,'new dismissal after composer focus triggers');
 for(const patch of [{pending:false},{generating:true},{active:false}]){await scene();await state(patch);await dismiss();await tick(3000);check(await count()===0,'eligibility '+JSON.stringify(patch));}
 await scene();await page.evaluate(()=>document.querySelector('.chat-input-textarea').value='draft');await dismiss();await tick(3000);check(await count()===0,'draft prevents automatic reply');
 await scene();await page.evaluate(()=>window.keyboardTest.enabled(false));await dismiss();await tick(3000);check(await count()===0,'disabled session never auto replies');
 await scene();await page.evaluate(()=>window.keyboardTest.chat.pushChatMessage({sessionId:window.keyboardTest.session(),role:'assistant',content:'Already replied'}));await dismiss();await tick(3000);check(await count()===0,'last assistant message prevents auto reply');
 await scene();await dismiss();await state({panelOpen:true});await page.evaluate(()=>window.keyboardTest.nextProbeSession());await tick(4000);check(await count()===0,'session switch clears paused intent and panel history');await dismiss();await tick(2100);check(await count()===1,'new session owns its own dismissal');
 await scene();await dismiss();await signal(true);await page.evaluate(()=>window.keyboardTest.leave());await tick(5000);check(await count()===0,'unmount cancels all waiting');
 // Real ChatRoom + actual toolbar plugin + synthetic local provider endpoint.
 for(let repeat=1;repeat<=2;repeat++){
  await prepareChat();const before=requests.length;await dismiss();await tick(1500);await plus();await tick(6000);check(requests.length===before,`${repeat}: iMessage injected menu blocks real ChatRoom`);await plus();await tick(1950);check(requests.length===before,`${repeat}: iMessage close waits full 2s`);await tick(150);await realWait(200);check(requests.length===before+1,`${repeat}: real ChatRoom replies once after menu close`);await tick(100);
 }
 for(const label of ['文字图片','系统指令','红包','转账','礼物','位置','语音条','照片墙']){
  await prepareChat();const before=requests.length;await dismiss();await tick(1000);await more();await menuItem(label);await tick(6000);check(requests.length===before,label+' dialog blocks');
  if(label==='照片墙') {await page.evaluate(()=>{const file=document.querySelector('input[type="file"]');file.dispatchEvent(new Event('cancel',{bubbles:true}));});await tick(5000);check(requests.length===before,'desktop picker cancel retains photo modal protection');}
  await page.evaluate(()=>{const overlay=document.querySelector('.modal-overlay');if(!overlay)throw Error('No modal');overlay.click();});await tick(1950);check(requests.length===before,label+' close waits 2s');await tick(150);await realWait(160);check(requests.length===before+1,label+' close replies once');await tick(100);
 }
 if(process.env.KEYBOARD_COLLECT_ZIP){await prepareChat();const before=requests.length;await dismiss();await more();await menuItem('分享收藏');await tick(6000);check(requests.length===before,'actual COLLECT panel blocks');check(await page.locator('.chat-custom-app-layer.is-panel').count()===1,'COLLECT share presentation is panel');await click('.chat-custom-app-close');await tick(1950);check(requests.length===before,'COLLECT cancel requires full 2s');await tick(150);await realWait(200);check(requests.length===before+1,'COLLECT cancel resumes full delay');}
 if(process.env.KEYBOARD_COLLECT_ZIP){
  await prepareChat();const before=requests.length;await dismiss();await more();await menuItem('分享收藏');await tick(1000);await realWait(200);
  const frame=page.frames().find(f=>f!==page.mainFrame());assert.ok(frame,'COLLECT iframe');
  for(const selector of ['[data-action="open-detail"][data-id="synthetic-treasure"]','[data-action="open-share"]','[data-action="send-share"]']) {await frame.locator(selector).evaluate(e=>e.click());await tick(100);await realWait(100);}
  check(await page.evaluate(()=>window.keyboardTest.chat.loadChatMessages(window.keyboardTest.session()).some(m=>m.mediaType==='app_card'&&m.content.includes('Synthetic test keepsake'))),'actual COLLECT sendCard persists synthetic shared card');
  await tick(5000);check(requests.length===before,'COLLECT sharing does not auto trigger while outer panel remains');await click('.chat-custom-app-close');await tick(2100);await realWait(200);check(requests.length===before+1,'COLLECT share then outer close resumes once');await tick(100);
  await prepareChat();const outfitBefore=requests.length;await dismiss();await more();await menuItem('我的穿着');await tick(2100);await realWait(180);check(requests.length===outfitBefore+1,'COLLECT outfit retains original panel-close semantics');await click('.chat-custom-app-close');await tick(100);
 }
 for(let repeat=1;repeat<=2;repeat++){
  await prepareChat();const before=requests.length;await dismiss();await tick(1800);
  await page.locator('[data-ui="bubble-user"]').last().dispatchEvent('pointerdown',{pointerType:'touch',pointerId:17,button:0,clientX:200,clientY:400});await tick(400);check(requests.length===before,`${repeat}: real long press blocks before 500ms`);await tick(150);check(await page.locator('.chat-floating-ctx-menu').count()===1,`${repeat}: 500ms menu opens`);await tick(4000);check(requests.length===before,`${repeat}: held long press cannot trigger`);await page.locator('[data-ui="bubble-user"]').last().dispatchEvent('pointerup',{pointerType:'touch',pointerId:17,button:0});
  await tick(100);await page.evaluate(()=>{const b=[...document.querySelectorAll('.ctx-menu-btn')].find(e=>e.textContent==='引用');if(!b)throw Error('Missing quote');for(const type of ['pointerdown','pointerup'])b.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',pointerId:4,isPrimary:true}));b.click();});await tick(1950);check(requests.length===before,`${repeat}: quote menu action waits full delay despite retained anchor`);await tick(150);await realWait(180);check(requests.length===before+1,`${repeat}: quote closes long-press protection`);await tick(100);
 }
 await prepareChat(2000,true);const groupBefore=requests.length;await dismiss();await more();await menuItem('转账');await tick(5000);check(requests.length===groupBefore,'group transfer target selection blocks');await click('.modal-overlay');await tick(2100);await realWait(180);check(requests.length===groupBefore+1,'group transfer cancel resumes');await tick(100);
 await prepareChat(0);let before=requests.length;await page.evaluate(()=>{const ta=document.querySelector('.chat-input-textarea');ta.focus();const b=document.querySelector('.im-plus');b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7,pointerType:'touch'}));ta.blur();b.click();b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7,pointerType:'touch'}));});await tick(6000);check(requests.length===before,'0ms real toolbar pointer/blur/click race blocked');await plus();await tick(100);await realWait(200);check(requests.length===before+1,'0ms close triggers exactly once');await tick(100);
 await prepareChat();before=requests.length;await dismiss();await tick(1500);await click('.chat-offline-toggle');await tick(5000);check(requests.length===before,'actual offline mode preserves ineligibility');
 await prepareChat();before=requests.length;await dismiss();await tick(1500);await page.locator('[data-ui="bubble-user"]').last().dispatchEvent('contextmenu',{bubbles:true,clientX:200,clientY:400});await tick(100);await page.evaluate(()=>{const b=[...document.querySelectorAll('.ctx-menu-btn')].find(e=>e.textContent==='多选');if(!b)throw Error('Missing multi select');b.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'Enter'}));b.click();});await tick(5000);check(await page.locator('[data-ui="multi-select"]').count()===1&&requests.length===before,'actual multi-select mode preserves ineligibility');
 hold=true;await prepareChat();before=requests.length;await dismiss();await tick(2100);await realWait(200);check(requests.length===before+1&&streams.size===1,'real SSE generation started');await plus();await tick(5000);await plus();await page.evaluate(()=>document.querySelector('.chat-input-textarea').focus());await tick(5000);check(requests.length===before+1&&streams.size===1,'menu and keyboard do not stop or duplicate active SSE');
 for(const label of ['照片墙','礼物']){await more();await menuItem(label);await tick(5000);check(requests.length===before+1&&streams.size===1,label+' cannot stop or duplicate active SSE');await click('.modal-overlay');await tick(3000);}
 if(process.env.KEYBOARD_COLLECT_ZIP){await more();await menuItem('分享收藏');await tick(5000);check(requests.length===before+1&&streams.size===1,'COLLECT cannot stop or duplicate active SSE');await click('.chat-custom-app-close');await tick(3000);}
 for(const end of streams)end();hold=false;await realWait(200);await tick(500);check(await page.locator('.chat-stream-bubble').count()===0,'same SSE completes after interactions');
 check(errors.length===0,'no uncaught browser errors');await page.screenshot({path:path.join(output,'chat-final.png')});
}catch(e){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw e;}
finally{await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors,requests,output},null,2));for(const end of streams)end();await browser.close();await new Promise(r=>server.close(r));console.log('Evidence '+output);}
