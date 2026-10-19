window.modules={}; window.cloudCalls=[]; window.cloudFail=false; window.runtimeFail=false; window.backgroundBusy=false;
const fake={
 './boot-diagnostics':{markBootStage(){}},
 './settings-storage':{resolveUserIdentity:()=>({name:'Synthetic'})},
 './character-storage':{loadCharacters:()=>[]},
 './kv-db':{kvGet:()=>null,kvSet(){},registerKvMigration(){}},
 './chat-plugin-hooks':{emitChatPluginEvent(){},runChatPluginTransformSync:(name,data)=>data},
 './rich-message-parser':{parseAIResponse:()=>[]},
 './text-tool-protocol':{extractTextToolDirectiveText:()=>''},
 './chat-status-region':{captureCurrentStatusRendererId:()=>undefined},
 './follow-up-service':{isBackgroundReplyGenerating:()=>window.backgroundBusy},
 './weixin-cloud-sync':{deleteWeixinCloudMessagesFromCloud:async rows=>{cloudCalls.push(rows.map(m=>m.id));if(cloudFail)throw Error('synthetic cloud failure');return rows.filter(m=>m.cloudSync).length;},syncAllWeixinBotRuntimesToCloud:async()=>{if(runtimeFail)throw Error('synthetic runtime failure');}}
};
function load(name){if(modules[name])return modules[name].exports;const module={exports:{}};modules[name]=module;new Function('require','module','exports',SOURCES[name])(id=>{if(id==='dexie')return window.Dexie;if(fake[id])return fake[id];if(id==='@/lib/character-storage')return fake['./character-storage'];const local=id.replace('@/lib/','').replace('./','');if(SOURCES[local])return load(local);throw Error('Unexpected dependency '+id)},module,module.exports);return module.exports;}
window.db=load('chat-db').chatDb;window.storage=load('chat-storage');window.prune=load('chat-history-prune');
window.makeRows=(n,id='target')=>Array.from({length:n},(_,i)=>({id:id+'_'+String(i).padStart(6,'0'),sessionId:id,role:i%2?'assistant':'user',content:'synthetic '+i,status:'sent',createdAt:new Date(1700000000000+i*1000).toISOString(),order:i,...(i%4===1?{mediaType:'image',mediaUrl:'media-store://synthetic-image'}:i%4===2?{mediaType:'audio',mediaUrl:'media-store://synthetic-audio',mediaData:{voiceDuration:2}}:i%4===3?{mediaType:'sticker',mediaUrl:'asset://synthetic-sticker'}:{})}));
window.seed=async(n,patch)=>{
 await db.messages.clear();await db.sessions.clear();await db.contacts.clear();
 const rows=makeRows(n),other=makeRows(7,'other');if(patch)patch(rows);
 await db.messages.bulkPut([...rows,...other]);await db.sessions.bulkPut(['target','other'].map(id=>({id,contactId:id,unreadCount:0,updatedAt:rows.at(-1)?.createdAt||'',isPinned:false})));
 localStorage.setItem('ai_phone_idb_migrated_v1','1');await storage.hydrateChatStorage();
 await db.transaction('r',db.messages,db.sessions,async()=>{await db.sessions.count()});
 return {rows:storage.loadChatMessages('target'),other:storage.loadChatMessages('other')};
};
