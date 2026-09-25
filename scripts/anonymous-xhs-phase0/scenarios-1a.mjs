import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
let sequence=0;
export function modelResponse(body){
 const messages=body.messages||[],text=JSON.stringify(messages);const kind=text.match(/\[ANON_TASK:([^\]]+)\]/)?.[1];
 const ctx=messages.map(m=>typeof m.content==='string'?m.content:'').find(x=>x.includes('"platform"'));
 let parsed;try{parsed=JSON.parse(ctx?.slice(ctx.indexOf('{')));}catch{}
 const self=parsed?.platform?.selfAccount?.displayName||'网络昵称';const note=parsed?.feed?.[0]?.noteId||'';
 sequence++;
 if(kind==='nickname')return JSON.stringify({displayName:text.includes('PERSONA_ALPHA')?'nullsignal':'burnttoast'});
 if(kind==='feed')return Array.from({length:6},(_,i)=>`#首页笔记${i+1}\n[作者]灰蓝胶片${sequence}_${i}\n[标题]周末的光 ${i+1}\n[正文]下午绕路去河边走了走，带了相机但最后一直在看云。\n[图片描述]傍晚的河面反射橘色灯光\n[图标]📷\n[点赞]${20+i}\n[收藏]3\n[标签]摄影、日常\n[评论1作者]今天吃什么${sequence}_${i}\n[评论1内容]这个光线刚刚好`).join('\n\n');
 if(kind==='activity')return `#评论1\n[笔记ID]${note}\n[内容]下次试试再晚一点。\n[点赞]是\n[收藏]否\n\n#发帖1\n[类型]笔记\n[标题]${self}的周末\n[正文]出门走了很久，回来才发现没买咖啡。\n[图标]☕\n[点赞]16\n[收藏]2\n[评论数]1\n[评论1作者]citywalk_${sequence}\n[评论1内容]我也经常忘记。`;
 if(kind==='reaction'||kind==='reply')return '#角色互动\n[评论]十五米这个分组不错。\n[点赞]是\n[收藏]否';
 if(kind==='npc-reply')return `#评论回复\n[评论1作者]路过的胶片${sequence}\n[评论1内容]先试试下午的光。\n[评论1回复评论ID]${parsed?.replyToCommentId||''}`;
 if(kind==='npc-reaction')return `#用户笔记互动\n[点赞]8\n[收藏]2\n[评论1作者]城市漫步${sequence}\n[评论1内容]这张图拍得挺清楚。`;
 return 'UNEXPECTED_TASK';
}
export async function run({page,step,origin,captures,setDelay,repo,output}){
 const manifest=JSON.parse(await fs.readFile(path.join(repo,'custom-apps/anonymous-xiaohongshu/manifest.json'),'utf8'));
 const fixture=await fs.readFile(path.join(repo,`custom-apps/anonymous-xiaohongshu/anonymous-xiaohongshu-${manifest.version}.zip`),'base64');
 await fs.writeFile(path.join(output,'installed-artifact.json'),JSON.stringify({file:`anonymous-xiaohongshu-${manifest.version}.zip`,sha256:createHash('sha256').update(Buffer.from(fixture,'base64')).digest('hex'),installedAt:new Date().toISOString(),host:'real CustomAppRunner/importer/storage, isolated Edge profile',model:'deterministic local HTTP fixture'},null,2));
 await step('install-built-zip-in-real-host',async()=>{
  await page.evaluate(async({origin,fixture})=>{const p=window.phase0,now=new Date().toISOString(),canvas=document.createElement('canvas');canvas.width=40;canvas.height=40;const ctx=canvas.getContext('2d');ctx.fillStyle='#d88956';ctx.fillRect(0,0,40,40);const avatar=canvas.toDataURL();
   p.chars.saveCharacters([{id:'private-alpha',name:'Krueger',persona:'PERSONA_ALPHA: reserved, patient photographer.',avatar,createdAt:now,updatedAt:now},{id:'private-beta',name:'Soap',persona:'PERSONA_BETA: cheerful, direct and curious.',avatar,createdAt:now,updatedAt:now}]);
   p.settings.saveApiConfigs([{id:'capture',provider:'Custom',baseUrl:origin+'/v1',apiKey:'fixture-only',defaultModel:'fixture',enableImageRecognition:true}]);
   p.settings.saveUserIdentities([{id:'human',name:'Chloe',bio:'GLOBAL_IDENTITY_SECRET kk = Chloe'}]);const preset=p.settings.loadPresets().find(x=>x.builtIn);
   p.settings.saveBindingConfig({globalDefaults:{apiConfigId:'capture',presetId:preset.id,userIdentityId:'human'},appDefaults:{},characterBindings:[],auxiliaryApiBindings:{memorySummaryApiConfigId:'capture'}});
   p.memory.saveMemoryConfig({...p.DEFAULT_MEMORY_CONFIG,autoSummarizeEnabled:false,autoBuildCoreEnabled:false,vectorRecallEnabled:false});
   for(const id of ['private-alpha','private-beta']){const session=p.chat.createOrGetSession(id);p.chat.pushChatMessage({sessionId:session.id,role:'user',content:'CHAT_SECRET kk = Chloe'});await p.memory.saveMemoryEntry({id:'legacy-'+id,characterId:id,sourceApp:'chat',type:'long_term',content:'LEGACY_SECRET kk = Chloe',importance:1,createdAt:now,updatedAt:now});p.kv.kvSet('ai_phone_xiaohongshu_events_'+id,JSON.stringify([{id:'ordinary',timestamp:now,content:'ORDINARY_SECRET kk = Chloe'}]));}
   p.app=await p.apps.installCustomAppAsync(await p.apps.loadCustomAppPackage(new File([Uint8Array.from(atob(fixture),c=>c.charCodeAt(0))],'phase1a.zip')));p.mount(p.app);
  },{origin,fixture});
  await page.addStyleTag({content:'html,body{margin:0} iframe{width:390px!important;height:844px!important;border:0!important;display:block}'});
  return manifest;
 });
 const frame=async()=>{await page.waitForSelector('iframe');return (await page.$('iframe')).contentFrame();};
 const state=async()=> (await frame()).evaluate(async()=>{const s=await window.AiPhone.db.get('phase1a_state','state');if(s?.noteIds)s.platform.notes=await Promise.all(s.noteIds.map(id=>window.AiPhone.db.get('notes_v2',id)));return s;});
 const idle=async()=>{for(let i=0;i<180;i++){const s=await state();if(s?.jobs.length&&s.jobs.every(j=>j.status==='done'||j.status==='error')&&!s.outbox.length){await fs.writeFile(path.join(output,'state-fixture.json'),JSON.stringify(s,null,2));assert.deepEqual(s.jobs.filter(j=>j.status==='error').map(j=>j.error),[]);return s;}await new Promise(r=>setTimeout(r,500));}throw Error('Generation did not settle');};
 await step('human-only-initialization',async()=>{const f=await frame();await f.getByLabel('匿名昵称',{exact:true}).fill('moth');await f.getByLabel('简介',{exact:true}).fill('记录一点日常');await f.getByRole('button',{name:'保存匿名账号'}).click();await f.getByRole('button',{name:'生成小红书内容',exact:true}).last().waitFor();const s=await state();assert(s.userAccountId);assert.equal(s.bindings.length,1);return {userAccountId:s.userAccountId};});
 await step('native-feed-and-two-automatic-character-accounts',async()=>{const f=await frame();await f.getByRole('button',{name:'生成小红书内容',exact:true}).last().click();const s=await idle();assert.equal(s.bindings.filter(b=>b.ownerKind==='character').length,2);assert.equal(s.platform.notes.filter(n=>n.source==='character').length,2);assert.equal(s.platform.notes.filter(n=>n.source==='npc').length,6);assert.equal(await f.locator('.cp-xhs-waterfall-column').count(),2);assert.equal(await f.locator('.cp-xhs-note-card').count(),8);await page.locator('iframe').screenshot({path:path.join(output,'installed-feed.png')});return {accounts:Object.values(s.accounts).map(a=>({accountId:a.accountId,displayName:a.displayName})),notes:s.platform.notes.length};});
 await step('character-card-avatar-ui-and-stable-rename',async()=>{const f=await frame();await f.getByRole('button',{name:'设置',exact:true}).click();await f.getByLabel('Krueger 匿名昵称').fill('deadchannel');await f.locator('.anon-character-setting').filter({hasText:'Krueger'}).getByRole('button',{name:'修改'}).click();await f.waitForFunction(async()=>{const s=await window.AiPhone.db.get('phase1a_state','state');return Object.values(s.accounts).some(a=>a.displayName==='deadchannel');});const s=await state(),b=s.bindings.find(b=>b.ownerId==='private-alpha');assert.equal(s.accounts[b.accountId].aliases[0],'nullsignal');assert(s.platform.notes.some(n=>n.authorId===b.accountId));assert((await f.locator('.anon-character-setting img').first().getAttribute('src')).startsWith('data:image/png'));await page.locator('iframe').screenshot({path:path.join(output,'account-settings.png')});await f.getByRole('button',{name:'返回',exact:true}).click();return {accountId:b.accountId};});
 await step('publish-real-image-close-iframe-recover-once',async()=>{
  const f=await frame();await f.getByRole('button',{name:'发布',exact:true}).click();await f.getByLabel('笔记标题').fill('15m, ten rounds.');await f.getByLabel('笔记正文').fill('今天的记录。');
  const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=100;const x=c.getContext('2d');x.fillStyle='navy';x.fillRect(0,0,80,100);return c.toDataURL().split(',')[1];});
  await f.getByLabel('帖子图片').setInputFiles({name:'target.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});await f.locator('.xhs-publish-grid-item img').waitFor();setDelay(1800);const before=captures.length;
  await f.getByRole('button',{name:'发布笔记',exact:true}).click();while(captures.length===before)await new Promise(r=>setTimeout(r,80));await page.evaluate(()=>window.phase0.close());await new Promise(r=>setTimeout(r,2200));setDelay(0);await page.evaluate(()=>window.phase0.mount(window.phase0.app));const s=await idle();const note=s.platform.notes.find(n=>n.source==='user');assert.equal(note.comments.length,3);assert.equal(note.likeCount,10);assert(note.imageAssetIds.length===1);
  await page.evaluate(()=>{window.phase0.close();window.phase0.mount(window.phase0.app);});const after=await state();assert.equal(after.platform.notes.find(n=>n.id===note.id).comments.length,3);return {noteId:note.id,comments:note.comments.length,image:true};
 });
 await step('native-detail-and-comment-reply-loop',async()=>{const f=await frame();await f.locator('.cp-xhs-note-card').filter({hasText:'15m, ten rounds.'}).click();await f.locator('.cp-xhs-note-detail').waitFor();assert.equal(await f.locator('.xhs-note-real-image').count(),1);await f.getByLabel('说点什么',{exact:true}).fill('下次试试别的距离。');await f.getByRole('button',{name:'发送',exact:true}).click();const s=await idle();const n=s.platform.notes.find(n=>n.source==='user');assert.equal(n.comments.length,7);await page.locator('iframe').screenshot({path:path.join(output,'post-detail.png')});await f.getByRole('button',{name:'返回',exact:true}).click();return {comments:n.comments.length};});
 await step('final-provider-payload-identity-projection',async()=>{
  assert(captures.length>=8);for(const cap of captures){const text=JSON.stringify(cap.body);for(const forbidden of ['kk = Chloe','GLOBAL_IDENTITY_SECRET','CHAT_SECRET','LEGACY_SECRET','ORDINARY_SECRET','ownerId','ownerKind','private-alpha','private-beta'])assert(!text.includes(forbidden),forbidden);assert(text.includes('Host required policy'));assert(text.includes('禁止根据文风'));assert(!(text.includes('PERSONA_ALPHA')&&text.includes('PERSONA_BETA')));}
  const visual=captures.filter(c=>c.body.messages.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==='image_url')));assert.equal(visual.length,6);return {requests:captures.length,multimodal:visual.length};
 });
 await step('source-memory-projection',async()=>{const results=await page.evaluate(async()=>{const p=window.phase0;return Promise.all(['private-alpha','private-beta'].map(id=>p.memory.loadMemoryEntries(id)));});for(const entries of results){assert(entries.some(e=>e.provenance&&e.content.includes('[匿名小红书]')&&e.content.includes('accountId')));}return results.map(e=>e.filter(m=>m.provenance).length);});
  await step('full-host-reload-persistence',async()=>{const before=await state();await page.reload();await page.waitForFunction(()=>!!window.phase0);await page.evaluate(async()=>{const p=window.phase0;await p.ready();p.app=p.apps.loadInstalledCustomApps().find(a=>a.manifest.id==='anonymous.xiaohongshu');p.mount(p.app);});const after=await state();assert.equal(after.userAccountId,before.userAccountId);assert.deepEqual(after.accounts,before.accounts);assert.equal(after.platform.notes.length,before.platform.notes.length);return {notes:after.platform.notes.length,accounts:Object.keys(after.accounts).length};});
 await step('original-home-card-dom-comparison',async()=>{
  const s=await state(),f=await frame();await f.locator('.cp-xhs-note-card').first().waitFor();
  const port=await f.locator('.cp-xhs-note-card').first().evaluate(el=>[el,...el.querySelectorAll('*')].map(e=>({tag:e.tagName,classes:e.className?.baseVal??e.className})));
  await page.evaluate(s=>{const p=window.phase0;p.close();p.nativeStorage.saveXiaohongshuState(s.platform);p.mountNative();},s);
  await page.addStyleTag({url:origin+'/styles/checkphone.css'});await page.addStyleTag({url:origin+'/styles/xiaohongshu.css'});
  await page.addStyleTag({content:'html,body{margin:0;width:390px;height:844px}#app{width:390px;height:844px}#app>.xhs-app{position:relative;inset:auto;width:390px;height:844px}'});
  await page.locator('.cp-xhs-note-card').first().waitFor();
  const native=await page.locator('.cp-xhs-note-card').first().evaluate(el=>[el,...el.querySelectorAll('*')].map(e=>({tag:e.tagName,classes:e.className?.baseVal??e.className})));
  // The first post is a real image; baseline image resolution uses a different asset store.
  const shared=tree=>tree.filter(n=>String(n.classes).startsWith('cp-xhs-note-')).map(n=>({tag:n.tag,classes:String(n.classes).replace(' xhs-default-avatar','')}));
  assert.deepEqual(shared(port),shared(native));assert.equal(await page.locator('.cp-xhs-waterfall-column').count(),2);
  await page.locator('.xhs-app').screenshot({path:path.join(output,'original-feed.png')});
  await fs.writeFile(path.join(output,'dom-comparison.json'),JSON.stringify({port,native,sharedCardStructureEqual:true,baseline:'components/xiaohongshu/xiaohongshu-app.tsx',note:'Original production component, identical fixture posts; asset adapters differ.'},null,2));
  return {sharedCardStructureEqual:true,originalColumns:2};
 });
}
