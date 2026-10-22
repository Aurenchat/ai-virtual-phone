// Actual React ChatRoom + all supplied theme plugins + real IndexedDB.
// Local mock provider captures final outbound model requests; no real account/data.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const repo=process.cwd(), output=process.env.QUOTE_OUTPUT;
if(!output)throw Error('Set QUOTE_OUTPUT to an isolated evidence directory');
const theme=process.env.QUOTE_THEME;
if(!theme)throw Error('Set QUOTE_THEME to the read-only current theme directory');
const results=[],requests=[],errors=[],blocked=[];
const check=(ok,name,details)=>{results.push({name,status:ok?'PASS':'FAIL',details});console.log((ok?'PASS ':'FAIL ')+name);assert.ok(ok,name);};
let browser,server,reply='[引用:Unique original English]Model reply';
async function main(){
 await fs.mkdir(output,{recursive:true});const temp=await fs.mkdtemp(path.join(os.tmpdir(),'float-quote-v1-'));
 const wp=require('next/dist/compiled/webpack/webpack');wp.init();
 await new Promise((resolve,reject)=>wp.webpack({mode:'development',target:'web',devtool:false,context:repo,entry:path.join(repo,'tests/quote-v1/fixture.tsx'),output:{path:temp,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':repo},modules:[path.join(repo,'node_modules')],fallback:{fs:false,path:false,crypto:false}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(repo,'scripts/anonymous-xhs-phase0/ts-loader.cjs')}]},plugins:[new wp.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})]},(e,s)=>e||s.hasErrors()?reject(e||Error(s.toString({all:false,errors:true}))):resolve()));
 const css=(await require('postcss')([require('@tailwindcss/postcss')({base:repo})]).process(await fs.readFile(path.join(repo,'app/globals.css'),'utf8'),{from:path.join(repo,'app/globals.css')})).css;
 const files={'iMessage-Native-Day.css':'聊天室CSS.txt','iMessage-Message-Bridge.js':'iMessage-Message-Bridge-perf6.js','iMessage-Toolbar.js':'iMessage-Toolbar-perf.3-composer-flashfix.js','menu.js':'iMessage-Long-Press-Menu-perf.3-flashfix.js','reactions.js':'iMessage-Reactions-perf.js'};
 server=http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://localhost');
  if(req.method==='POST'){
   let raw='';for await(const part of req)raw+=part;requests.push({path:u.pathname,body:JSON.parse(raw)});
   await fs.writeFile(path.join(output,'requests.json'),JSON.stringify(requests,null,2));
   const body=JSON.parse(raw);
   if(body.stream){res.setHeader('Content-Type','text/event-stream');return res.end('data: '+JSON.stringify({choices:[{delta:{role:'assistant',content:reply},finish_reason:null}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');}
   res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({id:'fixture',choices:[{message:{role:'assistant',content:reply},finish_reason:'stop'}]}));
  }
  if(u.pathname==='/fixture.js'){res.setHeader('Content-Type','application/javascript');return res.end(await fs.readFile(path.join(temp,'fixture.js')));}
  if(u.pathname==='/style.css'){res.setHeader('Content-Type','text/css');return res.end(css);}
  if(u.pathname.startsWith('/theme/')){const file=files[u.pathname.split('/').at(-1)];if(!file){res.writeHead(404);return res.end();}return res.end(await fs.readFile(path.join(theme,file)));}
  if(u.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>html,body,#app{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="app"></div><script>window.process={env:{NODE_ENV:"development"}}</script><script src="/fixture.js"></script>');}
  res.writeHead(404);res.end();
 }catch(e){res.writeHead(500);res.end(String(e));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
 browser=await chromium.launch({headless:true,channel:'chrome'});const context=await browser.newContext({viewport:{width:402,height:874},isMobile:true,hasTouch:true});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue();
  // The repository CSS example imports Google Fonts. Supply an empty local
  // stylesheet; this suite checks quote layout with the installed system font.
  if(u.hostname==='fonts.googleapis.com'&&u.pathname==='/css2')return route.fulfill({contentType:'text/css',body:'/* synthetic external font stylesheet */'});
  blocked.push(u.pathname);return route.abort();});
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack,after:results.at(-1)?.name}));
 await page.goto(origin);await page.waitForFunction(()=>!!window.quoteTest);
 await page.evaluate(async()=>{await imTest.mount();for(const file of ['menu.js','reactions.js']){const r=await imTest.install(await(await fetch('/theme/current/'+file)).text());if(!r.ok)throw Error(r.error);}});
 await page.waitForFunction(()=>document.querySelector('.im-message-row'));
 const settle=()=>page.waitForTimeout(300);
 const scene=async messages=>{const saved=await page.evaluate(messages=>imTest.scene(messages),messages);await settle();return saved;};
 // Frozen ordinary-message geometry from the actual installed theme, before/after UI polish.
 const ordinary=[];
 for(const input of [{role:'user',content:'Ordinary text'}, {role:'assistant',content:'Incoming text'},
  {role:'assistant',content:'Original English | 中文翻译'},
  {role:'user',content:'',mediaType:'audio',mediaData:{label:'Voice transcript',voiceDuration:9}},
  {role:'assistant',content:'',mediaType:'music_share',mediaData:{musicTitle:'Song',musicArtist:'Artist'}}]){
  await scene([input]);
  ordinary.push(await page.locator('[data-ui^="bubble-"]').evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {width:r.width,height:r.height,padding:s.padding,font:s.font,color:s.color,background:s.backgroundColor,path:e.querySelector('.im-text-outline path')?.getAttribute('d'),html:e.querySelector('.im-bilingual-block')?.textContent};}));
 }
 await fs.writeFile(path.join(output,'ordinary-geometry.json'),JSON.stringify(ordinary,null,2));
 await page.screenshot({path:path.join(output,'ordinary-music.png')});
 if(process.env.QUOTE_BASELINE==='1')return;
 if(process.env.QUOTE_BASELINE_PATH){const baseline=JSON.parse(await fs.readFile(process.env.QUOTE_BASELINE_PATH,'utf8'));check(JSON.stringify(ordinary)===JSON.stringify(baseline),'ordinary outgoing/incoming/bilingual/voice/music geometry and SVG contours unchanged',{baseline,ordinary});}
 // Bidirectional typed references, persistence, model and actual memory assembler.
 const semantic=await page.evaluate(async()=>{
  const t=quoteTest,c=imTest.chat,s=c.loadChatSessions()[0];
  const kinds=[{content:'Unique original English | 唯一中文翻译'},{mediaType:'image',mediaUrl:'media-store://missing',mediaData:{label:'Photo label'}},{mediaType:'audio',mediaData:{label:'Voice original | 中文语音',voiceDuration:13}},{mediaType:'music_share',mediaData:{musicTitle:'Song',musicArtist:'Artist',musicCoverUrl:'media-store://missing'}},{mediaType:'transfer',mediaData:{amount:3,currency:'USD',status:'pending'}},{mediaType:'red_packet',mediaData:{amount:4}},{mediaType:'location',mediaData:{label:'Park'}},{mediaType:'app_card',mediaData:{appCardTitle:'App title',appCardSummary:'Compact summary',appCardBody:'RAW_LARGE_BODY'.repeat(500)}},{mediaType:'dice',mediaData:{}},{mediaType:'plugin:unknown',mediaData:{label:'{"secret":"RAW_INTERNAL"}'},content:'RAW_PAYLOAD'}];
  const list=[];
  for(const role of ['user','assistant'])for(const input of kinds){const src=c.pushChatMessage({sessionId:s.id,role,content:'',...input});for(const responder of ['user','assistant']){const q=t.createChatQuote(src),m=c.pushChatMessage({sessionId:s.id,role:responder,mediaType:'quote',content:'Typed reply',mediaData:{quoteV1:q,quotePreview:q.preview,quoteMessageId:src.id,quoteRole:src.role}});list.push({src,m,prompt:t.formatRichMediaForHistory(m,'User','Character')});}}
  await t.flush();const stored=await t.chatDb.messages.toArray();const timeline=t.loadNativeTimeline('im-reference',{timeAware:false});const memory=t.prepareShortTermContext('im-reference','diary',{timeAware:false});
  return {list,stored,timeline,memory,summaryInput:t.formatTimelineForSummarization(timeline,{timeAware:false})};
 });
 check(semantic.list.length===40&&semantic.list.every(x=>x.m.mediaData.quoteV1.sourceMessageId===x.src.id&&x.m.mediaData.quoteV1.sourceRole===x.src.role&&x.prompt.includes(x.src.id)),'40 bidirectional/self typed references retain ID, role, type and prompt');
 check(semantic.list.every(x=>semantic.stored.some(s=>s.id===x.m.id&&JSON.stringify(s.mediaData)===JSON.stringify(x.m.mediaData))),'typed references durably persisted in real IndexedDB');
 check(semantic.list.every(x=>semantic.timeline.some(e=>e.id===x.m.id&&e.content.includes(x.src.id)))&&JSON.stringify(semantic.memory).includes('引用'),'actual native timeline and short-term context retain source relationships');
 check(semantic.list.every(x=>semantic.summaryInput.eventsText.includes(x.src.id)),'actual summarization input retains quote source IDs');
 check(!JSON.stringify(semantic.list.map(x=>x.m)).includes('RAW_INTERNAL')&&!JSON.stringify(semantic.list.map(x=>x.m)).includes('RAW_LARGE_BODY'),'unknown/internal and large App body excluded from quote records');
 await fs.writeFile(path.join(output,'semantic-context.json'),JSON.stringify(semantic,null,2));
 const typedUI=semantic.list.filter((_,i)=>i<20&&i%2===0).map(x=>({role:x.m.role,content:x.m.content,mediaType:'quote',mediaData:x.m.mediaData}));
 const legacy=await page.evaluate(async()=>{
  const c=imTest.chat,t=quoteTest,s=c.loadChatSessions()[0];c.clearChatSessionMessages(s.id);
  const old=c.pushChatMessage({sessionId:s.id,role:'user',content:'Ambiguous old source'});
  for(let i=0;i<170;i++)c.pushChatMessage({sessionId:s.id,role:'user',content:'filler '+i});
  c.pushChatMessage({sessionId:s.id,role:'assistant',content:'Ambiguous old source'});
  const parsed=t.parseAIResponse('[引用:Ambiguous old source]No guessing',[]).parts;
  const ambiguous=c.pushChatMessage({sessionId:s.id,role:'assistant',...parsed[0]});
  const source=c.pushChatMessage({sessionId:s.id,role:'assistant',content:'One unique source'});
  const unique=c.pushChatMessage({sessionId:s.id,role:'assistant',...t.parseAIResponse('[引用:One unique source]\nSelf reply',[]).parts[0]});
  await t.flush();return{ambiguous,unique,source,old};
 });
 check(!legacy.ambiguous.mediaData.quoteV1&&!legacy.ambiguous.mediaData.quoteMessageId,'parser ambiguity beyond 160 messages never guesses source');
 check(legacy.unique.mediaData.quoteMessageId===legacy.source.id&&legacy.unique.mediaData.quoteRole==='assistant','actual parser resolves unique assistant self quote');
 // Each sender/source quadrant, no translation toggle in source preview.
 for(const replyRole of ['user','assistant'])for(const sourceRole of ['user','assistant']){
  const src={id:'original',sessionId:'fixture',role:sourceRole,content:'Foreign original | 中文不应出现'};
  const q=await page.evaluate(src=>quoteTest.createChatQuote(src),src);
  await scene([{role:replyRole,content:replyRole==='user'?'Ordinary text':'Incoming text',mediaType:'quote',mediaData:{quoteV1:q,quotePreview:q.preview}}]);
  const g=await page.locator('.fq-root').evaluate(el=>{const p=el.querySelector('.fq-preview'),b=el.querySelector('.fq-body'),outer=el.parentElement,c=el.querySelector('.fq-connector'),r=el.getBoundingClientRect(),pr=p.getBoundingClientRect();return {preview:p.textContent,controls:p.querySelectorAll('button,[role=button]').length,align:getComputedStyle(p).alignSelf,connectorTag:c.tagName,stroke:getComputedStyle(c).strokeWidth,mirror:getComputedStyle(c).transform,connectorPath:c.firstElementChild.getAttribute('d'),previewPath:p.querySelector('.fq-outline path').getAttribute('d'),bodyPath:b.querySelector('.fq-outline path').getAttribute('d'),bodyHeight:b.getBoundingClientRect().height,font:getComputedStyle(p).fontSize,left:pr.left-r.left,right:r.right-pr.right,outerBg:getComputedStyle(outer).backgroundColor,outline:outer.querySelectorAll(':scope > .im-text-outline').length,outerPad:getComputedStyle(outer).padding,bodyWidth:b.getBoundingClientRect().width,previewHeight:pr.height,rootWidth:r.width};});
  check(g.preview==='Foreign original'&&g.controls===0&&g.align===(sourceRole==='user'?'flex-end':'flex-start')&&g.connectorTag==='svg'&&g.stroke==='4px'&&(replyRole==='user'?g.mirror==='none':g.mirror.startsWith('matrix(-1'))&&g.outerBg==='rgba(0, 0, 0, 0)'&&g.outerPad==='0px'&&g.outline===0,'iMessage '+replyRole+' replying to '+sourceRole+': source placement, mirrored SVG connector, no double outline',g);
  check(Math.abs(sourceRole==='user'?g.right:g.left)<1&&g.rootWidth>320&&g.font==='13px'&&g.previewPath.includes(sourceRole==='user'?'ZM':'L13.2'),'preview attaches to source edge with original role-specific tail and compact text',g);
  const normal=ordinary[replyRole==='user'?0:1];
  check(g.bodyPath===normal.path&&g.bodyHeight===normal.height&&g.bodyWidth===normal.width,'reply SVG including tail exactly matches ordinary theme contour',g);
  await fs.writeFile(path.join(output,`geometry-${replyRole}-${sourceRole}.json`),JSON.stringify(g,null,2));
  await page.screenshot({path:path.join(output,`imessage-${replyRole}-${sourceRole}.png`)});
  // Ask the installed theme itself to render a normal bubble at preview size.
  // Compare exact paths; this oracle does not duplicate the contour algorithm.
  const size=await page.locator('.fq-preview').evaluate(e=>({width:e.getBoundingClientRect().width+'px',height:e.getBoundingClientRect().height+'px'}));
  await scene([{role:sourceRole,content:'Ordinary tail reference'}]);
  await page.locator('[data-ui^="bubble-"]').evaluate((e,size)=>{e.style.width=size.width;e.style.height=size.height;e.style.padding='0';},size);await settle();
  const themePath=await page.locator('[data-ui^="bubble-"] > .im-text-outline path').getAttribute('d');
  check(g.previewPath===themePath,`${sourceRole} preview uses exact installed ordinary-bubble geometry at preview size`,{preview:g.previewPath,theme:themePath,size});
 }
 // Acceptance gallery: real local thumbnail, both directions, compact voice.
 const photo=await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=90;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#b6c9ca';c.fillRect(0,0,90,128);c.fillStyle='#526e5b';c.fillRect(0,72,90,56);c.fillStyle='#e6bf7e';c.beginPath();c.arc(62,35,17,0,Math.PI*2);c.fill();return quoteTest.storeMediaBlob(await new Promise(r=>canvas.toBlob(r,'image/png')),'image/png','image');});
 const quoteMessage=(role,sourceRole,kind,extra={})=>({role,content:role==='user'?'测试':'收到你的引用',mediaType:'quote',mediaData:{quoteV1:{version:1,sourceRole,kind,preview:kind==='text'?"i don't deal in that currency":kind==='voice'?'[语音]':'[图片]',summary:'UI fixture',...extra}}});
 await scene([quoteMessage('user','assistant','text'),quoteMessage('user','assistant','voice',{duration:9}),quoteMessage('user','assistant','image',{imageRef:photo}),quoteMessage('assistant','user','text')]);
 await page.waitForFunction(()=>document.querySelector('.fq-thumb')?.naturalWidth>0);
 const mini=await page.locator('.fq-preview').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {kind:e.dataset.quoteKind,w:r.width,h:r.height,left:r.left,path:e.querySelector('.fq-outline path').getAttribute('d'),duration:e.querySelector('.fq-duration')?.textContent,image:e.querySelector('img')?.getBoundingClientRect().height};}));
 check(mini[1].w===148&&mini[1].h===38&&mini[1].duration==='00:09'&&mini[2].image===56&&mini[2].w<=88&&mini.slice(0,3).every(x=>Math.abs(x.left-16)<1),'text/voice/image smaller mini bubbles attach left with ordinary tails',mini);
 await page.screenshot({path:path.join(output,'acceptance-gallery.png')});
 await fs.writeFile(path.join(output,'mini-geometry.json'),JSON.stringify(mini,null,2));
 if(process.env.QUOTE_PREVIEW_BASELINE_PATH){const before=JSON.parse(await fs.readFile(process.env.QUOTE_PREVIEW_BASELINE_PATH,'utf8'));check(mini.every((m,i)=>m.w<before[i].w&&m.h<before[i].h),'all text/voice/image preview boxes shrink versus v1.1',{before,after:mini});}
 for(const sourceRole of ['assistant','user'])for(const kind of ['voice','image']){
  await scene([quoteMessage('user',sourceRole,kind,kind==='voice'?{duration:9}:{imageRef:photo})]);
  if(kind==='image')await page.waitForFunction(()=>document.querySelector('.fq-thumb')?.naturalWidth>0);
  const p=await page.locator('.fq-preview').evaluate(e=>({width:e.getBoundingClientRect().width+'px',height:e.getBoundingClientRect().height+'px',paths:[...e.querySelectorAll('.fq-outline path')].map(p=>p.getAttribute('d')),transforms:[...e.querySelectorAll('.fq-outline path')].map(p=>p.getAttribute('transform'))}));
  await scene([{role:sourceRole,content:'Ordinary tail reference'}]);
  await page.locator('[data-ui^="bubble-"]').evaluate((e,size)=>{e.style.width=size.width;e.style.height=size.height;e.style.padding='0';},p);await settle();
  const d=await page.locator('[data-ui^="bubble-"] > .im-text-outline path').getAttribute('d');
  check(p.paths.length===2&&p.paths.every(x=>x===d)&&p.transforms.every(x=>!x),`${sourceRole} ${kind} preview reuses ordinary contour without mirrored substitutes`,{preview:p,theme:d});
 }
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:874});
  await scene([{...quoteMessage('user','assistant','text',{preview:'Complete long original. '.repeat(35)}),content:'A full reply body that wraps across several lines. '.repeat(6)},quoteMessage('assistant','user','voice',{duration:13})]);
  const valid=await page.locator('.fq-root').evaluateAll(els=>els.every(e=>{const r=e.getBoundingClientRect(),p=e.querySelector('.fq-preview').getBoundingClientRect(),b=e.querySelector('.fq-body').getBoundingClientRect(),svg=e.querySelector('.fq-connector');const gap=e.dataset.replyRole==='user'?b.left-r.left:r.right-b.right;return gap>=63&&r.left>=0&&r.right<=innerWidth+1&&p.width<=Math.min(240,innerWidth*.68)+1&&svg.firstElementChild.getAttribute('d')&&!svg.firstElementChild.getAttribute('d').includes('NaN');}));
  check(valid,`responsive preview/connector geometry at ${width}px`);
 }
 await page.setViewportSize({width:402,height:874});
 // Native fallback and actual long text height.
 const actualCSS=await fs.readFile(path.join(theme,'聊天室CSS.txt'),'utf8');
 await scene(typedUI);
 check(await page.locator('.fq-imessage').count()===10&&!(await page.locator('.fq-preview').allTextContents()).join(' ').match(/RAW_INTERNAL|RAW_LARGE_BODY|中文语音|唯一中文翻译/),'iMessage DOM renders all ten message categories without raw data or source translations');
 await page.evaluate(()=>quoteTest.theme(''));await settle();
 await scene(typedUI);
 check(await page.locator('.fq-native').count()===10&&!(await page.locator('.fq-preview').allTextContents()).join(' ').match(/RAW_INTERNAL|RAW_LARGE_BODY|中文语音|唯一中文翻译/),'Float native DOM renders all ten message categories without raw data or source translations');
 await scene([{role:'assistant',content:'Native reply',mediaType:'quote',mediaData:{quotePreview:'Legacy original | 中文不显示',quoteRole:'user'}}]);
 check(await page.locator('.fq-native .fq-preview').textContent()==='Legacy original','Float native legacy preview shows safe original');
 await page.screenshot({path:path.join(output,'native.png')});
 await page.evaluate(()=>quoteTest.theme(quoteTest.CHAT_SESSION_CSS_EXAMPLE));await settle();
 check(await page.locator('.fq-native').count()===1&&await page.locator('.fq-preview').textContent()==='Legacy original','repository custom chat CSS example retains generic quote display');
 await page.evaluate(css=>quoteTest.theme(css),actualCSS);await settle();
 await scene([{role:'assistant',content:'Long reply',mediaType:'quote',mediaData:{quoteV1:{version:1,kind:'text',preview:'Long text with wrapping. '.repeat(70),summary:'Long text'}}}]);
 check(await page.locator('.fq-preview').evaluate(e=>{const r=e.getBoundingClientRect(),text=e.querySelector('.fq-text').getBoundingClientRect();return getComputedStyle(e).overflow==='visible'&&text.bottom<=r.bottom&&text.top>=r.top&&r.height>300;}),'full long quote preview wraps without height truncation (SVG tail intentionally overflows)');
 // Own URL cleanup, mounted voice has zero synthesis/play side effects.
 await page.evaluate(()=>{window.urlProbe={created:[],revoked:[],plays:0};window.quoteObservers=new Set();const observe=ResizeObserver.prototype.observe,disconnect=ResizeObserver.prototype.disconnect;ResizeObserver.prototype.observe=function(e,...args){if(e.matches('.fq-root'))quoteObservers.add(this);return observe.call(this,e,...args);};ResizeObserver.prototype.disconnect=function(){quoteObservers.delete(this);return disconnect.call(this);};const c=URL.createObjectURL,r=URL.revokeObjectURL;URL.createObjectURL=function(b){const u=c.call(this,b);urlProbe.created.push(u);return u;};URL.revokeObjectURL=function(u){urlProbe.revoked.push(u);return r.call(this,u);};HTMLMediaElement.prototype.play=function(){urlProbe.plays++;return Promise.resolve();};});
 const ref=await page.evaluate(async()=>{const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='),c=>c.charCodeAt(0));return quoteTest.storeMediaBlob(new Blob([bytes],{type:'image/png'}),'image/png','image');});
 await scene([{role:'user',content:'Photo reply',mediaType:'quote',mediaData:{quoteV1:{version:1,kind:'image',preview:'Photo',summary:'Photo',imageRef:ref}}},{role:'assistant',content:'Voice reply',mediaType:'quote',mediaData:{quoteV1:{version:1,kind:'voice',preview:'[语音]',summary:'transcript',duration:13}}},{role:'user',content:'Music reply',mediaType:'quote',mediaData:{quoteV1:{version:1,kind:'music',preview:'Song',summary:'Song Artist',artist:'Artist',coverUrl:ref}}}]);
 await page.waitForFunction(()=>document.querySelectorAll('.fq-preview img').length===2&&[...document.querySelectorAll('.fq-preview img')].every(e=>e.complete&&e.naturalWidth));
 check(await page.locator('.fq-duration').textContent()==='00:13'&&await page.locator('.fq-wave i').count()===15,'voice mini preview waveform and duration');
 check(await page.evaluate(()=>urlProbe.plays===0)&&!blocked.some(p=>/speech|tts|audio/i.test(p)),'mounting quote previews causes no TTS or media playback');
 check(await page.evaluate(()=>quoteObservers.size===3),'one local geometry observer per mounted quote');
 const idle=await page.evaluate(async()=>{let writes=0;const observer=new MutationObserver(records=>writes+=records.length);document.querySelectorAll('.fq-outline,.fq-connector').forEach(e=>observer.observe(e,{attributes:true,subtree:true}));await new Promise(r=>setTimeout(r,400));observer.disconnect();return writes;});
 check(idle===0,'settled quote geometry has no repeated SVG writes or layout loop',{idle});
 await page.screenshot({path:path.join(output,'media.png')});
 await page.evaluate(()=>imTest.leave());await settle();
 check(await page.evaluate(()=>quoteObservers.size===0),'quote geometry observers disconnected on room unmount');
 const urls=await page.evaluate(()=>urlProbe);check(urls.created.length===2&&urls.created.every(u=>urls.revoked.filter(x=>x===u).length===1),'image and cached music cover object URLs revoked exactly once',urls);
 await page.evaluate(()=>imTest.remount());await settle();
 await scene([{role:'assistant',content:'Unavailable',mediaType:'quote',mediaData:{quoteV1:{version:1,kind:'image',preview:'Photo',summary:'Photo',imageRef:'media-store://absent'}}}]);
 check(await page.locator('.fq-image-fallback').textContent()==='[图片]','missing image safely falls back');
 // Legacy inline photo lookup keeps the existing bytes only on the source row.
 const inline=await page.evaluate(async()=>{const c=imTest.chat,t=quoteTest,s=c.loadChatSessions()[0];c.clearChatSessionMessages(s.id);const src=c.pushChatMessage({sessionId:s.id,role:'user',content:'',mediaType:'image',mediaUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='});const q=t.createChatQuote(src);const reply=c.pushChatMessage({sessionId:s.id,role:'assistant',content:'Inline reply',mediaType:'quote',mediaData:{quoteV1:q}});await t.flush();imTest.remount();return{q,reply};});
 await page.waitForFunction(()=>document.querySelector('.fq-preview img')?.naturalWidth>0);
 check(!JSON.stringify(inline.reply).includes('base64')&&inline.q.imageFromSource,'ordinary inline single photo resolves source ID without duplicating image bytes');
 // Keep source photo and quote metadata through the native IndexedDB serializer.
 const backup=await page.evaluate(async()=>{const t=quoteTest,c=imTest.chat,rows=await t.chatDb.messages.toArray();const imported=JSON.parse(JSON.stringify(rows));await t.chatDb.messages.clear();await t.chatDb.messages.bulkPut(imported);await c.hydrateChatStorage();return JSON.stringify(await t.chatDb.messages.toArray())===JSON.stringify(rows);});
 check(backup,'quote metadata survives JSON round-trip and native IndexedDB rehydration');
 // Existing bounded message window and manual scroll anchor, with quote append.
 await scene(Array.from({length:110},(_,i)=>({role:i%2?'assistant':'user',content:'History '+i+' ordinary text for stable flow.'})));
 check(await page.locator('.chat-msg-wrapper[id^="message-"]').count()===50,'actual initial message window remains bounded at 50');
 await page.getByText('查看更多消息',{exact:true}).click();await settle();
 check(await page.locator('.chat-msg-wrapper[id^="message-"]').count()<=100,'incremental history loading remains bounded');
 const pane=page.locator('.page-body.chat-room-main-pane');await pane.hover();await page.mouse.wheel(0,-500);await settle();
 const anchor=await pane.evaluate(p=>{const pr=p.getBoundingClientRect(),e=[...p.querySelectorAll('[data-msg-id]')].find(e=>{const r=e.getBoundingClientRect();return r.top>pr.top+20&&r.bottom<pr.bottom-100;});return{id:e?.getAttribute('data-msg-id'),top:e?.getBoundingClientRect().top,scroll:p.scrollTop};});
 await page.evaluate(()=>{imTest.add({role:'assistant',content:'Appended quoted reply',mediaType:'quote',mediaData:{quoteV1:{version:1,sourceRole:'user',kind:'image',preview:'Photo',summary:'Photo',imageRef:'media-store://absent'}}});imTest.refresh();});await settle();
 const after=await page.locator('[data-msg-id="'+anchor.id+'"]').evaluate(e=>e.getBoundingClientRect().top);
 check(anchor.id&&Math.abs(after-anchor.top)<2,'quote append preserves manually scrolled visible message anchor',{before:anchor,after});
 // Real user action, then mocked provider captures final assembled input.
 await scene([{role:'assistant',content:'Unique original English | 唯一中文翻译'}]);
 await page.locator('[data-msg-id]').last().dispatchEvent('contextmenu',{bubbles:true,clientX:100,clientY:420});
 const button=page.locator('.ctx-menu-btn').filter({hasText:/^引用$/});await button.waitFor();await settle();await button.press('Enter');
 await page.locator('.chat-quote-bar').waitFor();await page.locator('.chat-input-textarea').fill('User actual quoted reply');
 await page.getByRole('button',{name:'发送',exact:true}).click();await settle();
 check(await page.evaluate(()=>imTest.chat.loadChatMessages(imTest.chat.loadChatSessions()[0].id).some(m=>m.role==='user'&&m.mediaData?.quoteV1?.preview==='Unique original English')),'actual context-menu quote + composer send persists typed user reference');
 await page.evaluate(()=>imTest.prepareStream());await settle();await page.evaluate(()=>imTest.requestReply());
 await page.waitForFunction(()=>imTest.chat.loadChatMessages(imTest.chat.loadChatSessions()[0].id).some(m=>m.role==='assistant'&&m.content==='Model reply'));
 const model=await page.evaluate(()=>imTest.chat.loadChatMessages(imTest.chat.loadChatSessions()[0].id).find(m=>m.content==='Model reply'));
 check(!!model.mediaData?.quoteMessageId&&model.mediaData.quoteRole==='assistant','model response through actual engine resolves own original source');
 check(requests.some(r=>JSON.stringify(r.body).includes('User actual quoted reply')&&JSON.stringify(r.body).includes('引用角色的text消息 id=')),'captured final outbound LLM request contains quote source and reply');
 reply='[引用:Unique plain user source]Model quotes user';
 await page.evaluate(()=>imTest.add({role:'user',content:'Unique plain user source'}));await page.evaluate(()=>imTest.requestReply());
 await page.waitForFunction(()=>imTest.chat.loadChatMessages(imTest.chat.loadChatSessions()[0].id).some(m=>m.content==='Model quotes user'));
 const userSource=await page.evaluate(()=>imTest.chat.loadChatMessages(imTest.chat.loadChatSessions()[0].id).find(m=>m.content==='Model quotes user'));
 check(!!userSource.mediaData?.quoteMessageId&&userSource.mediaData.quoteRole==='user','model response through actual engine quotes unique user source');
 await fs.writeFile(path.join(output,'requests.json'),JSON.stringify(requests,null,2));
 check(errors.length===0,'no browser pageerror',errors);
 await context.close();
}
main().catch(e=>{results.push({name:'harness',status:'FAIL',error:String(e),stack:e.stack});console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(r=>server?server.close(r):r());await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'results.json'),JSON.stringify({scope:'real desktop Chrome + actual ChatRoom and supplied theme files, synthetic localhost IndexedDB and mock LLM; no iPhone/provider acceptance',results,errors,blocked},null,2));});
