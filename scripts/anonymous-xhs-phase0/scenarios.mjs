import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import JSZip from 'jszip';

export async function run({ page, step, origin, captures, setDelay, repo }) {
  const presets = await fs.readFile(path.join(repo, 'custom-apps/anonymous-xiaohongshu/presets.json'), 'utf8');
  const permissions = ['ai.chat', 'ai.generate', 'characters.read', 'memory.write', 'memory.search', 'memory.readShortTerm', 'memory.readLongTerm', 'memory.readCore', 'app.data.read', 'app.data.write', 'chat.sendCard', 'chat.read', 'app.assets.read', 'ui.toast'];
  // Import a minimal test fixture through the actual importer. No ZIP is written or distributed.
  const zip=new JSZip();
  zip.file('manifest.json',JSON.stringify({id:'phase0.anonymous.probe',name:'匿名小红书',version:'0.0.0-probe',permissions,entry:'index.html',sdkVersion:'1.0'}));
  zip.file('index.html','<!doctype html><html><head><meta charset="utf-8"></head><body><p>Phase 0 capability probe only</p></body></html>');
  zip.file('presets.json',presets);
  const fixtureZip=await zip.generateAsync({type:'base64'});
  await step('setup-isolated-real-stores', () => page.evaluate(async ({ origin, presets,fixtureZip }) => {
    const p = window.phase0, now = new Date().toISOString();
    const image = document.createElement('canvas'); image.width = 32; image.height = 32;
    const ctx = image.getContext('2d'); ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 32, 32);
    const photo = image.toDataURL('image/png');
    ctx.fillStyle='blue';ctx.fillRect(0,0,32,32);const avatar=image.toDataURL('image/png');
    const viewer = { id: 'fixture-viewer-private-id', name: 'ProbeViewer', persona: 'VIEWER_PERSONA: patient photographer; remembers camera techniques.', personality: 'VIEWER_PERSONALITY: quiet and precise', avatar, createdAt: now, updatedAt: now };
    const other = { ...viewer, id: 'fixture-other-private-id', name: 'OtherCharacter', persona: 'OTHER_PERSONA_SECRET', personality: 'OTHER_PERSONALITY_SECRET', briefPersona: 'OTHER_BRIEF_PERSONA_SENTINEL' };
    p.chars.saveCharacters([viewer, other]);
    p.settings.saveApiConfigs([{ id: 'capture-api', name: 'Local capture only', provider: 'Custom', baseUrl: origin + '/v1', apiKey: 'fixture-not-a-real-key', defaultModel: 'fixture-model', enableImageRecognition: true, createdAt: Date.now(), updatedAt: Date.now() }]);
    p.settings.saveUserIdentities([{ id: 'fixture-human', name: 'Chloe', bio: 'GLOBAL_USER_PROFILE_SENTINEL', customSettings: 'GLOBAL_IDENTITY_SENTINEL kk = Chloe', gender: '', age: '', occupation: '' }]);
    const builtin = p.settings.loadPresets().find(x => x.builtIn);
    const custom = { ...structuredClone(builtin), id: 'fixture-custom-preset', name: 'Independent custom preset', builtIn: false, prompts: builtin.prompts.filter(x => !x.identifier.startsWith('custom_app_')) };
    p.settings.savePresets([builtin, custom]);
    p.settings.saveBindingConfig({ globalDefaults: { apiConfigId: 'capture-api', presetId: builtin.id, userIdentityId: 'fixture-human' }, appDefaults: {}, characterBindings: [] });
    p.memory.saveMemoryConfig({ ...p.DEFAULT_MEMORY_CONFIG, autoSummarizeEnabled: true, autoBuildCoreEnabled: false, vectorRecallEnabled: false, summarizationEventInterval: 10000 });
    const session = p.chat.createOrGetSession(viewer.id);
    p.chat.pushChatMessage({ sessionId: session.id, role: 'user', content: 'CHAT_SHORT_SENTINEL kk = Chloe. Today I went shooting.' });
    const otherSession = p.chat.createOrGetSession(other.id);
    p.chat.pushChatMessage({ sessionId: otherSession.id, role: 'user', content: 'OTHER_CHAT_SECRET ownerId=OTHER_OWNER_SECRET' });
    await p.memory.saveMemoryEntry({ id: 'fixture-core', characterId: viewer.id, sourceApp: 'chat', type: 'core', content: 'CORE_SENTINEL kk = Chloe', importance: 1, createdAt: now, updatedAt: now });
    await p.memory.saveMemoryEntry({ id: 'fixture-long', characterId: viewer.id, sourceApp: 'chat', type: 'long_term', content: 'LONG_SENTINEL ordinary chat identity kk = Chloe', importance: 1, createdAt: now, updatedAt: now });
    await p.memory.saveMemoryEntry({ id: 'fixture-other-long', characterId: other.id, sourceApp: 'chat', type: 'long_term', content: 'OTHER_MEMORY_SECRET ownerKind=character', importance: 1, createdAt: now, updatedAt: now });
    p.kv.kvSet('ai_phone_xiaohongshu_events_' + viewer.id, JSON.stringify([{ id: 'ordinary-post', timestamp: now, content: 'ORDINARY_XHS_SENTINEL kk = Chloe' }]));
    const bytes=Uint8Array.from(atob(fixtureZip),x=>x.charCodeAt(0));
    const imported=await p.apps.loadCustomAppPackage(new File([bytes],'phase0-probe.zip',{type:'application/zip'}));
    const app=await p.apps.installCustomAppAsync(imported);
    const registration = p.registration.applyCustomAppRegistrations(app);
    p.host.addCustomAppTimelineEvent(app, { characterId: viewer.id, summary: '[匿名小红书] APP_TIMELINE_SENTINEL social_account acct_moth / moth posted shooting.', appEventId: 'initial-moth' });
    p.apps.writeCustomAppCollection(app.id,'account_events',[{id:'initial-moth',viewerCharacterId:viewer.id,accountId:'acct_moth',displayName:'moth',summary:'APP_TIMELINE_SENTINEL posted shooting.'}]);
    p.host.addCustomAppTimelineEvent(app, { characterId: other.id, summary: '[匿名小红书] OTHER_TIMELINE_SECRET' });
    p.apps.writeCustomAppCollection(app.id, 'private_bindings', [{ id: 'binding', accountId: 'acct_other', ownerKind: 'character', ownerId: other.id, marker: 'PRIVATE_BINDING_SENTINEL' }]);
    Object.assign(p, { app, viewer, other, session, builtinId: builtin.id, customId: custom.id, photo, guard: JSON.parse(presets).presets[0].content });
    p.bind = id => { const config = p.settings.loadBindingConfig(); config.globalDefaults.presetId = id; p.settings.saveBindingConfig(config); };
    p.input = extra => ({ characterId: viewer.id, instruction: '[匿名小红书] TASK_SENTINEL social_account acct_moth / moth. Your self account is acct_self / nullsignal. All others unknown.', messages: [{ role: 'user', content: '[匿名小红书] APP_HISTORY_SENTINEL acct_moth / moth posted this real photo.' },{ role: 'user', content: 'POST_PHOTO_CAPTION', image: photo }], tools: false, ...extra });
    return { registration,importedAppId:app.id, viewerId: viewer.id, sessionId: session.id, builtinId: builtin.id, isolatedOrigin: location.origin };
  }, { origin, presets, fixtureZip }));

  function inspect(name) {
    const c = captures.filter(x => x.label === name).at(-1);
    if (!c) return { requestCaptured: false };
    const text = JSON.stringify(c.body);
    return { requestCaptured: true, requestIndex: c.index, imageParts: (text.match(/"type":"image_url"/g) || []).length,
      markers: Object.fromEntries(['VIEWER_PERSONA','VIEWER_PERSONALITY','APP_HISTORY_SENTINEL','APP_TIMELINE_SENTINEL','TASK_SENTINEL','CHAT_SHORT_SENTINEL','CORE_SENTINEL','LONG_SENTINEL','ORDINARY_XHS_SENTINEL','GLOBAL_USER_PROFILE_SENTINEL','kk = Chloe','OTHER_PERSONA_SECRET','OTHER_BRIEF_PERSONA_SENTINEL','OtherCharacter','OTHER_CHAT_SECRET','OTHER_MEMORY_SECRET','OTHER_TIMELINE_SECRET','PRIVATE_BINDING_SENTINEL','fixture-viewer-private-id','fixture-other-private-id','严格作用域规则','HOOK_GUARD','PROMPT_HOOK_SENTINEL','INSTALLED_PLUGIN_GUARD','PLUGIN_SYSTEM_SENTINEL','ACCOUNT_ARCHIVE_SENTINEL'].map(m => [m, text.includes(m)])) };
  }
  const call = async (name, fn, arg) => step(name, async () => { await page.evaluate(fn, arg); return inspect(name); });
  await call('ai-chat-multimodal', async () => { const p=window.phase0; await p.host.runCustomAppAiChat(p.app, { messages: [{role:'system',content: p.guard + '\n' + p.viewer.persona + '\n' + p.viewer.personality},{role:'user',content:[{type:'text',text:'APP_HISTORY_SENTINEL acct_moth moth'},{type:'image_url',image_url:{url:p.photo}}]}] }); });
  await call('ai-chat-text-projection', async () => { const p=window.phase0; await p.host.runCustomAppAiChat(p.app, { messages: [{role:'system',content: p.guard + '\n' + p.viewer.persona + '\n' + p.viewer.personality},{role:'user',content:'[匿名小红书] APP_HISTORY_SENTINEL acct_moth moth'}] }); });
  await call('ai-generate-default', async () => { const p=window.phase0; await p.host.generateCustomAppText(p.app,p.input()); });
  await step('seed-real-character-relations',()=>page.evaluate(()=>{const p=window.phase0;p.worlds.addCharacterWorldRelation('world_default',p.viewer.id,p.other.id,'fixture colleague');return p.worlds.formatCharacterRelationsForPrompt(p.viewer.id);}));
  await call('ai-generate-with-character-relations',async()=>{const p=window.phase0;await p.host.generateCustomAppText(p.app,p.input());});
  await call('ai-generate-history-none', async () => { const p=window.phase0; await p.host.generateCustomAppText(p.app,p.input({promptProfile:{id:'none',history:'none'}})); });
  await call('ai-generate-exclude-shortterm', async () => { const p=window.phase0; await p.host.generateCustomAppText(p.app,p.input({promptProfile:{id:'excluded',exclude:['shortTermMemory','memoryCore','memoryLongTerm','personaDescription','characterRelations'],enableWorldBooks:false}})); });

  for (const preset of ['default','custom']) {
    await page.evaluate(preset => { const p=window.phase0; p.bind(preset==='default'?p.builtinId:p.customId); },preset);
    for (const task of ['browse-post','new-post-reaction','comment-reply','mention-reply','dm']) {
      await call(`guard-${preset}-${task}`, async task => { const p=window.phase0; await p.host.generateCustomAppText(p.app,p.input({instruction:'[匿名小红书] TASK_SENTINEL task='+task+'; social_account acct_moth/moth owner unknown.'})); }, task);
    }
  }
  await step('register-probe-hooks', () => page.evaluate(() => {
    const p=window.phase0; p.hookCalls=[];
    p.hooks.getChatPluginHookBus().registerTransform('phase0-guard','prompt.system', payload => { p.hookCalls.push({point:'prompt.system',keys:Object.keys(payload)}); return {...payload,hint:payload.hint+'\nPROMPT_HOOK_SENTINEL\n'+p.guard}; });
    p.hooks.getChatPluginHookBus().registerTransform('phase0-guard','llm.request', payload => { p.hookCalls.push({point:'llm.request',keys:Object.keys(payload),purpose:payload.purpose,sessionId:payload.sessionId}); return {...payload,messages:[{role:'system',content:'HOOK_GUARD\n'+p.guard},...payload.messages]}; });
    return true;
  }));
  await call('plugin-custom-generate', async () => { const p=window.phase0; await p.host.generateCustomAppText(p.app,p.input()); });
  for (const task of ['browse-post','new-post-reaction','comment-reply','mention-reply','dm']) {
    await call('plugin-custom-'+task,async task=>{const p=window.phase0;await p.host.generateCustomAppText(p.app,p.input({instruction:'[匿名小红书] TASK_SENTINEL '+task}));},task);
  }
  await call('plugin-ai-chat-bypass', async () => { const p=window.phase0; await p.host.runCustomAppAiChat(p.app,{prompt:'[匿名小红书] task acct_moth'}); });
  await step('hook-metadata',()=>page.evaluate(()=>window.phase0.hookCalls));
  await step('install-scoped-projection-hook',()=>page.evaluate(()=>{
    const p=window.phase0,b=p.hooks.getChatPluginHookBus();b.removePlugin('phase0-guard');
    // Controlled feasibility spike, NOT a production parser or security policy.
    // The hook selects by host-supplied purpose and session, not by post text.
    b.registerTransform('phase0-projection','llm.request',payload=>{
      if(payload.purpose!=='custom_app:'+p.app.id||payload.sessionId!==p.session.id)return payload;
      return {...payload,messages:[{role:'system',content:'HOOK_GUARD\n'+p.guard+'\n'+p.viewer.persona+'\n'+p.viewer.personality},{role:'user',content:[{type:'text',text:'[匿名小红书] APP_HISTORY_SENTINEL TASK_SENTINEL social_account acct_moth / moth owner unknown; self=acct_self/nullsignal'},{type:'image_url',image_url:{url:p.photo}}]}]};
    });return true;
  }));
  await call('plugin-projection-positive-control',async()=>{const p=window.phase0;await p.host.generateCustomAppText(p.app,p.input());});
  await call('plugin-projection-leaves-normal-chat',async()=>{const p=window.phase0;await p.engine.generateChatCompletion(p.session,p.chat.loadChatMessages(p.session.id),{toolsAllowed:false});});
  await page.evaluate(()=>window.phase0.hooks.getChatPluginHookBus().removePlugin('phase0-projection'));
  await step('install-failing-plugin',()=>page.evaluate(()=>{const b=window.phase0.hooks.getChatPluginHookBus();b.removePlugin('phase0-guard');b.registerTransform('phase0-fails','llm.request',()=>{throw Error('intentional fail-closed probe');});return true;}));
  await call('plugin-throw-still-sends', async()=>{const p=window.phase0;await p.host.generateCustomAppText(p.app,p.input());});
  await page.evaluate(()=>window.phase0.hooks.getChatPluginHookBus().removePlugin('phase0-fails'));
  await step('install-timeout-plugin',()=>page.evaluate(()=>{window.phase0.hooks.getChatPluginHookBus().registerTransform('phase0-timeout','llm.request',()=>new Promise(()=>{}),100,20);return true;}));
  await call('plugin-timeout-still-sends',async()=>{const p=window.phase0;await p.host.generateCustomAppText(p.app,p.input());});
  await page.evaluate(()=>window.phase0.hooks.getChatPluginHookBus().removePlugin('phase0-timeout'));

  await step('share-card-storage',()=>page.evaluate(()=>{
    const p=window.phase0;
    const result=p.host.sendCustomAppCard(p.app,{characterId:p.viewer.id,title:'moth 的帖子',body:'15m, ten rounds.',summary:'[匿名小红书] acct_moth / moth 发布帖子',historyText:'[匿名小红书] 当前聊天者分享一篇帖子。帖主 social_account accountId=acct_moth displayName=moth；现实身份 unknown。分享者不等于帖主。内容：15m, ten rounds.',card:{author:{kind:'social_account',accountId:'acct_moth',displayName:'moth'},text:'15m, ten rounds.'}});
    p.share=result;
    return {result,message:p.chat.loadChatMessages(result.sessionId).find(m=>m.id===result.messageId)};
  }));
  for(const preset of ['default','custom']) {
    await call('share-followup-'+preset,async preset=>{const p=window.phase0;p.bind(preset==='default'?p.builtinId:p.customId);await p.engine.generateChatCompletion(p.session,p.chat.loadChatMessages(p.session.id),{toolsAllowed:false});},preset);
  }
  await step('install-share-guard',()=>page.evaluate(()=>{const p=window.phase0;p.hooks.getChatPluginHookBus().registerTransform('phase0-share','llm.request',x=>({...x,messages:[{role:'system',content:'HOOK_GUARD\n'+p.guard},...x.messages]}));return true;}));
  await call('plugin-share-followup-custom',async()=>{const p=window.phase0;p.bind(p.customId);await p.engine.generateChatCompletion(p.session,p.chat.loadChatMessages(p.session.id),{toolsAllowed:false});});
  await page.evaluate(()=>window.phase0.hooks.getChatPluginHookBus().removePlugin('phase0-share'));

  await step('memory-search-scope-and-fresh-disclosure',()=>page.evaluate(async()=>{
    const p=window.phase0;
    p.chat.pushChatMessage({sessionId:p.session.id,role:'user',content:'FRESH_DISCLOSURE moth is me.'});
    const q=async query=>(await p.host.searchCustomAppMemory({characterId:p.viewer.id,query})).entries;
    return {core:await q('CORE_SENTINEL'),long:await q('LONG_SENTINEL'),other:await q('OTHER_MEMORY_SECRET'),timeline:await q('APP_TIMELINE_SENTINEL'),fresh:await q('FRESH_DISCLOSURE'),synonym:await q('firing range'),counter:p.memory.getEventCounter(p.viewer.id)};
  }));
  const stale=await step('memory-add-delete-timeline-stale-disclosure',()=>page.evaluate(async()=>{
    const p=window.phase0;
    await p.host.addCustomAppMemory(p.app,{characterId:p.viewer.id,type:'long_term',content:'[匿名小红书] Chloe explicitly said: moth is me. EXPLICIT_OLD_DISCLOSURE'});
    p.host.addCustomAppTimelineEvent(p.app,{characterId:p.viewer.id,appEventId:'disclosure-event',summary:'[匿名小红书] acct_moth explicitly_disclosed EXPLICIT_OLD_DISCLOSURE'});
    const deleted=p.host.deleteCustomAppTimelineEvent(p.app,{characterId:p.viewer.id,appEventId:'disclosure-event'});
    return {deleted,stillSearchable:await p.host.searchCustomAppMemory({characterId:p.viewer.id,query:'EXPLICIT_OLD_DISCLOSURE'})};
  }));
  await step('production-disclosure-rebuild-after-revoke',async()=>{
    const source=await fs.readFile(path.join(repo,'custom-apps/anonymous-xiaohongshu/assets/app.js'),'utf8');
    const sandbox={__ANON_XHS_DISABLE_BOOT__:true};sandbox.window=sandbox;
    vm.runInNewContext(source,{window:sandbox,console});
    return {deletedStateWouldRebuild:sandbox.AnonymousXhsCore.strictDisclosureMatch(stale.stillSearchable.entries.map(e=>e.content),{id:'acct_moth',displayName:'moth'},{ownerKind:'human_controller'},'')};
  });
  await step('timeline-501-and-counter',()=>page.evaluate(()=>{
    const p=window.phase0,before=p.memory.getEventCounter(p.viewer.id),start=Date.now();
    for(let i=0;i<501;i++)p.host.addCustomAppTimelineEvent(p.app,{characterId:i%2?p.other.id:p.viewer.id,summary:`[匿名小红书] CAPACITY_${i} acct_${i} name_${i}`,createdAt:new Date(start+i).toISOString(),appEventId:'capacity-'+i});
    const own=p.apps.loadCustomAppTimelineEntries(p.viewer.id),other=p.apps.loadCustomAppTimelineEntries(p.other.id),all=p.apps.loadCustomAppTimelineEntries();
    return {total:all.length,viewer:own.length,other:other.length,oldest:all[0]?.summary,newest:all.at(-1)?.summary,initialRetained:all.some(x=>x.summary.includes('APP_TIMELINE_SENTINEL')),counterBefore:before,counterAfter:p.memory.getEventCounter(p.viewer.id)};
  }));
  await call('chat-after-timeline-truncation',async()=>{const p=window.phase0;p.bind(p.builtinId);await p.engine.generateChatCompletion(p.session,p.chat.loadChatMessages(p.session.id),{toolsAllowed:false});});
  await step('evicted-timeline-not-searchable-but-private-history-retained',()=>page.evaluate(async()=>{const p=window.phase0;return {search:await p.host.searchCustomAppMemory({characterId:p.viewer.id,query:'APP_TIMELINE_SENTINEL'}),privateHistory:p.apps.readCustomAppCollection(p.app.id,'account_events')};}));
  await step('longterm-survives-short-context',()=>page.evaluate(async()=>{
    const p=window.phase0;
    await p.host.addCustomAppMemory(p.app,{characterId:p.viewer.id,content:'[匿名小红书] social_account accountId=acct_moth displayName=moth ACCOUNT_ARCHIVE_SENTINEL posted shooting.'});
    return await p.host.searchCustomAppMemory({characterId:p.viewer.id,query:'acct_moth'});
  }));
  await call('chat-after-explicit-app-longterm-write',async()=>{const p=window.phase0;await p.engine.generateChatCompletion(p.session,p.chat.loadChatMessages(p.session.id),{toolsAllowed:false});});
  await step('timeline-summary-limit',()=>page.evaluate(()=>{
    const p=window.phase0;const r=p.host.addCustomAppTimelineEvent(p.app,{characterId:p.viewer.id,summary:'X'.repeat(2100)+'TAIL_ACCOUNT_SENTINEL',data:{accountId:'metadata-only-account'}});
    return {summaryLength:r.entry.summary.length,tailRetained:r.entry.summary.includes('TAIL_ACCOUNT_SENTINEL'),metadata:r.entry.data};
  }));
  await step('prepare-native-auto-summary-probe',()=>page.evaluate(()=>{
    const p=window.phase0;p.memory.saveMemoryConfig({...p.memory.loadMemoryConfig(),summarizationEventInterval:2});p.memory.resetEventCounter(p.viewer.id);
    p.memory.setLastSummarizedTimestamp(p.viewer.id,new Date(Date.now()-60000).toISOString());
    for(let i=0;i<4;i++)p.host.addCustomAppTimelineEvent(p.app,{characterId:p.viewer.id,summary:'[匿名小红书] SUMMARY_ACCOUNT_SENTINEL accountId=acct_moth displayName=moth event '+i});
    p.hooks.getChatPluginHookBus().registerTransform('phase0-summary-guard','llm.request',x=>({...x,messages:[{role:'system',content:'HOOK_GUARD\n'+p.guard},...x.messages]}));
    return {counterAfterTimelineOnly:p.memory.getEventCounter(p.viewer.id)};
  }));
  await step('ai-generate-triggers-native-summary',async()=>{
    const before=captures.length;
    await page.evaluate(async()=>{const p=window.phase0;await p.host.generateCustomAppText(p.app,p.input());});
    await page.waitForFunction(()=>window.phase0.memory.getEventCounter(window.phase0.viewer.id)===0);
    const batch=captures.slice(before);
    const result=await page.evaluate(async()=>{const p=window.phase0;const entries=await p.memory.loadMemoryEntries(p.viewer.id);p.memory.saveMemoryConfig({...p.memory.loadMemoryConfig(),summarizationEventInterval:10000});p.hooks.getChatPluginHookBus().removePlugin('phase0-summary-guard');return entries.filter(e=>e.metadata?.summarizedEvents);});
    return {requests:batch.map(c=>({index:c.index,guard:JSON.stringify(c.body).includes('HOOK_GUARD'),anonymousSource:JSON.stringify(c.body).includes('SUMMARY_ACCOUNT_SENTINEL'),ordinaryIdentity:JSON.stringify(c.body).includes('kk = Chloe'),otherPrivateMemory:JSON.stringify(c.body).includes('OTHER_MEMORY_SECRET'),roles:c.body.messages.map(m=>m.role)})),savedSummaries:result};
  });

  // The actual React runner injects its SDK and enforces permissions via postMessage.
  await step('mount-real-custom-app-runner',async()=>{
    await page.evaluate(()=>window.phase0.mount(window.phase0.app));
    await page.waitForSelector('iframe');
    const frame=page.frames().find(f=>f!==page.mainFrame());
    await frame.waitForFunction(()=>!!window.AiPhone);
    return await frame.evaluate(()=>AiPhone.characters.list());
  });
  let frame=page.frames().find(f=>f!==page.mainFrame());
  await step('sdk-ai-chat-image',async()=>{
    const photo=await page.evaluate(()=>window.phase0.photo);
    await frame.evaluate(async photo=>AiPhone.ai.chat({messages:[{role:'user',content:[{type:'text',text:'SDK_PHOTO'},{type:'image_url',image_url:{url:photo}}]}]}),photo);
    return inspect('sdk-ai-chat-image');
  });
  await step('sdk-ai-generate-image',async()=>{
    const input=await page.evaluate(()=>window.phase0.input());
    await frame.evaluate(input=>AiPhone.ai.generate(input),input);
    return inspect('sdk-ai-generate-image');
  });
  // Share first through the SDK; the earlier host-only share was before any disclosure fixture.
  await step('sdk-share-card',async()=>{
    const result=await frame.evaluate(()=>AiPhone.chat.sendCard({characterId:'fixture-viewer-private-id',title:'moth',historyText:'[匿名小红书] SDK_SHARE_SENTINEL 当前聊天者分享帖子；作者 social_account acct_moth/moth；分享者并非帖主的身份声明。',card:{author:{kind:'social_account',accountId:'acct_moth',displayName:'moth'}}}));
    return await page.evaluate(result=>({result,message:window.phase0.chat.loadChatMessages(result.sessionId).find(x=>x.id===result.messageId)}),result);
  });
  await call('sdk-share-followup-final-payload',async()=>{const p=window.phase0;p.bind(p.customId);await p.engine.generateChatCompletion(p.session,p.chat.loadChatMessages(p.session.id),{toolsAllowed:false});});
  await step('scheduled-ai-not-supported',()=>page.evaluate(async()=>{
    const p=window.phase0;
    try{await p.host.executeCustomAppHostAction(p.app,{type:'ai.generate',payload:p.input()});return {accepted:true};}catch(e){return {accepted:false,error:String(e)};}
  }));
  await step('lifecycle-open-positive-control',async()=>{
    return await frame.evaluate(async()=>{const r=await AiPhone.ai.chat({prompt:'OPEN_CONTROL'});await AiPhone.db.create('lifecycle',{id:'open-control',result:r.text});return AiPhone.db.get('lifecycle','open-control');});
  });
  setDelay(600);
  await step('lifecycle-close-during-generation',async()=>{
    const before=captures.length;
    await frame.evaluate(()=>{window.probeTask=(async()=>{await AiPhone.db.create('lifecycle',{id:'pending-close',status:'pending'});const r=await AiPhone.ai.chat({prompt:'CLOSE_DURING_GENERATION'});await AiPhone.db.update('lifecycle','pending-close',{status:'complete',result:r.text});})();return 'started';});
    for(let i=0;i<100&&captures.length===before;i++)await new Promise(r=>setTimeout(r,20));
    assert.ok(captures.length>before,'request actually started before close');
    await frame.evaluate(()=>{void AiPhone.app.close();});
    await page.waitForSelector('iframe',{state:'detached'});
    for(let i=0;i<100&&!captures.at(-1).respondedAt;i++)await new Promise(r=>setTimeout(r,20));
    assert.ok(captures.at(-1).respondedAt,'host network request completed');
    await page.evaluate(()=>window.phase0.mount(window.phase0.app));
    await page.waitForSelector('iframe');
    frame=page.frames().find(f=>f!==page.mainFrame());await frame.waitForFunction(()=>!!window.AiPhone);
    return {hostRequestCompleted:true,rows:await frame.evaluate(()=>AiPhone.db.list('lifecycle'))};
  });
  setDelay(0);
  await step('lifecycle-generate-open-positive-control',async()=>{
    const input=await page.evaluate(()=>window.phase0.input());
    const row=await frame.evaluate(async input=>{const r=await AiPhone.ai.generate(input);await AiPhone.db.create('lifecycle',{id:'generate-open',status:'complete',result:r.text});return AiPhone.db.get('lifecycle','generate-open');},input);
    assert.equal(row.result,'PHASE0_RESPONSE');return row;
  });
  setDelay(600);
  await step('lifecycle-generate-close-during-generation',async()=>{
    const before=captures.length,input=await page.evaluate(()=>window.phase0.input());
    await frame.evaluate(input=>{void(async()=>{await AiPhone.db.create('lifecycle',{id:'generate-close',status:'pending'});const r=await AiPhone.ai.generate(input);await AiPhone.db.update('lifecycle','generate-close',{status:'complete',result:r.text});})();return 'started';},input);
    for(let i=0;i<100&&captures.length===before;i++)await new Promise(r=>setTimeout(r,20));
    assert.ok(captures.length>before);await frame.evaluate(()=>{void AiPhone.app.close();});await page.waitForSelector('iframe',{state:'detached'});
    for(let i=0;i<100&&!captures.at(-1).respondedAt;i++)await new Promise(r=>setTimeout(r,20));assert.ok(captures.at(-1).respondedAt);
    await page.evaluate(()=>window.phase0.mount(window.phase0.app));await page.waitForSelector('iframe');
    frame=page.frames().find(f=>f!==page.mainFrame());await frame.waitForFunction(()=>!!window.AiPhone);
    return {hostRequestCompleted:true,row:await frame.evaluate(()=>AiPhone.db.get('lifecycle','generate-close'))};
  });
  setDelay(0);
  await step('sdk-memory-current-viewer',()=>frame.evaluate(async()=>({own:await AiPhone.memory.search({characterId:'fixture-viewer-private-id',query:'acct_moth'}),otherIdAlsoAccepted:await AiPhone.memory.search({characterId:'fixture-other-private-id',query:'OTHER_MEMORY_SECRET'})})));
  const appId=await page.evaluate(()=>window.phase0.app.id);
  const pluginSource=(await fs.readFile(path.join(repo,'scripts/anonymous-xhs-phase0/guard-probe.js'),'utf8')).replace("'__PHASE0_GUARD__'",JSON.stringify(JSON.parse(presets).presets[0].content)).replace("'__PHASE0_APP_PURPOSE__'",JSON.stringify('custom_app:'+appId));
  await step('install-real-companion-plugin',()=>page.evaluate(async code=>{const p=window.phase0;const result=await p.pluginLoader.installChatPluginFromCode(code);await p.pluginRuntime.getChatPluginRuntime().ensureStarted();return {result,active:p.pluginRuntime.getChatPluginRuntime().activePluginIds()};},pluginSource));
  await call('installed-plugin-custom-generate',async()=>{const p=window.phase0;p.bind(p.customId);await p.host.generateCustomAppText(p.app,p.input());});
  await call('installed-plugin-share-followup',async()=>{const p=window.phase0;await p.engine.generateChatCompletion(p.session,p.chat.loadChatMessages(p.session.id),{toolsAllowed:false});});
  await call('installed-plugin-ai-chat-bypass',async()=>{const p=window.phase0;await p.host.runCustomAppAiChat(p.app,{prompt:'[匿名小红书] no guard in raw chat'});});
  await step('transport-image-content-validation',async()=>{
    const images=captures.filter(c=>['ai-generate-default','sdk-ai-generate-image','plugin-projection-positive-control'].includes(c.label)).flatMap(c=>c.body.messages.flatMap(m=>Array.isArray(m.content)?m.content.filter(p=>p.type==='image_url').map(p=>({label:c.label,url:p.image_url.url})):[]));
    const decoded=await page.evaluate(async images=>Promise.all(images.map(async entry=>{const img=new Image();img.src=entry.url;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return {label:entry.label,rgb:[...ctx.getImageData(0,0,1,1).data],width:img.width,height:img.height};})),images);
    assert.ok(decoded.length>=3);assert.ok(decoded.every(x=>x.rgb[0]>240&&x.rgb[2]<20),'sent images are red post photos, not blue character avatars');
    return decoded;
  });
  await step('browser-reload-persistence',async()=>{
    await page.reload();await page.waitForFunction(()=>!!window.phase0);await page.evaluate(()=>window.phase0.ready());
    return page.evaluate(async appId=>{const p=window.phase0;return {appCount:p.apps.loadInstalledCustomApps().length,privateBindings:p.apps.readCustomAppCollection(appId,'private_bindings'),privateHistory:p.apps.readCustomAppCollection(appId,'account_events'),lifecycle:p.apps.readCustomAppCollection(appId,'lifecycle'),timelineCount:p.apps.loadCustomAppTimelineEntries().length,longTerm:await p.host.searchCustomAppMemory({characterId:'fixture-viewer-private-id',query:'ACCOUNT_ARCHIVE_SENTINEL'})};},appId);
  });
  await step('capability-observations-asserted',async()=>{
    const payload=name=>captures.find(c=>c.label===name)?.body;
    assert.equal(payload('ai-chat-multimodal').messages[1].content,'[object Object],[object Object]');
    assert.equal(inspect('ai-generate-default').imageParts,1);
    assert.equal(inspect('ai-generate-default').markers['kk = Chloe'],true);
    assert.equal(inspect('ai-generate-exclude-shortterm').markers.TASK_SENTINEL,false);
    assert.equal(inspect('guard-custom-dm').markers['严格作用域规则'],false);
    assert.equal(inspect('plugin-throw-still-sends').requestCaptured,true);
    assert.equal(inspect('plugin-timeout-still-sends').requestCaptured,true);
    assert.equal(inspect('plugin-projection-positive-control').markers['kk = Chloe'],false);
    assert.equal(inspect('installed-plugin-custom-generate').markers.INSTALLED_PLUGIN_GUARD,true);
    assert.equal(inspect('installed-plugin-ai-chat-bypass').markers.INSTALLED_PLUGIN_GUARD,false);
    assert.equal(inspect('chat-after-timeline-truncation').markers.APP_TIMELINE_SENTINEL,false);
    assert.equal(inspect('chat-after-explicit-app-longterm-write').markers.ACCOUNT_ARCHIVE_SENTINEL,true);
    assert.equal(inspect('ai-generate-with-character-relations').markers.OTHER_BRIEF_PERSONA_SENTINEL,true);
    return {assertions:13,note:'Expected limitations reproduced, NOT 13 product acceptance passes.'};
  });
}
