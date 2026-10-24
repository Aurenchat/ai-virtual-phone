// v1.3 IPA feedback: current installed plugins, real ChatRoom + IndexedDB,
// synthetic media only. Baseline mode records the same cases without assertions.
const fs=require('node:fs/promises'),path=require('node:path');
module.exports=async function({page,scene,settle,check,output,before=false}){
 const shots=[],observations=[];
 const verify=(ok,name,details)=>{observations.push({name,ok,details});if(!before)check(ok,name,details);};
 const shot=async name=>{await page.screenshot({path:path.join(output,name+'.png')});shots.push(name+'.png');};
 const q=(role,sourceRole,kind,preview,extra={})=>({role,content:role==='user'?'我的回复':'收到这条引用',mediaType:'quote',mediaData:{quoteV1:{version:1,sourceRole,kind,preview,summary:preview,...extra}}});
 const caption='深夜工位桌面上放着一罐开了拉环的冰乌龙茶，旁边是亮着的机械键盘和散落的便签纸，窗外是泛着微光的城市夜景';
 const ref=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=120;c.height=180;const x=c.getContext('2d');x.fillStyle='#1b344d';x.fillRect(0,0,120,180);x.fillStyle='#92734e';x.fillRect(0,110,120,70);x.fillStyle='#b6d1c2';x.fillRect(22,72,24,62);x.fillStyle='#a6b9d4';x.fillRect(62,100,45,24);return quoteTest.storeMediaBlob(await new Promise(r=>c.toBlob(r,'image/png')),'image/png','image');});
 for(const wallpaper of [false,true]){
  await page.evaluate(w=>imTest.wallpaper(w),wallpaper);await settle();
  await scene([q('user','assistant','voice','[语音]',{duration:45}),q('assistant','user','voice','[语音]',{duration:2}),q('assistant','assistant','voice','[语音]',{duration:615})]);
  const voiceRects=()=>page.locator('.fq-voice').evaluateAll(es=>es.map(e=>{const clock=e.querySelector('.fq-duration'),b=e.getBoundingClientRect(),w=e.querySelector('.fq-wave').getBoundingClientRect(),t=clock.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(clock);const glyph=range.getBoundingClientRect();return{left:w.left-b.left,right:b.right-glyph.right,gap:glyph.left-w.right,vertical:Math.abs((w.top+w.bottom-t.top-t.bottom)/2),time:clock.textContent,font:getComputedStyle(clock).fontSize};}));
  let voice=await voiceRects();
  verify(voice.every(x=>x.gap>=7&&x.left>=0&&x.right>=-.1&&x.vertical<1),'voice fixed waveform and clock occupy separate centered columns '+wallpaper,voice);
  await shot(wallpaper?'v14-voice-wallpaper':'v14-voice-white');
  const bigger=await page.addStyleTag({content:'.fq-imessage .fq-duration {font-size:17px !important;}'});
  voice=await voiceRects();
  verify(voice.every(x=>x.gap>=7&&x.vertical<1),'voice enlarged clock never overlaps waveform '+wallpaper,voice);
  await shot(wallpaper?'v14-voice-large-clock-wallpaper':'v14-voice-large-clock-white');await bigger.evaluate(e=>e.remove());
 }
 await page.evaluate(()=>imTest.wallpaper(false));await settle();
 for(const [sourceRole,replyRole,space] of [['assistant','assistant',''],['assistant','assistant',' '],['user','assistant','']]){
  await scene([]);
  const src=await page.evaluate(({role,ref,caption})=>imTest.add({role,content:'',mediaType:'image',mediaUrl:ref,mediaData:{label:caption,imageGenerationMediaRef:ref,imageGenerationStatus:'generated'}}),{role:sourceRole,ref,caption});
  const who=sourceRole==='user'?'用户':'角色',raw='[引用'+who+'的image消息'+space+'id='+src.id+':[引用图片]'+caption+']\n二次引用排版测试来咯';
  const rows=await scene([{...src},{role:replyRole,content:raw,innerMonologue:replyRole==='assistant'?'图片引用状态':undefined}]);
  await settle();
  if(!before)await page.waitForFunction(()=>document.querySelector('.fq-thumb')?.naturalWidth>0);
  const info=await page.locator('.fq-root').count()?await page.locator('.fq-root').evaluate(e=>({kind:e.querySelector('.fq-preview').dataset.quoteKind,source:e.dataset.sourceRole,reply:e.dataset.replyRole,image:!!e.querySelector('.fq-thumb')?.naturalWidth,body:e.querySelector('.fq-body').textContent,mirror:getComputedStyle(e.querySelector('.fq-connector')).transform})):null;
  verify(info?.kind==='image'&&info.source===sourceRole&&info.image&&info.body==='二次引用排版测试来咯'&&(replyRole==='user'?info.mirror==='none':info.mirror.startsWith('matrix(-1')),'explicit image echo accepts optional whitespace with verified source '+sourceRole+'/'+replyRole+'/'+JSON.stringify(space),info);
  verify(await page.evaluate(({id,raw})=>imTest.chat.loadChatMessages(imTest.chat.loadChatSessions()[0].id).find(m=>m.id===id).content===raw,{id:rows[1].id,raw}),'image echo display leaves saved raw/model input unchanged '+sourceRole+'/'+replyRole);
  await shot('v14-image-echo-'+sourceRole+'-'+replyRole+(space?'-space':''));
 }
 await scene([{role:'assistant',content:'[引用角色的image消息id=missing:[引用图片]'+caption+']\n图片资源缺失'},q('assistant','user','image',caption),q('user','assistant','image','图片'),{role:'assistant',content:'旧版图片引用',mediaType:'quote',mediaData:{quotePreview:'图片',quoteRole:'user'}}]);
 const placeholders=await page.locator('.fq-root').evaluateAll(es=>es.map(e=>{const p=e.querySelector('.fq-preview'),r=p.getBoundingClientRect(),t=p.querySelector('.fq-image-text span');const tr=t?.getBoundingClientRect(),s=t&&getComputedStyle(t);return{kind:p.dataset.quoteKind,w:r.width,h:r.height,source:e.dataset.sourceRole,text:p.textContent,multiline:s?.whiteSpace!=='nowrap',center:tr&&Math.abs((tr.top+tr.bottom-r.top-r.bottom)/2),bounded:tr&&tr.left>=r.left+5&&tr.right<=r.right-5,lines:s&&tr.height/parseFloat(s.lineHeight)};}));
 verify(placeholders.length===4&&placeholders.every(x=>x.kind==='image'&&x.h>x.w&&x.bounded&&x.center<1&&x.multiline)&&placeholders[0].lines>=3&&placeholders[0].lines<=4.1,'all unavailable images and legacy image markers stay portrait; caption is centered multiline',placeholders);
 await shot('v14-image-placeholders');
 // Real media resource failure must use the same description card as no-ref images.
 await scene([q('assistant','user','image',caption,{imageRef:'media-store://missing'}),q('user','assistant','text','图片',{sourceType:'text'})]);
 verify(await page.locator('.fq-preview').first().getAttribute('data-quote-kind')==='image'&&await page.locator('.fq-preview').first().innerText()===caption&&await page.locator('.fq-preview').last().getAttribute('data-quote-kind')==='text','failed media retains description image card; explicitly typed text is not reclassified');
 await shot('v14-image-resource-failure');
 await scene([]);
 const upload=await page.evaluate(ref=>imTest.add({role:'user',content:'',mediaType:'media_file',mediaUrl:ref,mediaData:{fileType:'image',label:'上传的照片'}}),ref);
 await scene([{...upload},{role:'assistant',content:'[引用用户的image消息id='+upload.id+':[引用图片]上传的照片]\n文件型图片也显示缩略图'}]);
 if(!before)await page.waitForFunction(()=>document.querySelector('.fq-thumb')?.naturalWidth>0);
 verify(await page.locator('.fq-preview[data-quote-kind="image"] .fq-thumb').count()===1,'exact source ID accepts file-image display category without changing source type');
 await shot('v14-file-image');
 await scene([{role:'assistant',content:'[引用用户的media_file消息id=missing:[引用图片]'+caption+']\n文件图片缺失'}]);
 verify(await page.locator('.fq-preview[data-quote-kind="image"]').count()===1,'explicit image summary keeps file-image fallback portrait');
 for(const wallpaper of [false,true]){
  await page.evaluate(w=>imTest.wallpaper(w),wallpaper);await settle();
  await scene([q('user','assistant','text','happy to be of service'),q('assistant','user','voice','[语音]',{duration:45}),q('assistant','assistant','music','Sunflower',{artist:'Post Malone / Swae Lee',coverUrl:ref}),q('user','assistant','image','图片',{imageRef:ref})]);
  if(!before)await page.waitForFunction(()=>[...document.querySelectorAll('.fq-preview img')].every(i=>i.naturalWidth>0));
  const material=await page.locator('.fq-preview').evaluateAll(es=>es.map(e=>{const g=e.querySelector('.fq-glass'),s=g&&getComputedStyle(g);return{kind:e.dataset.quoteKind,glass:!!g,clip:s?.clipPath,blur:s?.backdropFilter||s?.webkitBackdropFilter,opacity:getComputedStyle(e.querySelector('.fq-outline')).opacity};}));
  verify(material.filter(x=>x.kind!=='image').every(x=>x.glass&&x.clip.startsWith('path(')&&x.blur?.includes('6px')&&+x.opacity<1)&&material.find(x=>x.kind==='image').glass===false,'non-image bubbles use bounded translucent glass; real images stay cover '+wallpaper,material);
  const connector=await page.locator('.fq-connector').first().evaluate(e=>({width:getComputedStyle(e).strokeWidth,stroke:getComputedStyle(e).stroke,paths:e.querySelectorAll('path').length,filter:getComputedStyle(e).filter}));
  verify(connector.paths===2&&connector.stroke.includes('0.64')&&connector.width==='4px'&&connector.filter==='none','connector translucent base and highlight keep geometry without filters '+wallpaper,connector);
  await shot(wallpaper?'v14-glass-wallpaper':'v14-glass-white');
 }
 await scene([q('user','assistant','text','Complete original text. '.repeat(80))]);
 verify(await page.locator('.fq-preview').evaluate(e=>e.getBoundingClientRect().height>160&&e.dataset.glassBlur==='false'&&!!e.querySelector('.fq-glass')&&getComputedStyle(e.querySelector('.fq-glass')).backdropFilter==='none'),'tall text glass avoids large blur surface');
 await page.evaluate(()=>quoteTest.theme(''));await settle();
 await scene([q('assistant','user','image',caption),{role:'assistant',content:'[引用角色的image消息id=missing:[引用图片]'+caption+']\n原生主题图片占位'},q('user','assistant','voice','[语音]',{duration:45})]);
 verify(await page.locator('.fq-native .fq-preview[data-quote-kind="image"]').count()===2&&!(await page.locator('.fq-root').allTextContents()).join(' ').includes('消息id='),'Float native image fallback remains portrait and hides recognized internal envelope');
 await shot('v14-native-fallback');
 await page.evaluate(async()=>quoteTest.theme(await(await fetch('/theme/current/iMessage-Native-Day.css')).text()));await page.evaluate(()=>imTest.wallpaper(false));await settle();
 await fs.writeFile(path.join(output,'v14-screenshots.json'),JSON.stringify(shots,null,2));
 await fs.writeFile(path.join(output,'v14-observations.json'),JSON.stringify(observations,null,2));
};
