import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const repo = process.argv[2];
const legacy = process.argv[3];
const out = await fs.mkdtemp(path.join(os.tmpdir(), 'float-pwa-fixed-'));
const origin = 'http://127.0.0.1:4330';
const builds = { a: { port:4331, cwd:repo, dist:'.next-pwa-a', id:'pwa-test-a' }, b:{ port:4332,cwd:repo,dist:'.next',id:'pwa-test-b' }, legacy:{port:4333,cwd:legacy,dist:'.next'} };
let target='a', failMode='', failPath='', failCount=0, phase='boot';
const result={assertions:[],snapshots:[],events:[],requests:[],servers:[],output:out};
const children=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function check(value,label){assert.ok(value,label);result.assertions.push(label);console.log('PASS',label);}
async function waitUp(port){for(let n=0;n<120;n++){try{if((await fetch(`http://127.0.0.1:${port}`)).ok)return;}catch{}await delay(250);}throw Error('Server not ready '+port);}
function start(build){const child=spawn(process.execPath,['scripts/local-next-server.mjs','--prod','--port',String(build.port),'--host','127.0.0.1'],{cwd:build.cwd,env:{...process.env,NEXT_DIST_DIR:build.dist,NEXT_PUBLIC_SELF_HOSTED_MODE:'true',...(build.id?{NEXT_BUILD_ID:build.id}:{})},windowsHide:true,stdio:['ignore','pipe','pipe']});children.push(child);for(const stream of ['stdout','stderr'])child[stream].on('data',d=>result.servers.push({build:build.id||'legacy',stream,text:String(d)}));}
const proxy=http.createServer(async(req,res)=>{
  const url=new URL(req.url,origin), build=builds[target];
  const fail=url.pathname===failPath&&(failMode==='always'||failMode==='once'&&failCount===0);
  result.requests.push({phase,target,path:req.url,fail,at:Date.now()});
  if(fail){failCount++;res.writeHead(404,{'cache-control':'no-store'});res.end('Injected temporary missing chunk');return;}
  if(url.pathname==='/sw-versioned.js'&&build.id){res.writeHead(200,{'content-type':'application/javascript','cache-control':'no-cache','service-worker-allowed':'/'});res.end(await fs.readFile(path.join(build.cwd,build.dist,'sw-versioned.js')));return;}
  const upstream=http.request({host:'127.0.0.1',port:build.port,path:req.url,method:req.method,headers:{...req.headers,host:`127.0.0.1:${build.port}`}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});upstream.on('error',e=>{res.statusCode=502;res.end(String(e));});req.pipe(upstream);
});
let browser;
async function context(){const ctx=await browser.newContext({viewport:{width:402,height:874},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'allow'});await ctx.addInitScript(()=>{sessionStorage.setItem('__pwaLoads',String(Number(sessionStorage.getItem('__pwaLoads')||0)+1));window.__pwaErrors=[];addEventListener('unhandledrejection',e=>window.__pwaErrors.push(String(e.reason)));});return ctx;}
function instrument(page){for(const event of ['pageerror','console','requestfailed','framenavigated'])page.on(event,arg=>{if(event==='console'&&!['error','warning','warn'].includes(arg.type()))return;if(event==='framenavigated'&&arg!==page.mainFrame())return;result.events.push({phase,event,text:event==='console'?arg.text():event==='requestfailed'?arg.url()+' '+arg.failure()?.errorText:event==='framenavigated'?arg.url():String(arg),at:Date.now()});});page.on('response',r=>{if(r.status()>=400)result.events.push({phase,event:'http',status:r.status(),url:r.url()});});}
async function ready(page,id){await page.waitForFunction(id=>document.documentElement.dataset.pwaBuildId===id,id,{timeout:90000});}
async function app(page){await page.waitForFunction(()=>!!document.querySelector('button[aria-label="Enter"]:not(:disabled), .phone-shell-wrap:not(.splash-shell-wrap)'),null,{timeout:60000});}
async function snapshot(page,name){const data=await page.evaluate(async()=>{
  const version=async w=>{if(!w)return null;if(!w.scriptURL.includes('sw-versioned'))return 'legacy';return new Promise(resolve=>{const ch=new MessageChannel();const timer=setTimeout(()=>{ch.port1.close();resolve('timeout');},3000);ch.port1.onmessage=e=>{clearTimeout(timer);ch.port1.close();resolve(e.data.buildId);};w.postMessage({type:'PWA_VERSION'},[ch.port2]);});};
  const r=await navigator.serviceWorker.getRegistration();const names=await caches.keys(), roots={};
  for(const name of names){if(!name.endsWith('-shell')&&!name.endsWith('-static'))continue;const c=await caches.open(name), response=await c.match('/');if(response){const html=await response.text();roots[name]={build:html.match(/name="float-build-id" content="([^"]+)"/)?.[1]||'legacy',assets:[...html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map(m=>m[1])};}}
  return {meta:document.querySelector('meta[name="float-build-id"]')?.content,ready:document.documentElement.dataset.pwaBuildId,controller:await version(navigator.serviceWorker.controller),active:await version(r?.active),waiting:await version(r?.waiting),loads:Number(sessionStorage.getItem('__pwaLoads')),names,roots,errors:window.__pwaErrors,scripts:[...document.scripts].map(s=>s.src).filter(Boolean),body:document.body.innerText.slice(0,300)};
});result.snapshots.push({name,data});await page.screenshot({path:path.join(out,name+'.png')});return data;}
try{
  for(const build of Object.values(builds))start(build);
  await Promise.all(Object.values(builds).map(b=>waitUp(b.port)));
  await new Promise(r=>proxy.listen(4330,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,channel:'msedge'});
  phase='A-first-boot';const ctx=await context();const old=await ctx.newPage();instrument(old);await old.goto(origin);await ready(old,'pwa-test-a');await old.reload();await ready(old,'pwa-test-a');
  check((await snapshot(old,'01-A-controlled')).controller==='pwa-test-a','A cold boot and reload controlled by A');
  // Seed an older cache: it must survive while any old tab is live, then be collected.
  await old.evaluate(async()=>{await(await caches.open('ai-phone-pwa-v12-static')).put('/',new Response('legacy shell'));});
  phase='B-deployed-A-still-open';target='b';await old.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update();});await delay(1500);
  const after=await snapshot(old,'02-A-after-deploy');check(after.controller==='pwa-test-a'&&after.meta==='pwa-test-a'&&after.waiting==='pwa-test-b','Open A stays on A while B waits');
  phase='B-new-tab';const fresh=await ctx.newPage();instrument(fresh);await fresh.goto(origin);await ready(fresh,'pwa-test-b');
  const coexist=await snapshot(fresh,'03-B-with-A-open');check(coexist.meta==='pwa-test-b'&&coexist.waiting==='pwa-test-b'&&coexist.active==='pwa-test-a','B boots while old A prevents activation');
  check(coexist.names.includes('ai-phone-pwa-v12-static'),'Unknown/old client prevents cache collection');
  for(const id of ['a','b']){const name=`float-pwa-build-pwa-test-${id}-shell`;check(coexist.roots[name]?.build===`pwa-test-${id}`,`Cached ${id} HTML is in its own namespace`);}
  const oldChunk=after.roots['float-pwa-build-pwa-test-a-shell'].assets.find(s=>s.includes('/chunks/app/layout-'));
  check(Boolean(oldChunk),'Recorded A shell contains a layout chunk');
  check(await old.evaluate(async u=>(await fetch(u)).ok,oldChunk),'Old tab can load its cached chunk after deploy');
  phase='A-refreshes-to-B';await old.reload();await ready(old,'pwa-test-b');await old.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return !r.waiting;});await delay(500);
  const switched=await snapshot(old,'04-all-B');check(switched.active==='pwa-test-b'&&switched.meta==='pwa-test-b','Refreshing last A safely activates B');
  check(!switched.names.includes('ai-phone-pwa-v12-static')&&switched.names.includes('float-pwa-build-pwa-test-a-shell'),'Collect obsolete v12 only after ready; preserve previous A');
  check((await snapshot(fresh,'05-B-not-reloaded')).loads===1,'Controller handoff does not reload the already ready B tab');
  phase='B-offline';await old.reload();await ready(old,'pwa-test-b');await ctx.setOffline(true);await old.reload({waitUntil:'domcontentloaded'});await app(old);const offline=await snapshot(old,'06-offline-B');check(offline.meta==='pwa-test-b'&&offline.controller==='pwa-test-b','Offline HTML and boot assets remain B');await ctx.setOffline(false);await ctx.close();
  phase='legacy-parent-boot';target='legacy';const legacyCtx=await context();const lp=await legacyCtx.newPage();instrument(lp);await lp.goto(origin);await app(lp);await lp.waitForFunction(()=>!!navigator.serviceWorker.controller);await snapshot(lp,'07-parent-v12');
  phase='parent-to-fixed';target='b';const bp=await legacyCtx.newPage();instrument(bp);await bp.goto(origin);await ready(bp,'pwa-test-b');const legacyCoexist=await snapshot(bp,'08-parent-and-fixed');check(legacyCoexist.active==='legacy'&&legacyCoexist.waiting==='pwa-test-b','Legacy parent and fixed B coexist without forced takeover');
  await lp.reload();await ready(lp,'pwa-test-b');await delay(500);const migrated=await snapshot(lp,'09-parent-upgraded');check(migrated.active==='pwa-test-b','Parent v12 transitions to build-scoped B');await lp.reload();await ready(lp,'pwa-test-b');await legacyCtx.setOffline(true);await lp.reload();await app(lp);check((await snapshot(lp,'10-migration-offline')).meta==='pwa-test-b','Legacy static root is not the fixed build offline fallback');await legacyCtx.close();
  const html=await(await fetch(origin)).text();failPath=html.match(/src="([^\"]*\/main-app-[^\"]+\.js)"/)[1];
  phase='one-shot-404';failMode='once';failCount=0;const transientCtx=await context();const tp=await transientCtx.newPage();instrument(tp);await tp.goto(origin,{waitUntil:'domcontentloaded'}).catch(()=>{});await ready(tp,'pwa-test-b');const recovered=await snapshot(tp,'11-one-shot-recovered');check(recovered.loads===2&&failCount===1,'Single core chunk 404 recovers with exactly one automatic reload');check(await tp.locator('#float-pwa-recovery').count()===0,'Recovered page has no blocking overlay');await delay(2500);check(await tp.evaluate(()=>Number(sessionStorage.getItem('__pwaLoads')))===2,'Successful recovery has no reload loop');
  await tp.getByRole('button',{name:'Enter',exact:true}).click();await tp.waitForSelector('.phone-shell-wrap:not(.splash-shell-wrap)');check(true,'Recovered app reaches desktop after complete initialization');await transientCtx.close();
  phase='persistent-404';failMode='always';failCount=0;const badCtx=await context();const bad=await badCtx.newPage();instrument(bad);await bad.goto(origin,{waitUntil:'domcontentloaded'}).catch(()=>{});await bad.waitForSelector('#float-pwa-recovery',{timeout:20000});await delay(3000);const stopped=await snapshot(bad,'12-persistent-404');check(stopped.loads===2,'Persistent 404 stops after one automatic reload');check(failCount===2,'Persistent 404 does not generate a reload loop');failMode='';await bad.locator('#float-pwa-recovery button').click();await ready(bad,'pwa-test-b');check((await snapshot(bad,'13-manual-recovered')).loads===3,'Explicit retry after resource restoration boots successfully');await badCtx.close();
  phase='storage-denied-404';failMode='always';failCount=0;const deniedCtx=await context();await deniedCtx.addInitScript(()=>{for(const method of ['getItem','setItem','removeItem']){const original=Storage.prototype[method];Storage.prototype[method]=function(key,...args){if(String(key).startsWith('float:pwa-recovery:'))throw new DOMException('Denied','SecurityError');return original.call(this,key,...args);};}});const denied=await deniedCtx.newPage();instrument(denied);await denied.goto(origin,{waitUntil:'domcontentloaded'}).catch(()=>{});await denied.waitForSelector('#float-pwa-recovery',{timeout:20000});await delay(2000);check((await snapshot(denied,'14-storage-denied')).loads===2,'URL guard prevents a loop when recovery sessionStorage is denied');await deniedCtx.close();
  result.success=true;
}catch(error){result.error={message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}
finally{await browser?.close();proxy.close();for(const child of children)child.kill();await fs.writeFile(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({out,passed:result.assertions.length,success:result.success,error:result.error}));}
