import assert from 'node:assert/strict';
import JSZip from 'jszip';

// All sentinels are synthetic. The actual Host, runner, SDK, DB and HTTP transport run unchanged.
export async function run({ page, step, origin, captures, setDelay }) {
  const permissions = ['ai.chat','ai.generate','ai.generateScoped','ai.tasks','app.policy.manage','characters.read','memory.write','memory.search','memory.readShortTerm','memory.source.read','memory.source.write','app.data.read','app.data.write','chat.read','chat.sendCard'];
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify({ id:'phase05.probe', name:'Capability probe', version:'0.0.0-test', sdkVersion:'1.0', permissions, entry:'index.html' }));
  zip.file('index.html','<!doctype html><html><meta charset="utf-8"><body>Host capability test fixture</body></html>');
  const fixture = await zip.generateAsync({type:'base64'});
  await step('setup-real-importer-host-and-idb', async () => {
    const result = await page.evaluate(async ({origin,fixture}) => {
      const p=window.phase0, now=new Date().toISOString();
      const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.fillStyle='red';ctx.fillRect(0,0,32,32);
      const viewer={id:'private-viewer-id',name:'ProbeViewer',persona:'VIEWER_PERSONA: patient photographer',personality:'VIEWER_PERSONALITY: precise',avatar:canvas.toDataURL(),createdAt:now,updatedAt:now};
      const other={...viewer,id:'other-private-id',name:'OTHER_CHARACTER_SECRET',persona:'OTHER_PERSONA_SECRET'};
      p.chars.saveCharacters([viewer,other]);
      p.settings.saveApiConfigs([{id:'capture',provider:'Custom',baseUrl:origin+'/v1',apiKey:'fixture-only',defaultModel:'fixture',enableImageRecognition:true}]);
      p.settings.saveUserIdentities([{id:'human',name:'Chloe',bio:'GLOBAL_USER_SECRET kk = Chloe'}]);
      const builtin=p.settings.loadPresets().find(p=>p.builtIn);
      const custom={...structuredClone(builtin),id:'independent',name:'Independent preset',builtIn:false,prompts:builtin.prompts.filter(p=>!p.identifier.startsWith('custom_app_'))};
      p.settings.savePresets([builtin,custom]);
      p.settings.saveBindingConfig({globalDefaults:{apiConfigId:'capture',presetId:builtin.id,userIdentityId:'human'},appDefaults:{},characterBindings:[],auxiliaryApiBindings:{memorySummaryApiConfigId:'capture'}});
      p.memory.saveMemoryConfig({...p.DEFAULT_MEMORY_CONFIG,autoSummarizeEnabled:false,autoBuildCoreEnabled:false,vectorRecallEnabled:false});
      const session=p.chat.createOrGetSession(viewer.id);
      p.chat.pushChatMessage({sessionId:session.id,role:'user',content:'CHAT_SECRET kk = Chloe'});
      const session2=p.chat.createOrGetSession(other.id);
      p.chat.pushChatMessage({sessionId:session2.id,role:'user',content:'OTHER_CHAT_SECRET'});
      for(const type of ['core','long_term']) await p.memory.saveMemoryEntry({id:type,characterId:viewer.id,sourceApp:'chat',type,content:'LEGACY_MEMORY_SECRET kk = Chloe',importance:1,createdAt:now,updatedAt:now});
      p.kv.kvSet('ai_phone_xiaohongshu_events_'+viewer.id,JSON.stringify([{id:'ordinary',timestamp:now,content:'ORDINARY_PLATFORM_SECRET kk = Chloe'}]));
      const app=await p.apps.installCustomAppAsync(await p.apps.loadCustomAppPackage(new File([Uint8Array.from(atob(fixture),c=>c.charCodeAt(0))],'probe.zip')));
      p.host.addCustomAppTimelineEvent(app,{characterId:viewer.id,summary:'OWN_TIMELINE_SENTINEL'});
      p.host.addCustomAppTimelineEvent(app,{characterId:other.id,summary:'OTHER_TIMELINE_SECRET'});
      p.apps.writeCustomAppCollection(app.id,'bindings',[{id:'private',ownerId:other.id,ownerKind:'character',secret:'PRIVATE_MAPPING_SECRET'}]);
      const request={characterId:viewer.id,contextPolicy:{characterProfile:true,generationRules:true},appContext:'[匿名小红书] APP_CONTEXT social_account acct_a / moth. Owner unknown.',messages:[{role:'user',content:[{type:'text',text:'Describe this post image.'},{type:'image_url',image_url:{url:canvas.toDataURL()}}]}]};
      Object.assign(p,{app,viewer,other,session,request,builtinId:builtin.id,customId:custom.id,scope:{viewerCharacterId:viewer.id,sourceNamespace:'social',sourceEntityId:'acct_a'}});
      p.mount(app);
      return {permissions:app.permissions,viewerId:viewer.id};
    },{origin,fixture});
    for(const perm of permissions) assert(result.permissions.includes(perm),perm);
    return result;
  });
  const frame = async () => { await page.waitForSelector('iframe'); const h=await page.$('iframe');const f=await h.contentFrame();await f.waitForFunction(()=>!!window.AiPhone);return f; };
  const sdk = async (namespace,method,input) => (await frame()).evaluate(async ({namespace,method,input})=>window.AiPhone[namespace][method](input),{namespace,method,input});
  const request=await page.evaluate(()=>window.phase0.request);
  const scope=await page.evaluate(()=>window.phase0.scope);
  const call=async(name,fn,check)=>step(name,async()=>{const before=captures.length;const result=await fn();const rows=captures.slice(before);if(check)check(rows,result);return {result,captures:rows.map(r=>r.index)};});
  const bodyText=rows=>JSON.stringify(rows.map(r=>r.body));
  const hasGuard=rows=>{assert(rows.length>0,'expected actual HTTP');assert(rows.every(r=>JSON.stringify(r.body).includes('REQUIRED_SOURCE_GUARD')));};
  await call('legacy-ai-chat-no-policy',()=>sdk('ai','chat',{messages:[{role:'user',content:'LEGACY_EXACT_TEXT'}]}),(rows)=>{assert.equal(rows.length,1);assert.equal(rows[0].body.messages[0].content,'LEGACY_EXACT_TEXT');assert(!bodyText(rows).includes('Host required policy'));});
  await call('scoped-multimodal-default-deny',()=>sdk('ai','generateScoped',request),rows=>{
    assert.equal(rows.length,1);const text=bodyText(rows);
    for(const sentinel of ['VIEWER_PERSONA','VIEWER_PERSONALITY','APP_CONTEXT','data:image/png;base64,'])assert(text.includes(sentinel),sentinel);
    for(const secret of ['kk = Chloe','GLOBAL_USER_SECRET','CHAT_SECRET','LEGACY_MEMORY_SECRET','ORDINARY_PLATFORM_SECRET','OTHER_CHARACTER_SECRET','OTHER_TIMELINE_SECRET','PRIVATE_MAPPING_SECRET','private-viewer-id','ownerId','ownerKind'])assert(!text.includes(secret),secret);
    assert(rows[0].body.messages.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==='image_url')));
  });
  await call('scoped-no-sources-means-no-persona',()=>sdk('ai','generateScoped',{...request,contextPolicy:{}}),rows=>{assert(!bodyText(rows).includes('VIEWER_PERSONA'));assert(bodyText(rows).includes('APP_CONTEXT'));});
  await step('scoped-reject-unknown-policy-and-legacy-memory',async()=>{
    const before=captures.length;
    await assert.rejects(()=>sdk('ai','generateScoped',{...request,contextPolicy:{includeGlobalContext:true}}));
    await assert.rejects(()=>sdk('ai','generateScoped',{...request,contextPolicy:{longTermMemory:true}}));
    assert.equal(captures.length,before);return true;
  });
  await step('scoped-reject-image-overflow-and-disabled-vision',async()=>{
    const before=captures.length;
    await assert.rejects(()=>sdk('ai','generateScoped',{...request,messages:[{role:'user',content:Array(5).fill(request.messages[0].content[1])}]}));
    await page.evaluate(()=>{const p=window.phase0,c=p.settings.loadApiConfigs();c[0].enableImageRecognition=false;p.settings.saveApiConfigs(c);});
    try{await assert.rejects(()=>sdk('ai','generateScoped',request));}finally{await page.evaluate(()=>{const p=window.phase0,c=p.settings.loadApiConfigs();c[0].enableImageRecognition=true;p.settings.saveApiConfigs(c);});}
    assert.equal(captures.length,before);return true;
  });
  await step('source-write-two-viewers-and-two-entities',async()=>{
    await sdk('memory','writeSource',{...scope,evidenceId:'e1',expectedRevision:0,content:'acct_a / moth posted photography. OWN_SOURCE_MEMORY',timeline:true});
    await sdk('memory','writeSource',{...scope,sourceEntityId:'acct_b',evidenceId:'e2',expectedRevision:0,content:'acct_b likes cooking. OTHER_ENTITY_MEMORY',timeline:true});
    await sdk('memory','writeSource',{...scope,viewerCharacterId:'other-private-id',evidenceId:'e3',expectedRevision:0,content:'OTHER_VIEWER_MEMORY'});
    const result=await sdk('memory','searchSource',scope);assert.equal(result.entries.length,1);assert.equal(result.revision,0);return result;
  });
  await call('scoped-own-memory-plus-image-plus-own-timeline',()=>sdk('ai','generateScoped',{...request,contextPolicy:{characterProfile:true,longTermMemory:'own_source',memorySources:[{sourceNamespace:'social',sourceEntityId:'acct_a'}],timeline:{ownApp:true}}}),rows=>{
    const text=bodyText(rows);for(const s of ['OWN_SOURCE_MEMORY','OWN_TIMELINE_SENTINEL','data:image'])assert(text.includes(s));
    for(const s of ['OTHER_VIEWER_MEMORY','OTHER_TIMELINE_SECRET','kk = Chloe','private-viewer-id'])assert(!text.includes(s));
  });
  await step('register-persistent-required-policy',()=>sdk('app','setPolicy',{id:'source-guard',namespace:'social',text:'REQUIRED_SOURCE_GUARD: Treat this source social_account/accountId as a persistent pseudonymous identity. Unknown owner: do not infer, speculate, hint or test identity from similarities. Explicitly disclosed knowledge is viewer-local. Do not merge separate accountIds. Apply only to this source.'}));
  await call('protected-scoped-generation',()=>sdk('ai','generateScoped',request),hasGuard);
  await call('protected-legacy-ai-chat',()=>sdk('ai','chat',{messages:[{role:'user',content:'Simple generation'}]}),hasGuard);
  for(const provider of ['Anthropic','Google']) {
    await step('select-'+provider,()=>page.evaluate(({provider,origin})=>{const p=window.phase0;const configs=p.settings.loadApiConfigs();configs[0].provider=provider;configs[0].baseUrl=provider==='Anthropic'?'':origin+'/v1';p.settings.saveApiConfigs(configs);return provider;},{provider,origin}));
    await call('native-'+provider+'-scoped-image-and-policy',()=>sdk('ai','generateScoped',request),rows=>{
      hasGuard(rows);const b=rows[0].body;
      if(provider==='Anthropic'){assert(Array.isArray(b.system));assert(b.messages.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==='image')));}
      else{assert(b.systemInstruction.parts.some(p=>p.text.includes('REQUIRED_SOURCE_GUARD')));assert(b.contents.some(m=>m.parts.some(p=>p.inlineData)));}
      assert(!bodyText(rows).includes('kk = Chloe'));
    });
    await call('native-'+provider+'-simple-policy',()=>sdk('ai','chat',{messages:[{role:'user',content:'simple native'}]}),hasGuard);
  }
  await step('restore-compatible-provider',()=>page.evaluate(origin=>{const p=window.phase0,configs=p.settings.loadApiConfigs();configs[0].provider='Custom';configs[0].baseUrl=origin+'/v1';p.settings.saveApiConfigs(configs);return true;},origin));
  await step('install-optional-plugin-message-replacement',()=>page.evaluate(()=>{window.phase0.hooks.getChatPluginHookBus().registerTransform('replacement-test','llm.request',x=>({...x,messages:[{role:'user',content:'PLUGIN_REPLACED_EVERYTHING'}]}));return true;}));
  await call('terminal-guard-after-plugin-replacement',()=>sdk('ai','generate',{characterId:'private-viewer-id',instruction:'guard survives'}),rows=>{hasGuard(rows);assert(bodyText(rows).includes('PLUGIN_REPLACED_EVERYTHING'));});
  await page.evaluate(()=>window.phase0.hooks.getChatPluginHookBus().removePlugin('replacement-test'));
  for(const kind of ['default','custom']) {
    await step('bind-'+kind,()=>page.evaluate(kind=>{const p=window.phase0;const config=p.settings.loadBindingConfig();config.globalDefaults.presetId=kind==='default'?p.builtinId:p.customId;p.settings.saveBindingConfig(config);return true;},kind));
    await call('protected-native-chat-'+kind,()=>page.evaluate(async()=>{const p=window.phase0;return p.engine.generateChatCompletion(p.session,p.chat.loadChatMessages(p.session.id),{toolsAllowed:false});}),hasGuard);
    await call('protected-legacy-ai-generate-'+kind,()=>sdk('ai','generate',{characterId:'private-viewer-id',instruction:'A generated activity',maxTokens:64}),hasGuard);
    for(const route of ['npcFeed','npcReaction','activity','reaction','npcComment','moreComments','dm','comment','mention']) {
      await call('protected-native-flow-'+kind+'-'+route,()=>page.evaluate(async route=>{
        const p=window.phase0,e=p.nativeSocial,s=p.nativeSocialSettings,now=new Date().toISOString();
        const comment={id:'comment',noteId:'note',authorType:'user',authorId:'local-user',authorName:'kk',text:'Hi',likeCount:0,dislikeCount:0,liked:false,disliked:false,createdAt:now};
        const note={id:'note',type:'post',source:'user',authorId:'local-user',authorName:'kk',title:'Photo',body:'Photography',coverIcon:'photo',tone:'ivory',tags:[],likeCount:0,saveCount:0,commentCount:1,liked:false,saved:false,recentLikeNames:[],recentSaveNames:[],comments:[comment],createdAt:now,updatedAt:now};
        const calls={npcFeed:()=>e.generateXiaohongshuNpcFeed(s),npcReaction:()=>e.generateXiaohongshuNpcReactionForUserPost(note,s),activity:()=>e.generateXiaohongshuCharacterActivity(p.viewer.id,[note],s),reaction:()=>e.generateXiaohongshuCharacterReactionToUserPost(p.viewer.id,note,s),npcComment:()=>e.generateXiaohongshuNpcReplyToUserComment(note,comment,s),moreComments:()=>e.generateXiaohongshuNpcMoreComments(note,s),dm:()=>e.generateXiaohongshuNpcDmReply({threadName:'background',userName:'kk',messages:[],latestUserText:'Hi',settings:s}),comment:()=>e.generateXiaohongshuCharacterReplyToUserComment(p.viewer.id,note,comment,undefined,s),mention:()=>e.generateXiaohongshuCharacterMentionReply(p.viewer.id,note,comment,undefined,s)};
        try{return {result:await calls[route]()};}catch(error){return {fixtureResponseParseError:String(error)};}
      },route),rows=>{assert.equal(rows.length,1,'actual native route must reach HTTP exactly once');hasGuard(rows);});
    }
  }
  await step('existing-share-api-keeps-author-projection',async()=>{
    const result=await sdk('chat','sendCard',{characterId:'private-viewer-id',title:'Post by moth',body:'Photography',historyText:'[匿名小红书] The current chatter shared a post. Author social_account acct_a / moth. Sharing does not identify the sharer as the author.',card:{author:{kind:'social_account',accountId:'acct_a',displayName:'moth'}}});
    const saved=await page.evaluate(result=>window.phase0.chat.loadChatMessages(result.sessionId).find(m=>m.id===result.messageId),result);assert(JSON.stringify(saved).includes('acct_a'));assert(!JSON.stringify(saved.mediaData).includes('ownerId'));return saved;
  });
  await call('share-followup-has-terminal-policy',()=>page.evaluate(()=>{const p=window.phase0;return p.engine.generateChatCompletion(p.session,p.chat.loadChatMessages(p.session.id),{toolsAllowed:false});}),rows=>{hasGuard(rows);assert(bodyText(rows).includes('Sharing does not identify'));});
  await step('configure-native-summary-api',()=>page.evaluate(()=>{const p=window.phase0,c=p.settings.loadBindingConfig();c.auxiliary={...c.auxiliary,memorySummaryApiConfigId:'capture'};p.settings.saveBindingConfig(c);return p.settings.resolveAuxiliaryApiConfig('memorySummaryApiConfigId')?.id;}));
  await call('protected-native-timeline-summary',()=>page.evaluate(()=>{const p=window.phase0;return p.summarizer.runSummarizationPipeline(p.viewer.id,p.viewer.name,{force:true});}), (rows,r)=>{assert(r.success,JSON.stringify(r));hasGuard(rows);});
  await call('protected-native-core-summary',()=>page.evaluate(()=>{const p=window.phase0;return p.coreBuilder.runCoreMemoryPipeline(p.viewer.id,p.viewer.name,{force:true});}),(rows,r)=>{assert(r.success,JSON.stringify(r));hasGuard(rows);});
  await step('derived-memory-lineage-survives-summary',()=>page.evaluate(async()=>{const p=window.phase0;const rows=await p.memory.loadMemoryEntries(p.viewer.id);const derived=rows.filter(e=>e.id.startsWith('mem_'));if(derived.length<2||derived.some(e=>!e.provenance?.sources.length))throw Error('Missing lineage');return derived.map(e=>({id:e.id,type:e.type,provenance:e.provenance}));}));
  await step('invalidation-no-evidence-resurrection',async()=>{
    const invalid=await sdk('memory','invalidateSource',scope);assert.equal(invalid.revision,1);
    const found=await sdk('memory','searchSource',scope);assert.equal(found.entries.length,0);
    await assert.rejects(()=>sdk('memory','writeSource',{...scope,evidenceId:'e1',expectedRevision:0,content:'OLD_DISCLOSURE_REPLAY'}));
    const rows=await page.evaluate(()=>window.phase0.memory.loadMemoryEntries('private-viewer-id'));
    assert(!rows.some(e=>e.id.startsWith('mem_')),'derived summaries invalidated');assert(rows.some(e=>e.content.includes('OTHER_ENTITY_MEMORY')));
    const other=await sdk('memory','searchSource',{...scope,viewerCharacterId:'other-private-id'});assert.equal(other.entries.length,1);
    return {revision:found.revision,remaining:rows.map(r=>r.id)};
  });
  await step('native-long-recall-after-timeline-eviction',async()=>{
    await page.evaluate(()=>{const p=window.phase0;for(let i=0;i<510;i++)p.host.addCustomAppTimelineEvent(p.app,{characterId:p.viewer.id,summary:'Filler '+i});});
    const result=await sdk('memory','searchSource',{...scope,sourceEntityId:'acct_b'});assert(result.entries.some(e=>e.content.includes('OTHER_ENTITY_MEMORY')));return {found:result.entries.length};
  });
  await call('ordinary-chat-recalls-source-after-eviction',()=>page.evaluate(()=>{const p=window.phase0;return p.engine.generateChatCompletion(p.session,p.chat.loadChatMessages(p.session.id),{toolsAllowed:false});}),rows=>{hasGuard(rows);assert(bodyText(rows).includes('OTHER_ENTITY_MEMORY'));assert(bodyText(rows).includes('sourceEntityId'));assert(!bodyText(rows).includes('OWN_SOURCE_MEMORY'));});
  await step('protected-policy-corrupt-registry-fails-closed',async()=>{
    const before=captures.length;
    const saved=await page.evaluate(async()=>{const p=window.phase0;const old=await p.kv.kvReadFresh(p.policy.PROTECTED_POLICY_KEY);await p.kv.kvSetAsync(p.policy.PROTECTED_POLICY_KEY,'not JSON');return old;});
    try {
      await assert.rejects(()=>sdk('ai','generateScoped',request));
      await assert.rejects(()=>sdk('ai','chat',{messages:[{role:'user',content:'must not send'}]}));
      const result=await page.evaluate(()=>{const p=window.phase0;return p.summarizer.runSummarizationPipeline(p.viewer.id,p.viewer.name,{force:true});});
      assert.equal(result.success,false);assert.equal(captures.length,before);
    } finally {await page.evaluate(value=>window.phase0.kv.kvSetAsync(window.phase0.policy.PROTECTED_POLICY_KEY,value),saved);}
    return {requestsSent:captures.length-before};
  });
  await step('unauthorized-app-cannot-call-new-capabilities',async()=>{
    const results=await page.evaluate(async()=>{const p=window.phase0,a={...p.app,permissions:[]};const actions=[()=>p.scoped.generateScoped(a,p.request),()=>p.policy.setProtectedPolicy(a,{id:'x',namespace:'x',text:'x'}),()=>p.sourceMemory.searchSourceMemory(a,p.scope),()=>p.sourceMemory.writeSourceMemory(a,{}),()=>p.aiTasks.startAiTask(a,{})];return Promise.all(actions.map(async f=>{try{await f();return false;}catch{return true;}}));});
    assert(results.every(Boolean));return results;
  });
  setDelay(800);
  let task;
  await step('durable-task-start-and-dedupe',async()=>{
    task=await sdk('ai','startTask',{idempotencyKey:'durable-one',request});assert.equal(task.status,'running');
    const same=await sdk('ai','startTask',{idempotencyKey:'durable-one',request});assert.equal(same.taskId,task.taskId);
    await assert.rejects(()=>sdk('ai','startTask',{idempotencyKey:'durable-one',request:{...request,appContext:'different'}}));
    await page.evaluate(()=>window.phase0.close());return task;
  });
  await step('closed-iframe-result-completes-in-host',async()=>{
    for(let i=0;i<100;i++) {
      const status=await page.evaluate(async taskId=>(await window.phase0.aiTasks.getAiTasks(window.phase0.app,taskId))[0],task.taskId);
      if(status?.status!=='running')break;
      await new Promise(r=>setTimeout(r,50));
    }
    const result=await page.evaluate(async taskId=>(await window.phase0.aiTasks.getAiTasks(window.phase0.app,taskId))[0],task.taskId);
    assert.equal(result.status,'completed',JSON.stringify(result));assert(result.result.raw);return result;
  });
  setDelay(0);
  await step('reload-host-retains-unconsumed-result-and-policy',async()=>{
    await page.reload();await page.waitForFunction(()=>!!window.phase0);await page.evaluate(async()=>{const p=window.phase0;await p.ready();p.app=p.apps.loadInstalledCustomApps().find(a=>a.manifest.id==='phase05.probe');if(!p.app)throw Error('App missing');p.mount(p.app);});
    const found=await sdk('ai','getTask',{taskId:task.taskId});assert.equal(found.status,'completed');assert(found.result.raw);return found;
  });
  await step('atomic-consume-commits-once',async()=>{
    await page.evaluate(()=>window.phase0.kv.kvSetAsync(window.phase0.apps.customAppCollectionKey(window.phase0.app.id,'badrows'),'corrupt'));
    await assert.rejects(()=>sdk('ai','consumeTask',{taskId:task.taskId,writes:[{collection:'results',id:'rollback',operation:'put',value:{text:'must rollback'}},{collection:'badrows',id:'bad',operation:'delete'}]}));
    assert.equal((await sdk('ai','getTask',{taskId:task.taskId})).status,'completed');
    const untouched=await (await frame()).evaluate(()=>window.AiPhone.db.list('results',{}));assert.equal(untouched.length,0);
    const writes=[{collection:'results',id:'post-1',operation:'put',value:{text:'parsed result'}}];
    const results=await Promise.all([sdk('ai','consumeTask',{taskId:task.taskId,writes}),sdk('ai','consumeTask',{taskId:task.taskId,writes})]);
    assert.equal(results.filter(r=>r.applied).length,1);
    const saved=await (await frame()).evaluate(()=>window.AiPhone.db.list('results',{}));assert.equal(saved.length,1);
    return {results,saved};
  });
  await call('policy-still-enforced-after-reload',()=>sdk('ai','generateScoped',request),hasGuard);
  await step('consumed-dedupe-survives-reload',async()=>{const before=captures.length;const existing=await sdk('ai','startTask',{idempotencyKey:'durable-one',request});assert.equal(existing.status,'consumed');assert.equal(captures.length,before);return existing;});
  await step('task-invalid-policy-fails-without-http',async()=>{
    const before=captures.length;const t=await sdk('ai','startTask',{idempotencyKey:'invalid-policy',request:{...request,contextPolicy:{badCategory:true}}});
    let found;for(let i=0;i<50;i++){found=await sdk('ai','getTask',{taskId:t.taskId});if(found.status!=='running')break;await new Promise(r=>setTimeout(r,20));}
    assert.equal(found.status,'failed');assert.equal(captures.length,before);return found;
  });
  await step('cross-tab-active-owner-and-host-restart',async()=>{
    setDelay(1500);const t=await sdk('ai','startTask',{idempotencyKey:'interrupt-host',request});
    const second=await page.context().newPage();
    try{
      await second.goto(origin);await second.waitForFunction(()=>!!window.phase0);await second.evaluate(()=>window.phase0.ready());
      const read=()=>second.evaluate(async id=>{const p=window.phase0,a=p.apps.loadInstalledCustomApps()[0];return (await p.aiTasks.getAiTasks(a,id))[0];},t.taskId);
      assert.equal((await read()).status,'running','second tab must not fail active task');
      await page.reload();await page.waitForFunction(()=>!!window.phase0);await page.evaluate(async()=>{const p=window.phase0;await p.ready();p.app=p.apps.loadInstalledCustomApps()[0];p.mount(p.app);});
      const recovered=await read();assert.equal(recovered.status,'failed');assert(recovered.error.includes('HOST_INTERRUPTED'));return recovered;
    }finally{await second.close();setDelay(0);}
  });
  await step('cancelled-task-does-not-publish-result',async()=>{
    setDelay(900);const t=await sdk('ai','startTask',{idempotencyKey:'cancel-one',request});await sdk('ai','cancelTask',{taskId:t.taskId});
    const result=await sdk('ai','getTask',{taskId:t.taskId});assert.equal(result.status,'cancelled');assert(!result.result);setDelay(0);return result;
  });
  await step('uninstall-cleans-task-results',async()=>{
    const result=await page.evaluate(async()=>{const p=window.phase0;const id=p.app.id;p.close();await p.apps.uninstallCustomAppAsync(id);return JSON.parse(await p.kv.kvReadFresh(p.aiTasks.AI_TASKS_KEY));});assert.equal(result.length,0);return true;
  });
  await step('uninstalled-task-start-is-rejected',async()=>{
    await assert.rejects(()=>page.evaluate(request=>{const p=window.phase0;return p.aiTasks.startAiTask(p.app,{idempotencyKey:'after-uninstall',request});},request));return true;
  });
  await step('all-required-http-payloads-saved',async()=>({count:captures.length,labels:captures.map(c=>c.label),note:'Real Host HTTP, deterministic local provider. Not a semantic model compliance test.'}));
}
