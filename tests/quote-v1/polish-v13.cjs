// Synthetic data only, with the user's CURRENT theme/reactions loaded by the
// parent harness. No substitute reactions renderer or media/model provider.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function({page,scene,settle,check,output}){
 const shots=[];
 const shot=async name=>{await page.screenshot({path:path.join(output,name+'.png')});shots.push(name+'.png');};
 const q=(role,sourceRole,kind,preview,extra={})=>({role,content:role==='user'?'我的回复':'收到这条引用',mediaType:'quote',mediaData:{quoteV1:{version:1,sourceRole,kind,preview,summary:preview,...extra}}});
 const thumbnail=async(w,h)=>page.evaluate(async({w,h})=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#b2723f';x.fillRect(0,0,w,h);x.fillStyle='#50786d';x.fillRect(0,h*.5,w,h*.5);x.fillStyle='#e4b95f';x.beginPath();x.arc(w*.65,h*.3,Math.min(w,h)*.15,0,Math.PI*2);x.fill();return quoteTest.storeMediaBlob(await new Promise(r=>c.toBlob(r,'image/png')),'image/png','image');},{w,h});
 const portrait=await thumbnail(90,128),landscape=await thumbnail(240,100);
 const create=async(role,kind,extra={})=>page.evaluate(({role,kind,extra})=>{const s=imTest.chat.loadChatSessions()[0];const src=imTest.add({role,content:'',mediaType:kind,...extra});return {src,quote:quoteTest.createChatQuote(src)};},{role,kind,extra});
 // Text: the first line/capsule and wrapping are independent of body direction.
 await scene([q('user','assistant','text','OK'),q('user','assistant','text','sounds like i work at a parlor'),q('assistant','user','text','Two original lines\nwith more breathing room'),q('user','assistant','text','One\nTwo\nThree')]);
 const text=await page.locator('.fq-preview').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect(),t=e.querySelector('.fq-text').getBoundingClientRect(),s=getComputedStyle(e);return {top:t.top-r.top,left:t.left-r.left,overflow:s.overflow,scale:e.querySelector('path').getAttribute('transform'),height:r.height};}));
 check(text.every(x=>x.top>=9&&x.left>=12&&x.overflow==='visible')&&text[0].scale!=='scale(1)'&&text[2].height>50&&text[2].height<60&&text[3].height>60,'P3/P4/P14 compact one/two/three-line preview padding and normalized short tail',text);
 const connector=await page.locator('.fq-connector').first().evaluate(e=>({color:getComputedStyle(e).stroke,box:e.getBoundingClientRect().width,d:e.firstElementChild.getAttribute('d'),gap:getComputedStyle(e.parentElement).rowGap}));
 check(connector.color==='rgba(233, 233, 237, 0.64)'&&connector.gap==='22px','P3/P4 translucent connector retains shorter preview/reply gap',connector);
 await shot('v13-text-directions');

 // Voice metadata versus the same text estimate used by the original voice bar.
 await scene([]);const voiceA=await create('assistant','audio',{mediaData:{label:'Where are you? | 你在哪？',voiceDuration:13}}),voiceB=await create('user','audio',{mediaData:{label:'A voice message without stored duration'}});
 const voiceRows=await scene([{...voiceA.src},{...voiceB.src},q('user','assistant','voice','[语音]',{sourceMessageId:voiceA.src.id}),{...q('assistant','user','voice','[语音]',{sourceMessageId:voiceB.src.id}),innerMonologue:'语音引用状态'}]);
 await page.waitForFunction(()=>[...document.querySelectorAll('.fq-duration')].every(e=>e.textContent!=='--:--'));
 const voice=await page.locator('.fq-voice').evaluateAll(els=>els.map(e=>{const w=e.querySelector('.fq-wave').getBoundingClientRect(),b=e.getBoundingClientRect(),time=e.querySelector('.fq-duration'),t=time.getBoundingClientRect();return {time:time.textContent,estimate:time.getAttribute('aria-label'),slotCenter:Math.abs((w.left+w.right-b.left-(t.left-8))/2),gap:t.left-w.right,waveHeight:w.height};}));
 check(voice[0].time==='00:13'&&voice[1].time==='00:10'&&voice[1].estimate==='估算时长'&&voice.every(x=>x.slotCenter<1&&x.gap>=8),'P5/P6 waveform centered in reserved slot, separate real/estimated clock; no audio decode',voice);
 await shot('v13-voice');
 await page.evaluate(ids=>{const data=imTest.plugins.readChatPluginData('imessage-reaction');for(const id of ids)data['user_reaction_'+id]='❤️';imTest.plugins.writeChatPluginData('imessage-reaction',data);imTest.remount();},voiceRows.slice(-2).map(m=>m.id));
 await page.waitForFunction(()=>document.querySelectorAll('.imrx-badge').length===2);await settle();
 check(await page.locator('.fq-root').evaluateAll(els=>els.every(e=>Math.abs(e.parentElement.querySelector('.imrx-badge').getBoundingClientRect().top-e.querySelector('.fq-body').getBoundingClientRect().top+28)<1)),'voice reactions also stay anchored to incoming/outgoing reply bodies');
 await shot('v13-voice-reactions');

 // Real images: all four directions, both aspect ratios, before any plugin badge.
 for(const [ratio,ref] of [['portrait',portrait],['landscape',landscape]])for(const replyRole of ['user','assistant'])for(const sourceRole of ['user','assistant']){
  await scene([]);const {src,quote}=await create(sourceRole,'image',{mediaUrl:ref});
  await scene([{...src},q(replyRole,sourceRole,'image','Photo',{...quote,sourceRole:undefined})]);
  await page.waitForFunction(({sourceRole})=>document.querySelector('.fq-root')?.dataset.sourceRole===sourceRole&&document.querySelector('.fq-thumb')?.naturalWidth>0,{sourceRole});
  const photo=await page.locator('.fq-root').evaluate(e=>{const p=e.querySelector('.fq-preview'),i=e.querySelector('.fq-thumb'),c=e.querySelector('.fq-connector'),r=p.getBoundingClientRect(),ir=i.getBoundingClientRect(),s=getComputedStyle(i);return {source:e.dataset.sourceRole,reply:e.dataset.replyRole,align:getComputedStyle(p).alignSelf,padding:getComputedStyle(p).padding,fit:s.objectFit,clip:s.clipPath,w:r.width,iw:ir.width,h:r.height,ih:ir.height,mirror:getComputedStyle(c).transform,outline:getComputedStyle(p.querySelector('.fq-outline')).visibility};});
  check(photo.padding==='0px'&&photo.fit==='cover'&&photo.clip.startsWith('path(')&&photo.w===photo.iw&&photo.ih===photo.h+8&&photo.outline==='hidden'&&photo.align===(sourceRole==='user'?'flex-end':'flex-start')&&(replyRole==='user'?photo.mirror==='none':photo.mirror.startsWith('matrix(-1')),`P7/P8/P9 ${ratio} photo covers body/tail; ${replyRole} quotes ${sourceRole}`,photo);
  await shot(`v13-image-${ratio}-${replyRole}-${sourceRole}`);
 }

 // Text image -> generated real image, without rewriting the already saved quote.
 await scene([]);const textImage=await create('assistant','image',{mediaData:{label:'深夜工位桌面上放着一罐冰乌龙茶和散落的便签纸'}});
 const saved=await scene([{...textImage.src},q('assistant','assistant','image',textImage.quote.preview,{...textImage.quote})]);
 const caption=await page.locator('.fq-image-text').evaluate(e=>{const s=e.querySelector('span'),r=e.getBoundingClientRect(),t=s.getBoundingClientRect();return {display:getComputedStyle(e).display,whiteSpace:getComputedStyle(s).whiteSpace,ellipsis:getComputedStyle(s).textOverflow,lineClamp:getComputedStyle(s).webkitLineClamp,center:Math.abs((r.top+r.bottom-t.top-t.bottom)/2),overflow:t.width<=r.width};});
 check(caption.display==='grid'&&caption.whiteSpace==='normal'&&caption.lineClamp==='4'&&caption.ellipsis==='ellipsis'&&caption.center<1&&caption.overflow,'P10/P11 text-image caption centered, multiline and bounded',caption);
 await shot('v13-text-image');
 const quoteBefore=await page.evaluate(id=>JSON.stringify(imTest.chat.loadChatMessages(imTest.chat.loadChatSessions()[0].id).find(m=>m.id===id)),saved[1].id);
 await page.evaluate(({id,ref})=>imTest.chat.updateChatMessage(id,{mediaUrl:ref,mediaData:{label:'深夜工位',imageGenerationStatus:'generated',imageGenerationMediaRef:ref}}),{id:textImage.src.id,ref:portrait});
 await page.waitForFunction(()=>document.querySelector('.fq-thumb')?.naturalWidth>0);
 const quoteAfter=await page.evaluate(id=>JSON.stringify(imTest.chat.loadChatMessages(imTest.chat.loadChatSessions()[0].id).find(m=>m.id===id)),saved[1].id);
 check(quoteBefore===quoteAfter,'P11 mounted preview refreshes after generation; saved quote snapshot unchanged');
 await shot('v13-generated-image');

 // Exact model history echo: source ID + session + type/role validation, view only.
 const raw=`[引用角色的image消息 id=${textImage.src.id}：[引用图片] 深夜工位[描述]]\n二次引用排版测试来咯`;
 const echoed=await scene([{...textImage.src,mediaUrl:portrait},{role:'assistant',content:raw,innerMonologue:'合成测试状态'}]);
 await page.waitForFunction(()=>document.querySelector('.fq-thumb')?.naturalWidth>0);
 check((await page.locator('.fq-body').innerText()).trim()==='二次引用排版测试来咯'&&!await page.locator('[data-ui^="bubble-"]').last().innerText().then(t=>t.includes('消息 id=')),'P9/P11 exact echoed history envelope becomes clean quote view');
 check(await page.evaluate(({id,raw})=>imTest.chat.loadChatMessages(imTest.chat.loadChatSessions()[0].id).find(m=>m.id===id).content===raw,{id:echoed[1].id,raw}),'echo display adapter leaves stored content and model/memory input untouched');
 await shot('v13-history-echo');
 await scene([q('user','assistant','text',raw)]);
 check(await page.locator('.fq-text').innerText()==='二次引用排版测试来咯','P11 re-quoting a saved echoed reply also hides its internal envelope');
 await scene([{role:'assistant',content:'[引用用户的image消息 id=missing：{"raw":"internal"}]\n资源缺失也保持整洁'}]);
 check(await page.locator('.fq-image-text').innerText()==='图片'&&!await page.locator('.fq-body').innerText().then(t=>t.includes('internal'))&&await page.locator('.fq-root').getAttribute('data-source-role')==='unknown','missing source echo uses neutral image fallback without inventing ownership');
 await scene([{...textImage.src,mediaUrl:portrait},{role:'assistant',content:`[引用用户的image消息 id=${textImage.src.id}：[引用图片]]\n不猜测冲突的归属`}]);
 await settle();
 check(await page.locator('.fq-root').getAttribute('data-source-role')==='unknown'&&await page.locator('.fq-thumb').count()===0,'echo role mismatch declines source attachment rather than guessing');

 // Real installed plugin badges stay owned by the outer message; only their
 // body-local visual anchor changes. Heart retains its original click handler.
 for(const wallpaper of [false,true]){
  await page.evaluate(w=>{if(!w){imTest.wallpaper(false);return;}const c=document.createElement('canvas');c.width=402;c.height=874;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,874);g.addColorStop(0,'#758c9d');g.addColorStop(.55,'#b7a58c');g.addColorStop(1,'#263840');x.fillStyle=g;x.fillRect(0,0,402,874);for(let i=0;i<8;i++){const left=i*56-12,h=170+(i*53)%210;x.fillStyle=i%2?'#314854':'#425c66';x.fillRect(left,874-h,50,h);x.fillStyle='#c1aa71';for(let y=890-h;y<840;y+=29)for(let a=left+8;a<left+45;a+=15)x.fillRect(a,y,4,8);}const s=imTest.chat.loadChatSessions()[0];imTest.chat.saveChatSessions([{...s,backgroundImage:c.toDataURL('image/png')}]);imTest.remount();},wallpaper);await settle();
  const rows=await scene([q('user','assistant','text','happy to be of service'),{...q('assistant','user','image','这是一张图片',{imageRef:landscape}),innerMonologue:'合成测试：查看状态'},q('assistant','assistant','music','Sunflower',{artist:'Post Malone / Swae Lee',coverUrl:portrait})]);
  await page.evaluate(ids=>{const data=imTest.plugins.readChatPluginData('imessage-reaction');for(const id of ids)data['user_reaction_'+id]='‼️';imTest.plugins.writeChatPluginData('imessage-reaction',data);imTest.remount();},rows.map(m=>m.id));
  await page.waitForFunction(()=>document.querySelectorAll('.fq-root').length===3&&document.querySelectorAll('.imrx-badge').length===3);await settle();
  const anchors=await page.locator('.fq-root').evaluateAll(els=>els.map(e=>{const b=e.querySelector('.fq-body').getBoundingClientRect(),outer=e.parentElement,p=e.querySelector('.fq-preview').getBoundingClientRect(),badge=outer.querySelector(':scope > .imrx-badges .imrx-badge').getBoundingClientRect(),heart=e.closest('.chat-msg-wrapper').querySelector(':scope > button.chat-monologue-heart')?.getBoundingClientRect();return {reply:e.dataset.replyRole,bodyTop:b.top,bodyLeft:b.left,bodyRight:b.right,previewBottom:p.bottom,badgeTop:badge.top,badgeLeft:badge.left,badgeRight:badge.right,heartLeft:heart?.left,heartTop:heart?.top,bodyBottom:b.bottom};}));
  check(anchors.every(a=>Math.abs(a.badgeTop-(a.bodyTop-28))<1&&(a.reply==='user'?Math.abs(a.badgeLeft-(a.bodyLeft-14))<1:Math.abs(a.badgeRight-(a.bodyRight+14))<1)&&a.badgeTop>a.previewBottom),`P1/P2 reactions anchor to real reply, text/image/music (${wallpaper?'wallpaper':'white'})`,anchors);
  check(anchors[1].heartLeft>=anchors[1].bodyRight+5&&anchors[1].heartLeft<=anchors[1].bodyRight+8&&Math.abs(anchors[1].heartTop-(anchors[1].bodyBottom-22))<1,`P12/P13 heart stays beside reply (${wallpaper?'wallpaper':'white'})`,anchors[1]);
  await shot(wallpaper?'v13-accessories-wallpaper':'v13-accessories-white');
  await page.locator('button.chat-monologue-heart').click();await settle();
  check(await page.getByText('合成测试：查看状态',{exact:true}).isVisible(),`heart keeps original status interaction (${wallpaper?'wallpaper':'white'})`);
  await page.locator('button.chat-monologue-heart').click();await settle();
  await page.locator('.imrx-badge').first().click();await page.locator('.imrx-context:not([hidden])').waitFor();
  check(await page.locator('.imrx-emoji').count()>0,`existing reaction opens original plugin picker (${wallpaper?'wallpaper':'white'})`);
  const choice=page.locator('.imrx-emoji[aria-pressed="false"]').first(),emoji=await choice.getAttribute('aria-label');
  await choice.click();
  await page.waitForFunction(({id,emoji})=>imTest.plugins.readChatPluginData('imessage-reaction')['user_reaction_'+id]===emoji,{id:rows[0].id,emoji});
  check(true,`original plugin still saves a changed reaction (${wallpaper?'wallpaper':'white'})`);
  await page.locator('.imrx-badge').first().click();await page.locator('.imrx-context:not([hidden])').waitFor();
  await page.locator('.imrx-context button[aria-label="移除我的回应"]').click();
  await page.waitForFunction(id=>!imTest.plugins.readChatPluginData('imessage-reaction')['user_reaction_'+id],rows[0].id);
  check(await page.locator('.imrx-badge').count()===2,`original plugin removes only the selected reaction (${wallpaper?'wallpaper':'white'})`);
 }
 await page.evaluate(()=>imTest.wallpaper(false));await settle();
 await page.evaluate(()=>quoteTest.theme(''));await settle();
 await scene([q('user','assistant','image','Photo',{imageRef:portrait}),q('assistant','user','image','文字图片很长的说明也不应溢出或显示内部结构'),q('user','assistant','voice','[语音]',{duration:11}),q('assistant','user','music','Sunflower',{artist:'Artist',coverUrl:portrait}),{role:'assistant',content:'[引用用户的image消息 id=missing：[引用图片] RAW_INTERNAL]\n原生主题也保持整洁'}]);
 await page.waitForFunction(()=>document.querySelectorAll('.fq-preview img').length===2&&[...document.querySelectorAll('.fq-preview img')].every(e=>e.naturalWidth>0));
 check(await page.locator('.fq-native').count()===5&&!/RAW_INTERNAL|消息 id=/.test((await page.locator('.fq-root').allTextContents()).join(' ')),'Float native fallback covers photo/text-image/voice/music/echo without internal structures');
 await shot('v13-native-fallback');
 await page.evaluate(async()=>quoteTest.theme(await(await fetch('/theme/current/iMessage-Native-Day.css')).text()));await settle();
 await fs.writeFile(path.join(output,'v13-screenshots.json'),JSON.stringify(shots,null,2));
};
