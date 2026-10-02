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

const sharp=require('sharp');
const image=await sharp('public/images/black-market/operator.jpg').resize(400,400,{fit:'cover'}).png().toBuffer();
const colors={};for(const [name,color] of Object.entries({red:'#dd2838',blue:'#225cdd',white:'#ffffff'}))colors[name]=await sharp({create:{width:400,height:400,channels:3,background:color}}).png().toBuffer();
const out=process.env.MUSIC_CARD_EVIDENCE_DIR || path.join(temp,'evidence');
await fs.mkdir(out,{recursive:true});
const checks=[];const check=(ok,name)=>{assert.ok(ok,name);checks.push(name);console.log('PASS '+name)};
const calls=[],errors=[],held=[];
let holdCovers=false,active=0,peak=0;
const context=await browser.newContext({viewport:{width:402,height:874},deviceScaleFactor:3,isMobile:true,hasTouch:true});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const songs=new Map();let nextId=100;
await context.route('**/*',async route=>{
 const u=new URL(route.request().url());
 if(u.hostname==='cover.test'){
  if(holdCovers)await new Promise(resolve=>held.push(resolve));
  if(u.pathname.includes('404'))return route.fulfill({status:404,body:''});
  return route.fulfill({contentType:'image/png',body:colors[u.pathname.slice(1).replace('.png','')]||image});
 }
 if(u.pathname.startsWith('/netease/')){
  calls.push(u.pathname+u.search);active++;peak=Math.max(peak,active);
  try{
   await new Promise(r=>setTimeout(r,60));
   let payload={};
   if(u.pathname.endsWith('/cloudsearch')){
    const query=u.searchParams.get('keywords');
    if(query.includes('No result'))payload={result:{songs:[]}};
    else {
     const title=query.replace(/ Artist$/,'');
     if(!songs.has(title))songs.set(title,nextId++);
     const id=songs.get(title);
     payload={result:{songs:[{id,name:title,ar:[{name:'Artist'}],al:{picUrl:query.includes('Detail only')?undefined:'https://cover.test/'+id+'.png'},dt:120000}]}};
    }
   }else if(u.pathname.endsWith('/song/detail')){
    const id=Number(u.searchParams.get('ids'));
    payload={songs:[{id,name:[...songs].find(([,n])=>n===id)?.[0]||'Known song',ar:[{name:'Artist'}],al:{picUrl:'https://cover.test/'+id+'.png'}}]};
   }else if(u.pathname.endsWith('/song/url'))payload={data:[{url:'https://audio.test/fixture.mp3'}]};
   else if(u.pathname.endsWith('/lyric'))payload={lrc:{lyric:'[00:00.00]fixture lyric'}};
   return await route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  }finally{active--;}
 }
 return u.origin===origin?route.continue():route.abort();
});
const settle=()=>page.waitForTimeout(350);
const geometry=()=>page.locator('.chat-music-share-card').evaluateAll(cards=>cards.map(c=>{
 const r=c.getBoundingClientRect(),cover=c.querySelector('.chat-music-share-cover').getBoundingClientRect(),info=c.querySelector('.chat-music-share-info').getBoundingClientRect();
 return {w:r.width,h:r.height,right:r.right,left:r.left,coverW:cover.width,coverH:cover.height,infoH:info.height,state:c.dataset.coverState};
}));
async function scene(messages,group=false){
 await page.evaluate(({messages,group})=>window.imTest[group?'groupScene':'singleScene'](messages),{messages,group});await settle();
}
const music=(title,extra={},role='assistant')=>({role,content:'',mediaType:'music_share',mediaData:{musicTitle:title,...extra}});
try{
 await page.goto(origin);await page.waitForFunction(()=>!!window.imTest);await page.evaluate(async()=>{await window.imTest.mount();window.imTest.musicSetup()});await settle();
 const titles=['晴天','这是一首非常非常长的中文歌曲名称一直延伸直到第三行也放不下','Hi','An exceptionally long English song title with many many words and extra text','中文 mixed collaboration'];
 const entries=titles.map((t,i)=>music(t,{musicArtist:i===4?'Artist / 另一位歌手 / A very long collaborator name':'Artist',musicTrackId:10+i,musicCoverUrl:'https://cover.test/'+i+'.png'},i%2?'user':'assistant'));
 for(const wallpaper of [false,true]){
  await page.evaluate(w=>window.imTest.wallpaper(w),wallpaper);await settle();
  await scene(entries);
  await page.waitForFunction(()=>[...document.querySelectorAll('.chat-music-share-card')].every(c=>c.dataset.coverState==='loaded'));
  const g=await geometry(),mode=wallpaper?'wallpaper':'plain';
  check(g.every(x=>Math.abs(x.w-216)<.1),mode+': five mixed-language cards share reference-scale 216px width');
  check(g.every(x=>Math.abs(x.coverW-x.coverH)<.1)&&g[1].infoH>g[0].infoH,mode+': square cover and content-driven information height');
  check(g[4].infoH>g[2].infoH,mode+': long artist wraps and grows the card');
  check(g.filter((_,i)=>i%2).every(x=>Math.abs(x.right-386)<.1)&&g.filter((_,i)=>!(i%2)).every(x=>Math.abs(x.left-16)<.1),mode+': accepted incoming/outgoing insets');
  check(await page.locator('.chat-music-share-card').evaluateAll(cards=>cards.every(c=>{
   const t=c.querySelector('.chat-music-share-title'),a=c.querySelector('.chat-music-share-artist');
   return getComputedStyle(t).webkitLineClamp==='none'&&t.scrollHeight===t.clientHeight&&a.scrollHeight===a.clientHeight&&Math.abs(a.getBoundingClientRect().top-t.getBoundingClientRect().bottom-4)<.1&&c.querySelector('.chat-music-share-footer').textContent==='网易云音乐';
  })),mode+': complete title and artist text, no reserved title space, compact 4px gap');
  const card=page.locator('.chat-music-share-card').last();await card.scrollIntoViewIfNeeded();await card.screenshot({path:path.join(out,mode+'-loaded.png')});
 }
 check(calls.length===0,'saved covers render without API search or detail requests');
 await fs.writeFile(path.join(out,'surface-audit.json'),JSON.stringify(await page.locator('.chat-music-share-card').last().evaluate(card=>{
  const nodes=[card,...card.querySelectorAll('*'),card.parentElement,card.parentElement.parentElement];
  return nodes.map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {class:el.className,w:r.width,h:r.height,background:s.background,borderRadius:s.borderRadius,overflow:s.overflow,filter:s.filter,clipPath:s.clipPath,before:getComputedStyle(el,'::before').content,after:getComputedStyle(el,'::after').content}});
 }),null,2));
 // Pending -> loaded: real network response held until both geometry snapshots.
 holdCovers=true;
 await scene([music('Delayed cover',{musicCoverUrl:'https://cover.test/delayed.png',musicArtist:'Artist'})]);
 const pending=(await geometry())[0];check(pending.state==='pending','first frame is a complete pending card');
 await page.locator('.chat-music-share-card').screenshot({path:path.join(out,'pending.png')});
 holdCovers=false;held.splice(0).forEach(r=>r());
 await page.locator('.chat-music-share-card[data-cover-state="loaded"]').waitFor();
 const loaded=(await geometry())[0];check(pending.w===loaded.w&&pending.h===loaded.h,'delayed cover causes zero size change');
 await scene([music('Broken cover',{musicCoverUrl:'https://cover.test/404.png',musicArtist:'Artist'})]);
 await page.locator('.chat-music-share-card[data-cover-state="failed"]').waitFor();
 check(await page.locator('.chat-music-share-cover img').count()===0,'404 removes image element and keeps note placeholder');
 check((await geometry())[0].h===loaded.h,'404 keeps complete fixed card dimensions');
 await page.locator('.chat-music-share-card').screenshot({path:path.join(out,'404.png')});
 await page.locator('.chat-music-share-title').click();
 await page.waitForFunction(()=>window.imTest.musicPlays.length===1);
 check(await page.evaluate(()=>window.imTest.musicPlays[0].title==='Broken cover'&&!!window.imTest.musicPlays[0].lyrics),'failed cover still reaches original playable-match/detail/lyrics/bridge path');
 // Legacy metadata: first paint, dedup, persistence, reentry.
 holdCovers=true;
 await scene([music('Legacy'),music('Legacy'),music('Detail only',{musicArtist:'Artist'}),music('No result')]);
 await page.waitForFunction(()=>window.imTest.chat.loadChatMessages(window.imTest.chat.loadChatSessions()[0].id).filter(m=>m.mediaData?.musicCoverUrl).length===3);
 const stored=await page.evaluate(()=>window.imTest.chat.loadChatMessages(window.imTest.chat.loadChatSessions()[0].id));
 check(calls.filter(x=>x.includes('/cloudsearch')&&x.includes('keywords=Legacy')).length===1,'duplicate legacy cards share one metadata search');
 check(stored[0].mediaData.musicTrackId===stored[1].mediaData.musicTrackId&&stored[0].mediaData.musicArtist==='Artist','title-only history gains matched id, cover and missing artist');
 check(stored.every(x=>x.content===''),'lazy enrich leaves historical message body intact');
 check(calls.some(x=>x.includes('/song/detail'))&&stored[2].mediaData.musicCoverUrl,'missing search cover uses existing song detail');
 const before=calls.length;await page.evaluate(()=>{window.imTest.rerender();window.imTest.remount()});await settle();
 check(calls.length===before,'rerender/reentry reuses saved cover and negative cache');
 holdCovers=false;held.splice(0).forEach(r=>r());await settle();
 check(await page.locator('.chat-music-share-card').last().innerText().then(t=>t.includes('No result')&&t.includes('未知歌手')&&!/undefined|null/.test(t)),'no search result keeps complete readable fallback');
 await scene([music('Legacy',stored[0].mediaData),music('Detail only',stored[2].mediaData)]);
 const beforeReload=calls.length;
 await page.reload();await page.waitForFunction(()=>!!window.imTest);
 await page.evaluate(()=>window.imTest.musicResume());
 await page.waitForFunction(()=>document.querySelectorAll('.chat-music-share-card[data-cover-state="loaded"]').length===2);
 check(calls.length===beforeReload,'fresh page hydrates saved covers without searching again');
 const beforeKnown=calls.length;
 const known=await page.evaluate(()=>window.imTest.resolveMusicSharePreview({musicTitle:'Known song',musicTrackId:9876}));
 check(known.musicTrackId===9876&&!!known.musicCoverUrl&&calls.slice(beforeKnown).every(x=>x.includes('/song/detail')),'known track id resolves detail without a new search');
 // Editing/deletion race uses latest stored metadata, not the captured message.
 const race=await page.evaluate(()=>{
  const p=window.imTest;
  const original=p.add({content:'retained',mediaType:'music_share',mediaData:{musicTitle:'Before',label:'original'}});
  p.chat.updateMessageMediaData(original.id,{musicTitle:'After',label:'edited'});
  const rejected=p.persistMusicSharePreview(original,{musicTrackId:99,musicCoverUrl:'https://cover.test/stale.png'});
  const live=p.chat.loadChatMessages(original.sessionId).find(m=>m.id===original.id);
  return {rejected,live};
 });
 check(race.rejected===null&&race.live.mediaData.musicTitle==='After'&&!race.live.mediaData.musicCoverUrl,'in-flight lookup cannot overwrite an edited song');
 check(await page.evaluate(()=>{
  const p=window.imTest,original=p.add({mediaType:'music_share',mediaData:{musicTitle:'Deleted'}});
  p.chat.deleteChatMessage(original.id);
  return p.persistMusicSharePreview(original,{musicTrackId:99,musicCoverUrl:'https://cover.test/deleted.png'})===null;
 }),'in-flight lookup cannot recreate a deleted message');
 // Bounded concurrency for a long list, dedup of the same query even while pending.
 peak=0;
 await page.evaluate(async()=>{await Promise.all(Array.from({length:18},(_,i)=>window.imTest.resolveMusicSharePreview({musicTitle:'Queue '+(i%9)})))});
 check(peak<=3&&peak>0,'metadata requests run at most three at once');
 check(calls.filter(x=>x.includes('/cloudsearch')&&x.includes('Queue')).length===9,'in-flight requests deduplicate across many cards');
 // Group layout remains identical for both directions and after metadata resolution.
 const sample=[music('Group',{musicCoverUrl:'https://cover.test/group.png'},'user')];
 await scene(sample);const single=(await geometry())[0];await scene(sample,true);const group=(await geometry())[0];
 check(single.right===group.right&&single.w===group.w,'group outgoing music preserves single-chat inset and width');
 check(await page.locator('.im-message-row[data-role="user"] > .chat-msg-avatar').evaluate(e=>getComputedStyle(e).display)==='none','group outgoing avatar stays removed');
 // Same native grouping + frozen outline for all four layout directions.
 for(const background of ['plain','dark','light'])for(const grouped of [false,true])for(const role of ['assistant','user']){
  await page.evaluate(bg=>{
   window.imTest.wallpaper(bg!=='plain',bg==='dark'?'#17202e':'#f3e9d7');
  },background);
  const song={...music('晴天',{musicArtist:'Artist',musicCoverUrl:'https://cover.test/blue.png'},role),senderCharacterId:role==='assistant'?'im-reference':undefined};
  await scene([song,song],grouped);
  const state=await page.locator('.chat-bubble-music-share').evaluateAll(bs=>bs.map(b=>({
   group:b.dataset.imGroup,path:b.querySelector('.im-text-outline path').getAttribute('d'),clip:getComputedStyle(b.querySelector('.chat-music-share-surface')).clipPath,
   svg:getComputedStyle(b.querySelector('.im-text-outline')).display,before:getComputedStyle(b,'::before').content,after:getComputedStyle(b,'::after').content,w:b.getBoundingClientRect().width,
  })));
  check(state[0].group==='first'&&state[1].group==='last'&&state[0].path!==state[1].path&&state.every(s=>s.clip.startsWith('path(')&&s.svg==='none'&&s.before==='none'&&s.after==='none'&&s.w===216),`${background}/${grouped?'group':'single'}/${role}: one clipped surface, tail only on group end`);
  const last=page.locator('.chat-music-share-card').last();await last.scrollIntoViewIfNeeded();await settle();
  const box=await last.boundingBox();await page.screenshot({path:path.join(out,`${background}-${grouped?'group':'single'}-${role}.png`),clip:{x:box.x-2,y:box.y-2,width:box.width+4,height:box.height+12}});
  // A text message after music belongs to the same group, not a new media group.
  await scene([song,{role,senderCharacterId:song.senderCharacterId,content:'After music'}],grouped);
  check(await page.locator('.chat-bubble-music-share').getAttribute('data-im-group')==='first',`${background}/${grouped?'group':'single'}/${role}: following text removes music tail`);
 }
 // Pixel checks include the below-body tail; uniform raster colors make joins measurable.
 const pixels={};
 await page.evaluate(()=>window.imTest.wallpaper(false));
 for(const color of ['red','blue','white'])for(const role of ['assistant','user']){
  await scene([music('Hi',{musicArtist:'Artist',musicCoverUrl:`https://cover.test/${color}.png`},role)]);
  await page.locator('.chat-music-share-card[data-cover-state="loaded"]').waitFor();
  const c=page.locator('.chat-music-share-card');await c.scrollIntoViewIfNeeded();await settle();const box=await c.boundingBox();
  const png=await page.screenshot({clip:{x:box.x,y:box.y,width:box.width,height:box.height+10}});
  await fs.writeFile(path.join(out,`${color}-${role}-tail.png`),png);
  const raw=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const px=(x,y)=>{const i=(Math.floor(y*3)*raw.info.width+Math.floor(x*3))*3;return [...raw.data.subarray(i,i+3)]};
  const h=box.height,w=box.width;
  const body=px(w/2,h-8),tip=px(role==='assistant'?11:w-11,h+4),other=px(role==='assistant'?w-11:11,h+4);
  check(body.every((v,i)=>Math.abs(v-tip[i])<8)&&other.every(v=>v>245),`${color}/${role}: tail is on correct side and matches body pixels`);
  check(px(1,h-1).every(v=>v>245)&&px(w-1,h-1).every(v=>v>245),`${color}/${role}: both bottom corners stay round without colored square leakage`);
  pixels[color]=body;
 }
 check(pixels.red[0]>pixels.red[2]+40&&pixels.blue[2]>pixels.blue[0]+40,'red and blue covers produce clearly distinct information colors');
 const linear=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4},lum=c=>c.map(linear).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 check((lum([228,223,231])+.05)/(lum(pixels.white)+.05)>=4.5,'even a white cover retains at least 4.5:1 secondary text contrast');
 for(const width of [320,393,430]){
  await page.setViewportSize({width,height:874});await scene(sample);const g=(await geometry())[0];
  check(g.left>=0&&g.right<=width&&Math.abs(g.coverW-g.coverH)<.1,width+'px: compact card remains inside viewport');
 }
 check(errors.length===0,'all scenarios have no uncaught browser errors');
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({checks,calls,peak,errors},null,2));
 console.log(checks.length+' checks passed; screenshots: '+out);
}finally{held.splice(0).forEach(r=>r());await context.close();await browser.close();await new Promise(r=>server.close(r));}
