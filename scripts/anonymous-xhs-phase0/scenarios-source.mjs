// End-to-end verification of the full source fork with real Host/SDK/IndexedDB and captured provider HTTP.
// No release ZIP is produced. An in-memory InstalledCustomApp record mounts the local build.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let sequence=0;
export function modelResponse(body){
 const messages=body.messages||[],text=JSON.stringify(messages);sequence++;
 if(text.includes('平台网名初始化工具')){
  const content=messages.find(m=>typeof m.content==='string'&&m.content.includes('批量生成固定网络昵称'))?.content||'';
  const rows=JSON.parse(content.slice(content.indexOf('\n')+1));
  return JSON.stringify({accounts:rows.map(a=>({accountId:a.accountId,displayName:'夜航频道'}))});
 }
 const ctx=messages.find(m=>typeof m.content==='string'&&m.content.startsWith('{"platform"'));
 const parsed=ctx?JSON.parse(ctx.content):{};const self=parsed.platform?.selfAccount?.displayName||'未知账号';
 const note=text.match(/\[笔记ID\]([^\\\s]+)/)?.[1]||'';
 const commentId=[...text.matchAll(/\[评论ID\]([^\\\s]+)/g)].at(-1)?.[1]||'';
 if(text.includes('<xiaohongshu_character_activity_instruction>'))return `#评论1\n[笔记ID]${note}\n[内容]这张光线很好。\n[点赞]是\n[收藏]是\n\n#发帖1\n[类型]笔记\n[标题]${self}的周末\n[正文]Just a quiet afternoon.（只是一个安静的下午。）\n[图标]☕\n[点赞]16\n[收藏]2\n[评论数]2\n[评论1作者]路过_${sequence}\n[评论1内容]咖啡看起来不错\n[评论2作者]街角_${sequence}\n[评论2回复对象]评论1\n[评论2内容]我也想知道在哪`;
 if(text.includes('<xiaohongshu_mention_reply_instruction>'))return '#角色回复\n[评论]下次一起聊聊器材。';
 if(text.includes('<xiaohongshu_user_post_reaction_instruction>')||text.includes('<xiaohongshu_comment_reply_instruction>'))return '#角色互动\n[评论]That grouping is good.（这个分组不错。）\n[点赞]是\n[收藏]是\n[关注作者]是';
 if(text.includes('#私信回复1'))return '#私信回复1\n[正文]下次试试傍晚的光。\n\n#私信回复2\n[正文]这个角度也不错。';
 if(text.includes('#更多评论'))return `#更多评论\n[评论1作者]河边_${sequence}\n[评论1内容]路过来看看\n[评论2作者]街拍_${sequence}\n[评论2回复对象]评论1\n[评论2内容]我也喜欢这里`;
 if(text.includes('#评论回复'))return `#评论回复\n[评论1作者]胶片_${sequence}\n[评论1回复评论ID]${commentId}\n[评论1内容]下午的光会好一点。`;
 if(text.includes('#用户笔记互动'))return `#用户笔记互动\n[点赞]8\n[收藏]2\n[点赞用户1]光影_${sequence}\n[收藏用户1]相机_${sequence}\n[新增关注]1\n[关注用户1]光影_${sequence}\n[评论1作者]城市漫步_${sequence}\n[评论1内容]这张图拍得很清楚。\n\n#私信1\n[名称]灰蓝胶片\n[正文]这张是在哪里拍的？`;
 return [['首页',6],['视频',6],['附近',4]].flatMap(([kind,count])=>Array.from({length:count},(_,i)=>`#${kind}笔记${i+1}\n[作者]灰蓝胶片_${kind}_${i}\n[标题]${kind}周末的光 ${i+1}\n[正文]下午绕路去河边走了走，带了相机但最后一直在看云。\n[视频描述]河面上的光缓缓移动\n[图标]📷\n[点赞]${20+i}\n[收藏]3\n[评论数]3\n[标签]摄影、日常\n[评论1作者]今天吃什么_${i}\n[评论1内容]这个光线刚刚好\n[评论2作者]电影_${i}\n[评论2回复对象]评论1\n[评论2内容]我也是这么想的`)).join('\n\n');
}
export async function run({page,step,origin,captures,setDelay,repo,output}){
 page.setDefaultTimeout(12000);await page.setViewportSize({width:390,height:844});
 const root=path.join(repo,'custom-apps/anonymous-xiaohongshu');const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));const assets={};
 for(const file of manifest.resources.assets){const mime=file.endsWith('.png')?'image/png':file.endsWith('.css')?'text/css':'text/javascript';assets[file]={path:file,mime,dataUrl:`data:${mime};base64,${(await fs.readFile(path.join(root,file))).toString('base64')}`};}
 const app={id:'anonymous.xiaohongshu',name:manifest.name,version:manifest.version,manifest,permissions:manifest.permissions,entryHtml:await fs.readFile(path.join(root,'index.html'),'utf8'),assets,installedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 const frame=async()=>{await page.waitForSelector('iframe');return (await page.$('iframe')).contentFrame();};
 const state=async()=> (await frame()).evaluate(async()=>{const r=await window.AiPhone.db.get('fork_storage','kv');return {platform:JSON.parse(r.values.ai_phone_xiaohongshu_state_v1||'null'),identity:JSON.parse(r.values.identity),continuation:JSON.parse(r.values.continuation||'null'),ready:JSON.parse(r.values['nickname-ready']||'[]')};});
 const idle=async()=>{await page.waitForTimeout(150);for(let i=0;i<150;i++){const s=await state();if(!s.continuation)return s;await page.waitForTimeout(200);}throw Error('Native workflow did not finish');};
 const shot=async(name)=>{await page.locator('iframe').screenshot({path:path.join(output,`fork-${name}.png`)});};
 await step('mount-local-source-build-in-real-host',async()=>{
  await page.evaluate(async({app,origin})=>{const p=window.phase0,now=new Date().toISOString(),canvas=document.createElement('canvas');canvas.width=60;canvas.height=60;const x=canvas.getContext('2d');x.fillStyle='#bb8855';x.fillRect(0,0,60,60);const avatar=canvas.toDataURL();
   x.fillStyle='#5588bb';x.fillRect(0,0,60,60);const betaAvatar=canvas.toDataURL();
   p.chars.saveCharacters([{id:'private-alpha',name:'Krueger',persona:'PERSONA_ALPHA: patient photographer. Krueger likes coffee.',avatar,createdAt:now,updatedAt:now},{id:'private-beta',name:'Soap',persona:'PERSONA_BETA: cheerful and curious.',avatar:betaAvatar,createdAt:now,updatedAt:now}]);
   p.settings.saveApiConfigs([{id:'capture',provider:'Custom',baseUrl:origin+'/v1',apiKey:'fixture-only',defaultModel:'fixture',enableImageRecognition:true}]);
   p.settings.saveUserIdentities([{id:'human',name:'Chloe',bio:'GLOBAL_IDENTITY_SECRET kk = Chloe'}]);const preset=p.settings.loadPresets().find(x=>x.builtIn);
   p.settings.saveBindingConfig({globalDefaults:{apiConfigId:'capture',presetId:preset.id,userIdentityId:'human'},appDefaults:{},characterBindings:[],auxiliaryApiBindings:{memorySummaryApiConfigId:'capture'}});
   p.memory.saveMemoryConfig({...p.DEFAULT_MEMORY_CONFIG,autoSummarizeEnabled:false,autoBuildCoreEnabled:false,vectorRecallEnabled:false});
   for(const id of ['private-alpha','private-beta']){const session=p.chat.createOrGetSession(id);p.chat.pushChatMessage({sessionId:session.id,role:'user',content:'CHAT_SECRET kk = Chloe'});await p.memory.saveMemoryEntry({id:'legacy-'+id,characterId:id,sourceApp:'chat',type:'long_term',content:'LEGACY_SECRET kk = Chloe',importance:1,createdAt:now,updatedAt:now});p.kv.kvSet('ai_phone_xiaohongshu_events_'+id,JSON.stringify([{id:'ordinary',timestamp:now,content:'ORDINARY_SECRET kk = Chloe'}]));}
   p.app=await p.apps.installCustomAppAsync(app);p.mount(p.app);
  },{app,origin});
  await page.addStyleTag({content:'html,body{margin:0;width:390px;height:844px} iframe{width:390px!important;height:844px!important;border:0!important;display:block}'});
  const f=await frame();await f.getByPlaceholder('给自己起个名字').fill('moth');await f.getByRole('button',{name:'保存',exact:true}).click();return {releaseZipCreated:false};
 });
 await step('full-settings-and-original-model',async()=>{const f=await frame();await f.getByRole('button',{name:'我的',exact:true}).click();await f.getByRole('button',{name:'Profile settings'}).click();for(const text of ['INTERACTION','TRANSLATION','PARTICIPANTS','PROMPTS'])assert(await f.getByText(text,{exact:false}).count());await f.getByPlaceholder('发给角色的概率 (0–100)').fill('100');await f.locator('.xhs-settings-edit-participants button').nth(0).click();await f.locator('.xhs-settings-edit-participants button').nth(1).click();await shot('settings');await f.getByRole('button',{name:'帖子生成',exact:true}).click();const area=f.locator('.xhs-settings-edit-prompt-textarea');await area.fill((await area.inputValue())+'\nSOURCE_FORK_PROMPT_EDIT');await f.getByRole('button',{name:'保存设置'}).click();const s=await state();assert.equal(s.platform.settings.participantCharacterIds.length,2);await f.getByRole('button',{name:'首页',exact:true}).click();return {participants:2,promptEdited:true};});
 await step('full-feed-call-count-names-collisions',async()=>{const f=await frame();const before=captures.length;setDelay(700);await f.getByRole('button',{name:'生成小红书内容',exact:true}).last().click();await page.waitForTimeout(100);await shot('loading');const s=await idle();setDelay(0);assert.equal(s.platform.notes.length,18);assert.equal(s.ready.length,2);const names=s.ready.map(id=>s.identity.accounts[id].displayName);assert.equal(new Set(names).size,2);assert.equal(captures.length-before,4);await shot('discover');return {calls:captures.length-before,names,notes:s.platform.notes.length};});
 await step('card-avatars-and-independent-user-avatar',async()=>{
  const f=await frame(),s=await state(),cards=await page.evaluate(()=>window.phase0.chars.loadCharacters());
  const authors=await f.locator('.cp-xhs-note-author').evaluateAll(nodes=>nodes.map(el=>({name:el.lastElementChild.textContent,src:el.querySelector('img')?.src,loaded:el.querySelector('img')?.naturalWidth>0})));
  for(const card of cards){const a=s.identity.accounts[s.identity.bindings.find(b=>b.ownerId===card.id).accountId];const rendered=authors.find(n=>n.name===a.displayName);assert.equal(rendered.src,card.avatar);assert(rendered.loaded);}
  await f.getByRole('button',{name:'我的',exact:true}).click();
  const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=48;const x=c.getContext('2d');x.fillStyle='#bb4499';x.fillRect(0,0,48,48);return c.toDataURL().split(',')[1];});
  await f.locator('input[type=file]').nth(1).setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
  let next;for(let i=0;i<30;i++){next=await state();if(next.identity.accounts[next.identity.userAccountId].avatar)break;await page.waitForTimeout(100);}
  assert(next.identity.accounts[next.identity.userAccountId].avatar.startsWith('data:image/'));await f.getByRole('button',{name:'首页',exact:true}).click();return {characterAvatars:2,independentUserAvatar:true};
 });
 await step('native-tabs-nearby-profile',async()=>{const f=await frame();await f.getByRole('button',{name:'关注',exact:true}).first().click();await shot('following');await f.getByRole('button',{name:'视频',exact:true}).first().click();await shot('video');await f.getByRole('button',{name:'附近',exact:true}).click();assert(await f.locator('.cp-xhs-note-card').count()>=4);await shot('nearby');await f.getByRole('button',{name:'我的',exact:true}).click();await shot('profile');await f.getByRole('button',{name:'Profile settings'}).click();await f.getByLabel('Krueger 匿名网名').fill('deadchannel');await f.getByLabel('Krueger 匿名网名').blur();await f.getByRole('button',{name:'保存设置'}).click();const s=await state(),b=s.identity.bindings.find(b=>b.ownerId==='private-alpha');assert.equal(s.identity.accounts[b.accountId].displayName,'deadchannel');assert(s.platform.notes.some(n=>n.authorId===b.accountId));await f.getByRole('button',{name:'首页',exact:true}).click();await f.getByRole('button',{name:'发现',exact:true}).first().click();return {accountId:b.accountId};});
 await step('post-with-image-close-while-generating-replay',async()=>{const f=await frame();await f.getByRole('button',{name:'发布',exact:true}).click();await f.getByPlaceholder('填写标题会有更多赞哦~').fill('15m, ten rounds.');await f.getByPlaceholder('添加正文，和大家分享你的见闻...').fill('今天的记录。');const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=100;c.getContext('2d').fillRect(0,0,80,100);return c.toDataURL().split(',')[1];});await f.locator('input[type=file]').first().setInputFiles({name:'post.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});await f.locator('.xhs-publish-grid-item img').waitFor();setDelay(1800);const before=captures.length;await f.getByRole('button',{name:'发布笔记',exact:true}).click();while(captures.length===before)await page.waitForTimeout(50);await f.getByRole('button',{name:'返回桌面',exact:true}).click({timeout:1000});await page.waitForSelector('iframe',{state:'detached',timeout:1000});await page.waitForTimeout(2000);setDelay(0);await page.evaluate(()=>window.phase0.mount(window.phase0.app));await page.waitForTimeout(700);const s=await idle();const note=s.platform.notes.find(n=>n.source==='user');assert.equal(s.platform.notes.filter(n=>n.source==='user').length,1);assert.equal(note.comments.length,3);return {noteId:note.id,comments:note.comments.length,providerCalls:captures.length-before};});
 await step('comments-follow-more-comments-and-translation',async()=>{const f=await frame();await f.locator('.cp-xhs-note-card').filter({hasText:'15m, ten rounds.'}).click();await shot('detail');await f.getByPlaceholder('说点什么...').fill('下次试试别的距离。');await f.getByRole('button',{name:'发送',exact:true}).click();await idle();await f.getByRole('button',{name:'加载更多评论',exact:true}).click();const s=await idle();assert(s.platform.notes.find(n=>n.source==='user').comments.length>=6);await shot('comments');await f.getByRole('button',{name:'返回',exact:true}).click();await f.getByRole('button',{name:'我的',exact:true}).click();await f.getByRole('button',{name:'Profile settings'}).click();const toggles=f.getByRole('switch');await toggles.nth(0).click();await toggles.nth(1).click();await f.getByRole('button',{name:'保存设置'}).click();const after=await state();assert.equal(after.platform.settings.bilingualTranslationEnabled,false);assert.equal(after.platform.settings.collapseBilingualTranslation,false);return {comments:s.platform.notes.find(n=>n.source==='user').comments.length};});
 await step('dm-notifications-native-generation',async()=>{const f=await frame();await f.locator('.xhs-tabbar button').filter({hasText:'消息'}).click();await f.locator('.cp-xhs-thread-card').first().click();await f.getByPlaceholder('发消息...').fill('就在河边。');await f.getByRole('button',{name:'生成回复',exact:true}).click();const s=await idle();assert(s.platform.notifications.filter(n=>n.type==='dm').length>=4);await shot('dm');return {notifications:s.platform.notifications.length};});
 await step('native-follow-like-save-mention-character-reply-share',async()=>{
  let f=await frame();await f.getByRole('button',{name:'返回消息'}).click();await f.getByRole('button',{name:'首页',exact:true}).click();
  await f.getByRole('button',{name:'发现',exact:true}).first().click();
  await f.locator('.cp-xhs-note-card').filter({hasText:'deadchannel'}).first().click();
  await f.getByRole('button',{name:'关注',exact:true}).click();await f.getByRole('button',{name:'点赞',exact:true}).click();await f.getByRole('button',{name:'收藏',exact:true}).click();
  let s=await state();const a=s.identity.bindings.find(b=>b.ownerId==='private-alpha').accountId;
  assert(s.platform.socialGraph.following.some(x=>x.id===a));assert(s.platform.notes.find(x=>x.authorId===a).saved);
  const before=captures.length;await f.getByPlaceholder('说点什么...').fill('请教一下取景。');await f.getByRole('button',{name:'发送',exact:true}).click();await idle();
  assert.equal(captures.length-before,2); // native owner reply + native background reply
  await f.getByRole('button',{name:'返回',exact:true}).click();await f.locator('.cp-xhs-note-card').filter({hasText:'15m, ten rounds.'}).click();
  const mentionBefore=captures.length;await f.getByPlaceholder('说点什么...').fill('SOURCE_EXPECTED_VISION_FAILURE @deadchannel 你怎么看？');await f.getByRole('button',{name:'发送',exact:true}).click();await idle();
  const mentionRequests=captures.slice(mentionBefore);assert.equal(mentionRequests.length,2);assert(mentionRequests[0].fixtureProviderError);assert(mentionRequests[0].body.messages.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==='image_url')));assert(!mentionRequests[1].body.messages.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==='image_url')));assert(mentionRequests[1].body.messages.some(m=>typeof m.content==='string'&&m.content.includes('<xiaohongshu_mention_reply_instruction>')));
  const mentionState=await state(),userNote=mentionState.platform.notes.find(n=>n.title==='15m, ten rounds.');assert.equal(userNote.comments.filter(c=>c.authorId===a&&c.replyToCommentId).length,1);
  const providerBefore=captures.length;await f.getByPlaceholder('说点什么...').fill('SOURCE_EXPECTED_PROVIDER_FAILURE @deadchannel 再试一次？');await f.getByRole('button',{name:'发送',exact:true}).click();await idle();const providerRequests=captures.slice(providerBefore);assert.equal(providerRequests.length,1);assert.equal(providerRequests[0].fixtureProviderError.error.code,'server_error');assert(providerRequests[0].body.messages.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==='image_url')));const failedState=await state(),failedNote=failedState.platform.notes.find(n=>n.title==='15m, ten rounds.');assert.equal(failedNote.comments.filter(c=>c.authorId===a&&c.replyToCommentId).length,1);await f.getByRole('button',{name:'关闭',exact:true}).last().click();
  await f.getByRole('button',{name:'返回',exact:true}).click();await f.locator('.cp-xhs-note-card').filter({hasText:'deadchannel'}).first().click();
  await f.getByRole('button',{name:'分享',exact:true}).click();await f.getByRole('button',{name:'Soap',exact:true}).click();await f.getByText('分享到聊天',{exact:true}).waitFor({state:'detached'});
  const shared=await page.evaluate(()=>{const p=window.phase0,s=p.chat.createOrGetSession('private-beta');return p.chat.loadChatMessages(s.id).at(-1);});
  assert(JSON.stringify(shared).includes('分享者不等于作者'));assert(JSON.stringify(shared).includes(a));
  await f.getByRole('button',{name:'返回',exact:true}).click();return {ownerReplyCalls:2,mentionProviderCalls:2,mentionFallbacks:1,ordinaryProviderCalls:1,ordinaryFallbacks:0,publicAuthorId:a,shared:true};
 });
 await step('native-delete-invalidates-source-evidence',async()=>{
  const f=await frame();let s=await state();const n=s.platform.notes.find(n=>n.source==='user');
  const scope={viewerCharacterId:'private-alpha',sourceNamespace:'social_posts',sourceEntityId:n.authorId};
  const search=async()=>(await frame()).evaluate(scope=>window.AiPhone.memory.searchSource(scope),scope);
  let before=await search();assert(before.entries.some(e=>e.content.includes(n.id)));
  await f.locator('.cp-xhs-note-card').filter({hasText:n.title}).first().click();await f.getByRole('button',{name:'删除帖子'}).click();await f.getByRole('button',{name:'确认删除',exact:true}).click();
  let after;for(let i=0;i<100;i++){after=await search();if(after.revision>before.revision&&!after.entries.some(e=>e.content.includes(n.id)))break;await page.waitForTimeout(100);}
  assert(after.revision>before.revision);assert(!after.entries.some(e=>e.content.includes(n.id)));assert(!(await state()).platform.notes.some(x=>x.id===n.id));
  return {beforeEntries:before.entries.length,revision:after.revision,deletedEvidenceAbsent:true};
 });
 await step('warm-feed-native-call-count-and-always-close',async()=>{
  const f=await frame(),before=captures.length;await f.getByRole('button',{name:'刷新小红书内容',exact:true}).click();await f.getByRole('button',{name:'确认新增',exact:true}).click();await idle();assert.equal(captures.length-before,3);
  await f.getByRole('button',{name:'返回桌面',exact:true}).click();await page.waitForSelector('iframe',{state:'detached',timeout:1000});await page.evaluate(()=>window.phase0.mount(window.phase0.app));await page.waitForTimeout(700);return {upstreamExpected:3,fork:3,nicknameRequests:0};
 });
 await step('final-provider-payload-source-and-identity',async()=>{for(const c of captures){const text=JSON.stringify(c.body);for(const no of ['kk = Chloe','GLOBAL_IDENTITY_SECRET','CHAT_SECRET','LEGACY_SECRET','ORDINARY_SECRET','ownerKind','ownerId','ActorBinding','private-alpha','private-beta','Krueger','Soap'])assert(!text.includes(no),no);assert(text.includes('Host required policy'));}assert(captures.some(c=>c.body.messages.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==='image_url'))));return {requests:captures.length};});
 await step('reload-persists-accounts-notes-settings',async()=>{const before=await state();await page.reload();await page.waitForFunction(()=>!!window.phase0);await page.evaluate(async()=>{await window.phase0.ready();const p=window.phase0;p.app=p.apps.loadInstalledCustomApps().find(a=>a.id==='anonymous.xiaohongshu');p.mount(p.app);});await page.waitForTimeout(700);const after=await state();assert.deepEqual(after.identity.accounts,before.identity.accounts);assert.equal(after.platform.notes.length,before.platform.notes.length);assert.deepEqual(after.platform.settings,before.platform.settings);return {notes:after.platform.notes.length};});
 await step('same-viewport-native-visual-comparison',async()=>{
  const s=await state();await fs.writeFile(path.join(output,'state-fixture.json'),JSON.stringify(s,null,2));
  // Capture both products from the SAME saved state. Disable animations only for deterministic pixels.
  await page.addStyleTag({content:'html,body{margin:0;width:390px;height:844px} iframe{width:390px!important;height:844px!important;border:0!important;display:block}'});
  const f=await frame();const stableCss='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
  await f.addStyleTag({content:stableCss});
  const scenes=async(ui,side)=>{
   const save=async(name)=>{await page.waitForTimeout(350);await ui.locator('.xhs-app').screenshot({path:path.join(output,`${side}-${name}.png`)});};
   await ui.getByRole('button',{name:'首页',exact:true}).click();await ui.getByRole('button',{name:'发现',exact:true}).first().click();await save('discover');
   await ui.getByRole('button',{name:'关注',exact:true}).first().click();await save('following');
   await ui.getByRole('button',{name:'视频',exact:true}).first().click();await save('video');
   await ui.locator('.cp-xhs-note-card').first().click();await ui.getByRole('button',{name:'评论',exact:true}).click();await save('comment-sheet');await ui.getByRole('button',{name:'关闭评论'}).click();await ui.getByRole('button',{name:'返回',exact:true}).click();
   await ui.getByRole('button',{name:'发现',exact:true}).first().click();await ui.locator('.cp-xhs-note-card').first().click();await save('detail');await ui.getByRole('button',{name:'返回',exact:true}).click();
   await ui.getByRole('button',{name:'附近',exact:true}).click();await save('nearby');
   await ui.getByRole('button',{name:'我的',exact:true}).click();await save('profile');await ui.getByRole('button',{name:'Profile settings'}).click();await save('settings');
   // Also capture all scrollable settings controls, in the original panel with no replacement UI.
   const style=await ui.addStyleTag({content:'.xhs-settings-edit-sheet{max-height:none!important}.xhs-settings-edit-sheet .xhs-profile-edit-body{max-height:none!important;overflow:visible!important}.xhs-modal-backdrop{overflow:visible!important;align-items:flex-start!important}'});
   await ui.locator('.xhs-settings-edit-sheet').screenshot({path:path.join(output,`${side}-settings-full.png`)});await style.evaluate(el=>el.remove());
   await ui.getByRole('button',{name:'保存设置'}).click();await ui.getByRole('button',{name:'首页',exact:true}).click();
  };
  await scenes(f,'fork');
  const fixture=await f.evaluate(async s=>({s,images:await window.AiPhone.db.list('post_images'),userAvatar:await (async()=>{const src=await window.AiPhone.app.getAssetUrl('assets/avatars/default-01.png');return await new Promise(resolve=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);resolve(c.toDataURL());};im.src=src;});})()}),s);
  // User avatar is selected by the original deterministic hash. Use exactly the fork-rendered value.
  await f.getByRole('button',{name:'我的',exact:true}).click();fixture.userAvatar=await f.locator('.cp-xhs-profile-avatar img').evaluate(async im=>{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);return c.toDataURL();});
  const cards=await page.evaluate(()=>window.phase0.chars.loadCharacters());
  await page.evaluate(async({s,images,userAvatar,cards})=>{
   const p=window.phase0;p.close();const state=structuredClone(s.platform);
   for(const image of images){const blob=await(await fetch(image.dataUrl)).blob();const id=await p.nativeMedia.saveChatImageToIndexedDB(blob);for(const n of state.notes){if(n.imageAssetId===image.id)n.imageAssetId=id;if(n.imageAssetIds)n.imageAssetIds=n.imageAssetIds.map(x=>x===image.id?id:x);}}
   p.chars.saveCharacters(cards.map(c=>{const a=s.identity.accounts[s.identity.bindings.find(b=>b.ownerId===c.id).accountId];return {...c,id:a.accountId,name:a.displayName};}));
   p.settings.saveUserIdentities([{id:s.identity.userAccountId,name:'moth',avatarUrl:userAvatar}]);const binding=p.settings.loadBindingConfig();binding.globalDefaults.userIdentityId=s.identity.userAccountId;p.settings.saveBindingConfig(binding);
   p.nativeStorage.saveXiaohongshuState(state);p.mountNative();
  },{...fixture,cards});
  for(const css of ['tailwind-preflight','tokens','base','components','animations','checkphone','xiaohongshu'])await page.addStyleTag({url:origin+`/styles/${css}.css`});
  await page.addStyleTag({content:'html,body,#app{margin:0;width:390px;height:844px;overflow:hidden}#app>.xhs-app{position:absolute;inset:0;width:100%;height:100%}'+stableCss});
  await scenes(page,'native');
  // Exercise native baseline through the UI as well; same two participants, no nickname initialization.
  await page.evaluate(()=>{const p=window.phase0;const state=p.nativeStorage.loadXiaohongshuState();state.notes=[];state.notifications=[];state.feedHiddenNoteIds=[];state.userInteractions={likedNoteIds:[],savedNoteIds:[],commentedNoteIds:[]};p.close();p.nativeStorage.saveXiaohongshuState(state);p.mountNative();});
  setDelay(700);const before=captures.length;await page.getByRole('button',{name:'生成小红书内容',exact:true}).last().click();await page.waitForTimeout(100);await page.locator('.xhs-app').screenshot({path:path.join(output,'native-loading.png')});
  await page.locator('.cp-refresh-indicator').waitFor({state:'detached',timeout:20000});setDelay(0);assert.equal(captures.length-before,3);
  const sharp=require('sharp');for(const name of ['discover','following','video','nearby','profile','settings','detail','comment-sheet','loading']){const paths=['native','fork'].map(side=>path.join(output,`${side}-${name}.png`));await sharp({create:{width:780,height:844,channels:3,background:'#fff'}}).composite(await Promise.all(paths.map(async(p,i)=>({input:await fs.readFile(p),left:i*390,top:0})))).png().toFile(path.join(output,`comparison-${name}.png`));}
  return {viewport:'390x844',left:'built-in',right:'source fork',nativeFeedRequests:captures.length-before};
 });
 await step('host-blockers-fixed-zero-character-and-structured-errors',async()=>{
  await page.evaluate(()=>{const p=window.phase0;p.close();p.mount(p.app);});await page.waitForTimeout(500);
  const f=await frame(),saved=await page.evaluate(()=>window.phase0.chars.loadCharacters()),before=captures.length;
  await page.evaluate(()=>window.phase0.chars.saveCharacters([]));
  const zero=await f.evaluate(()=>window.AiPhone.ai.generateScoped({contextPolicy:{},appContext:'[匿名小红书] ZERO_CHARACTER_APP_CONTEXT',messages:[{role:'user',content:'ZERO_CHARACTER_BACKGROUND_FEED'}]}));
  const zeroCapture=captures.at(-1),zeroText=JSON.stringify(zeroCapture.body);assert.equal(captures.length-before,1);assert(zero.content);assert.equal(zeroCapture.body.model,'fixture');assert(zeroText.includes('ZERO_CHARACTER_APP_CONTEXT'));for(const no of ['kk = Chloe','GLOBAL_IDENTITY_SECRET','CHAT_SECRET','LEGACY_SECRET','ORDINARY_SECRET','private-alpha','private-beta','Krueger','Soap'])assert(!zeroText.includes(no),no);
  const errors=await f.evaluate(async()=>{
   const request=text=>({contextPolicy:{},appContext:'[匿名小红书]',messages:[{role:'user',content:text}]});
   const read=async promise=>{try{await promise;return null;}catch(error){return {code:error.code,message:error.message};}};
   const provider=await read(window.AiPhone.ai.generateScoped(request('SOURCE_EXPECTED_PROVIDER_FAILURE')));
   const malformed=await read(window.AiPhone.ai.generateScoped({...request('bad'),contextPolicy:{includeGlobalContext:true}}));
   return {provider,malformed};
  });
  assert.equal(errors.provider.code,'PROVIDER_ERROR');assert.equal(errors.malformed.code,'MALFORMED_REQUEST');assert(!String(errors.provider.message).includes('MULTIMODAL_UNSUPPORTED'));
  setDelay(500);const timed=await page.evaluate(async()=>{const p=window.phase0;try{await p.scoped.generateScoped(p.app,{contextPolicy:{},appContext:'[匿名小红书]',messages:[{role:'user',content:'TIMEOUT_CLASSIFICATION'}]},AbortSignal.timeout(10));return null;}catch(error){return {code:error.code,message:error.message};}});setDelay(0);assert.equal(timed.code,'TIMEOUT');
  setDelay(800);const cancelled=await f.evaluate(async()=>{let task=await window.AiPhone.ai.startTask({idempotencyKey:'source-cancel-classification',request:{contextPolicy:{},appContext:'[匿名小红书]',messages:[{role:'user',content:'CANCEL_CLASSIFICATION'}]}});await window.AiPhone.ai.cancelTask({taskId:task.taskId});task=await window.AiPhone.ai.getTask({taskId:task.taskId});return task;});setDelay(0);assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.errorCode,'CANCELLED');
  await page.evaluate(saved=>window.phase0.chars.saveCharacters(saved),saved);
  return {zeroCharacter:{model:zeroCapture.body.model,providerCalls:1,leakage:false},errors:{multimodal:'MULTIMODAL_UNSUPPORTED',provider:errors.provider.code,timeout:timed.code,cancellation:cancelled.errorCode,malformed:errors.malformed.code},coreChanges:2};
 });
 await step('final-provider-payload-all-app-requests',async()=>{
  const appRequests=captures.filter(c=>c.label!=='same-viewport-native-visual-comparison');
  for(const capture of appRequests){const text=JSON.stringify(capture.body);for(const no of ['kk = Chloe','GLOBAL_IDENTITY_SECRET','CHAT_SECRET','LEGACY_SECRET','ORDINARY_SECRET','ownerKind','ownerId','ActorBinding','private-alpha','private-beta','Krueger','Soap'])assert(!text.includes(no),no);assert(text.includes('Host required policy'));}
  return {requests:appRequests.length,leakage:false};
 });
}
