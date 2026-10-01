import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),repo=process.cwd();
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'float-imessage-chat-polish-'));
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
  const settle=()=>page.waitForTimeout(500);

  await page.evaluate(()=>window.imTest.singleScene([{content:'single chat stays unchanged'}]));await settle();
  check(await page.locator('.chat-room-wrapper').evaluate(e=>e.classList.contains('im-single')),'single chat remains on its accepted layout path');
  check(await page.locator('.im-message-row[data-role="assistant"] > .chat-msg-avatar').evaluate(e=>getComputedStyle(e).display)==='none','single chat avatar behavior is unchanged');

  await page.evaluate(()=>window.imTest.groupScene([
    {content:'A first',senderCharacterId:'im-reference',senderName:'A'},
    {content:'A middle',senderCharacterId:'im-reference',senderName:'A'},
    {content:'A last',senderCharacterId:'im-reference',senderName:'A'},
    {content:'B single',senderCharacterId:'im-second',senderName:'B'},
    {content:'A next first',senderCharacterId:'im-reference',senderName:'A'},
    {content:'A next last',senderCharacterId:'im-reference',senderName:'A'},
  ]));await settle();
  const group=await page.locator('.im-message-row[data-role="assistant"]').evaluateAll(rows=>rows.map(row=>{
    const avatar=row.querySelector(':scope > .chat-msg-avatar'),bubble=row.querySelector('.im-bubble');
    const ar=avatar.getBoundingClientRect(),br=bubble.getBoundingClientRect();
    return{visibility:getComputedStyle(avatar).visibility,group:bubble.getAttribute('data-im-group'),bottomDelta:Math.abs(ar.bottom-br.bottom),avatarWidth:ar.width,bubbleLeft:br.left};
  }));
  check(JSON.stringify(group.map(x=>x.group))===JSON.stringify(['first','middle','last','single','first','last']),'group avatar test uses the existing sender grouping boundaries');
  check(JSON.stringify(group.map(x=>x.visibility))===JSON.stringify(['hidden','hidden','visible','visible','hidden','visible']),'only the last incoming message in each sender group shows an avatar');
  check(group.filter(x=>x.visibility==='visible').every(x=>x.bottomDelta<.75),'visible group avatars align with the final bubble bottom');
  check(group.every(x=>x.avatarWidth===40),'hidden group avatars retain the alignment column');

  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="180" height="240"><rect width="180" height="240" fill="#17233b"/></svg>';
  const image='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
  await page.evaluate(image=>window.imTest.singleScene([
    {content:'',mediaType:'image',mediaData:{label:'incoming single'},mediaUrl:image},
    {role:'user',content:'',mediaType:'image',mediaData:{label:'outgoing single'},mediaUrl:image},
    {content:'ordinary text'},
    {content:'',mediaType:'audio',mediaData:{label:'voice'},mediaUrl:'data:audio/mpeg;base64,AA=='},
  ]),image);await settle();
  await page.locator('.im-bubble[data-im-single-image]').first().waitFor();
  const media=await page.locator('.im-bubble[data-im-single-image]').evaluateAll(bubbles=>bubbles.map(bubble=>{
    const row=bubble.closest('.im-message-row'),card=bubble.querySelector('.chat-photo-card--image'),img=bubble.querySelector('.chat-photo-card-image');
    const cs=getComputedStyle(card),is=getComputedStyle(img);
    return{role:row.dataset.role,cardBackground:cs.backgroundColor,cardOverflow:cs.overflow,cardRadius:cs.borderRadius,imageBackground:is.backgroundColor,imageRadius:is.borderRadius};
  }));
  const incoming=media.find(x=>x.role==='assistant'),outgoing=media.find(x=>x.role==='user');
  check(media.length===2,'only protocol single-image messages receive the narrow media marker');
  check(incoming.cardBackground==='rgba(0, 0, 0, 0)'&&incoming.cardOverflow==='hidden'&&incoming.cardRadius==='23px','incoming single image uses one transparent rounded clipping surface');
  check(incoming.imageBackground==='rgba(0, 0, 0, 0)'&&incoming.imageRadius==='0px','incoming image no longer paints a white antialiased inner edge');
  check(outgoing.imageBackground==='rgb(255, 255, 255)'&&outgoing.imageRadius==='23px','outgoing single-image rendering remains unchanged');
  check(await page.locator('.im-kind-text[data-im-single-image],.im-kind-voice[data-im-single-image]').count()===0,'text and voice bubbles never receive image polish');
  check(errors.length===0,'no uncaught browser errors');
  console.log(`${checks.length} passed / 0 failed`);
  await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
