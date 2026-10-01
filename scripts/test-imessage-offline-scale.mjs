import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),repo=process.cwd();
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'float-imessage-offline-scale-'));
const wp=require('next/dist/compiled/webpack/webpack');wp.init();
await new Promise((resolve,reject)=>wp.webpack({mode:'development',target:'web',devtool:false,context:repo,entry:path.join(repo,'scripts/imessage-theme/fixture.tsx'),output:{path:temp,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':repo},fallback:{fs:false,path:false,crypto:false}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(repo,'scripts/anonymous-xhs-phase0/ts-loader.cjs')}]},plugins:[new wp.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})]},(err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString({all:false,errors:true}))):resolve()));
const css=(await require('postcss')([require('@tailwindcss/postcss')({base:repo})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.join(repo,'app/globals.css')})).css;
const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://localhost');
    if(u.pathname==='/fixture.js')res.end(await fs.readFile(path.join(temp,'fixture.js')));
    else if(u.pathname==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);}
    else if(u.pathname.startsWith('/theme/')){const file=u.pathname.split('/').at(-1);res.end(await fs.readFile(path.join(repo,'themes/imessage-native-day',file),'utf8'));}
    else if(u.pathname==='/'){res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="/style.css"><style>html,body,#app{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="app"></div><script>window.process={env:{NODE_ENV:"development"}}</script><script src="/fixture.js"></script>');}
    else{res.writeHead(404);res.end();}
  }catch(e){res.writeHead(500);res.end(String(e));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const deps=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(path.join(deps,'playwright'));
const browser=await chromium.launch({headless:true,channel:'msedge'});
const checks=[];const check=(ok,name)=>{assert.ok(ok,name);checks.push(name);console.log('PASS '+name)};
try{
  const context=await browser.newContext({viewport:{width:402,height:874},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.waitForFunction(()=>!!window.imTest);await page.evaluate(()=>window.imTest.mount());await page.locator('.im-bubble').first().waitFor();
  const settle=()=>page.waitForTimeout(350);
  const setScale=async scale=>{await page.evaluate(s=>document.documentElement.style.setProperty('--app-text-scale',String(s)),scale);await settle();};
  const online=[];
  for(const scale of [1,1.25,1.5]){
    await setScale(scale);
    online.push(await page.locator('.im-bubble').first().evaluate((el,requested)=>{const root=el.closest('.chat-room-wrapper'),r=el.getBoundingClientRect(),s=getComputedStyle(el);return{requested,mode:root.classList.contains('chat-mode-online'),rootScale:getComputedStyle(root).getPropertyValue('--app-text-scale').trim(),font:parseFloat(s.fontSize),line:parseFloat(s.lineHeight),width:r.width,height:r.height}},scale));
  }
  check(online.every(x=>x.mode&&x.rootScale==='1'),'online root exposes stable mode and fixes local scale to 1');
  check(online.every(x=>JSON.stringify({...x,requested:1})===JSON.stringify({...online[0],requested:1})),'online typography and bubble geometry are identical at 100%, 125% and 150%');

  await page.evaluate(()=>{window.imTest.offlineScene();document.querySelector('.chat-offline-toggle').click()});
  await page.locator('.chat-mode-offline .chat-offline-text').first().waitFor();
  const offline=[];
  for(const scale of [1,1.25,1.5]){
    await setScale(scale);
    offline.push(await page.evaluate(requested=>{
      const body=document.querySelector('.chat-offline-text'),root=body.closest('.chat-room-wrapper');
      const font=selector=>parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
      const s=getComputedStyle(body);
      return{requested,mode:root.classList.contains('chat-mode-offline'),rootScale:getComputedStyle(root).getPropertyValue('--app-text-scale').trim(),font:parseFloat(s.fontSize),line:parseFloat(s.lineHeight),label:font('.chat-offline-label'),time:font('.chat-offline-time'),summaryLabel:font('.chat-offline-summary-fold > summary'),summaryBody:font('.chat-offline-summary-content'),contact:font('.im-contact-name')};
    },scale));
  }
  check(offline.every(x=>x.mode),'offline mode uses the actual ChatRoom branch');
  check(offline.every(x=>Math.abs(Number(x.rootScale)-x.requested)<.001),'offline root inherits Float global text scale without hardcoded tiers');
  check(offline.every(x=>Math.abs(x.font-14.5*x.requested)<.02),'offline body text scales at the native 14.5px base ratio');
  check(offline.every(x=>Math.abs(x.line-26.825*x.requested)<.05),'offline body line height scales with the same host ratio');
  check(offline.every(x=>x.label===11&&x.time===11),'offline speaker labels and timestamps remain fixed UI text');
  check(offline.every(x=>x.summaryLabel===12&&x.contact===18),'offline summary header and contact name remain fixed UI text');
  check(offline.every(x=>Math.abs(x.summaryBody-13*x.requested)<.02),'offline summary content continues to follow the host scale');
  await page.locator('.chat-offline-summary-fold > summary').click();await settle();
  check(Math.abs(await page.locator('.chat-offline-summary-content').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))-19.5)<.02,'offline summary inherits 150% host scale');
  await page.locator('button[aria-label="返回线上模式"]').click();await page.locator('.chat-mode-online .im-bubble').first().waitFor();
  check(await page.locator('.chat-room-wrapper').evaluate(e=>getComputedStyle(e).getPropertyValue('--app-text-scale').trim())==='1','returning online restores the accepted fixed scale');
  check(errors.length===0,'no uncaught browser errors');
  console.log(`${checks.length} passed / 0 failed`);
  await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
