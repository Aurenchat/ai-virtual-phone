// Synthetic-only browser fixture extending native prune's real IndexedDB loader.
function load(name){
 if(modules[name])return modules[name].exports;
 const module={exports:{}};modules[name]=module;
 new Function('require','module','exports',SOURCES[name])(id=>{
   if(id==='dexie')return window.Dexie;
   if(fake[id])return fake[id];
   const parts=id.startsWith('.')?name.split('/').slice(0,-1).concat(id.split('/')):id.replace('@/lib/','').split('/');
   const normalized=[];for(const p of parts){if(p==='..')normalized.pop();else if(p!=='.'&&p)normalized.push(p);}
   const local=normalized.join('/');
   if(fake['./'+local])return fake['./'+local];
   if(SOURCES[local])return load(local);
   throw Error('Unexpected dependency '+name+' -> '+id);
 },module,module.exports);return module.exports;
}
window.characters=[{id:'alex',name:'Alex Keller'},{id:'other-character',name:'Other'}];
window.kv=new Map();window.pluginEvents=[];window.cancelled=[];
Object.assign(fake['./character-storage'],{loadCharacters:()=>characters});
Object.assign(fake['./settings-storage'],{resolveUserIdentity:()=>({name:'Chloe'})});
Object.assign(fake['./kv-db'],{kvGet:k=>kv.get(k)||null,kvSet:(k,v)=>kv.set(k,v),kvRemove:k=>kv.delete(k)});
Object.assign(fake['./chat-plugin-hooks'],{emitChatPluginEvent:(...a)=>pluginEvents.push(a),runChatPluginTransformSync:(_n,v)=>v});
Object.assign(fake['./follow-up-service'],{cancelBackgroundGeneration:id=>cancelled.push(id),cancelFollowUp:id=>cancelled.push(id)});
fake['./chat-offline-storage']={loadChatOfflineProjectionEntries:()=>[],loadChatOfflineTurns:()=>[],getLastChatOfflineTurn:()=>null,saveChatOfflineTurns(){},clearChatOfflineTurns(){}};
fake['./timed-wake-storage']={clearTimedWakeSchedule(){}};
fake['./keyboard-auto-send-config']={setSessionKeyboardAutoSendEnabled(){},setSessionKeyboardAutoSendDebounce(){}};
fake['./chat-status-region'].saveStatusRegionConfig=()=>{};
fake['./friend-request-engine']={PENDING_REPLY_PREFIX:'pending:'};
fake['./memory-storage']={loadMemoryConfig:()=>({shortTermTokenBudget:50000,shortTermAllowedSources:{}})};
const projections={
 './moments-storage':['loadMomentPosts','loadMomentComments'], './story-storage':['loadStoryProjectionEntries'],
 './vn-storage':['loadVnProjectionEntries'], './map-storage':['loadMapProjectionEntries','loadMapSharedProjectionEntries'],
 './game-storage':['loadGameProjectionEntries'], './diary-entry-storage':['loadDiaryEntries'], './notewall-memory':['loadNoteWallProjectionEntries'],
 './xiaohongshu-memory':['loadXiaohongshuProjectionEntries'], './black-market-storage':['loadBlackMarketTheaterProjectionEntries'],
 './interview-magazine-memory':['loadInterviewMagazineProjectionEntries'], './cocreate-memory':['loadCoCreateProjectionEntries'],
 './checkphone-storage':['loadCheckPhoneProjectionEntries'], './custom-app-storage':['loadCustomAppTimelineEntries']
};
for(const [id,keys]of Object.entries(projections))fake[id]=Object.fromEntries(keys.map(k=>[k,()=>[]]));
fake['./memory-provenance']={isCachedMemoryProvenanceValid:()=>true,memorySourceEnvelope:()=>''};
fake['./group-admin']={buildGroupAdminBracketText:()=>''};
fake['./gift-prompt']={formatGiftForPrompt:()=>''};
fake['./moments-comment-threading']={buildTwoLevelMomentThreads:()=>[]};
fake['./character-world-storage']={canCharacterSeeMomentPost:()=>false,getVisibleMomentCommentsForCharacter:()=>[],getVisibleMomentLikesForCharacter:()=>[]};
fake['./chat-share']={formatXiaohongshuShareForPrompt:()=>''};
fake['./prompt-sanitizer']={stripStateAndInnerForPrompt:s=>s};
fake['./reading-quote']={formatReadingQuoteContent:(_message,s)=>s};
fake['./user-macro']={renderUserNameMacro:s=>s};
fake['./shopping-payment-request']={formatShoppingPaymentRequestHistory:()=>''};
fake['./character-time']={getSystemTimeZone:()=> 'UTC',formatZonedPromptTimestamp:s=>s};
window.timeline=load('short-term-assembler');window.merge=load('chat-session-merge');window.remove=load('chat-session-remove');
window.backup=load('data-management/idb');
window.flush=async()=>{await new Promise(r=>setTimeout(r,100));await db.transaction('r',db.messages,db.sessions,db.contacts,()=>db.sessions.count());};
window.fresh=async()=>{
 await db.messages.clear();await db.sessions.clear();await db.contacts.clear();kv.clear();pluginEvents.length=0;
 localStorage.setItem('ai_phone_idb_migrated_v1','1');await storage.hydrateChatStorage();
};
window.addTurns=(id,n,prefix)=>Array.from({length:n},(_,i)=>storage.pushChatMessage({sessionId:id,role:i%2?'assistant':'user',content:prefix+i,status:'sent',createdAt:new Date(1700000000000+i*1000).toISOString()}));
