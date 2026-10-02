// Actual ChatRoom, CSS injector, IndexedDB storage and plugin runtime in an isolated browser origin.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChatRoom } from '../../components/chat/chat-room';
import * as chat from '../../lib/chat-storage';
import { appendChatOfflineTurn, clearChatOfflineTurns } from '../../lib/chat-offline-storage';
import { hydrateKvDb } from '../../lib/kv-db';
import { saveCharacters } from '../../lib/character-storage';
import { ensureSettingsStorageHydrated, saveApiConfigs, saveBindingConfig } from '../../lib/settings-storage';
import { installChatPluginFromCode } from '../../lib/chat-plugin-loader';
import { getChatPluginRuntime } from '../../lib/chat-plugin-runtime';
import * as plugins from '../../lib/chat-plugin-storage';
import { saveMusicApiConfig } from '../../lib/music-service';
import { registerMusicControlBridge } from '../../lib/music-control-bridge';
import type { MusicTrack } from '../../lib/music-storage';
import { resolveMusicSharePreview, persistMusicSharePreview } from '../../lib/music-share-preview';
const root=createRoot(document.getElementById('app')!);
let session: chat.ChatSession;
let renderKey: string | number = 'current';
const probe={
 musicPlays: [] as MusicTrack[],
 resolveMusicSharePreview, persistMusicSharePreview,
 async musicResume(){
  await hydrateKvDb(); await chat.hydrateChatStorage(); await ensureSettingsStorageHydrated();
  await getChatPluginRuntime().ensureStarted();
  probe.musicSetup(); probe.remount();
 },
 musicSetup(){
  saveMusicApiConfig({baseUrl:location.origin+'/netease',enabled:true});
  registerMusicControlBridge({
   getState:()=>({currentTrack:null,isPlaying:false,currentTime:0,duration:0,playMode:'sequence',queue:[],volume:1}),
   playTrack:async track=>{probe.musicPlays.push(track);return {ok:true,message:'fixture',track};},
   playByQuery:async()=>({ok:false,message:'unused'}),
   addToQueue:async tracks=>({ok:true,message:'fixture',queue:tracks}),
   pause(){},resume(){},stop(){},next(){},prev(){},setPlayMode(){},
  });
 },
 chat, plugins, install: installChatPluginFromCode,
 async mount(variant='current') {
  await hydrateKvDb(); await chat.hydrateChatStorage(); await ensureSettingsStorageHydrated();
  const now=new Date().toISOString();
  saveCharacters([
   {id:'im-reference',name:'dickhead 🖕🏻',avatar:null,persona:'',createdAt:now,updatedAt:now},
   {id:'im-second',name:'Misty Olszewski',avatar:null,persona:'',createdAt:now,updatedAt:now},
  ]);
  chat.addChatContact('im-reference');
  session=chat.createOrGetSession('im-reference');
  session={...session,autoReplied:true,customCSS:await (await fetch(`/theme/${variant}/iMessage-Native-Day.css`)).text()};
  chat.saveChatSessions([session]);
  chat.clearChatSessionMessages(session.id);
  const contents=[['assistant',"so HR is just openly corrupt now"],['assistant','rejecting cold hard cash for a selfie'],['assistant',"i don't deal in that currency"],['user','wrong currency'],['user','try to send a selfie']];
  contents.forEach(([role,content],i)=>chat.pushChatMessage({sessionId:session.id,role:role as 'user'|'assistant',content,createdAt:new Date(Date.UTC(2026,8,28,11,19,i)).toISOString()}));
  for(const file of ['iMessage-Message-Bridge.js','iMessage-Toolbar.js']) {
   const result=await installChatPluginFromCode(await (await fetch(`/theme/${variant}/${file}`)).text());
   if(!result.ok) throw Error(result.error);
  }
  await getChatPluginRuntime().ensureStarted();
  renderKey=variant;probe.rerender();
 },
 remount(){session={...chat.loadChatSessions()[0]};renderKey=Math.random();probe.rerender();},
 rerender(){root.render(<div className="chat-app" style={{height:'100%',position:'relative'}}><ChatRoom key={renderKey} session={{...session}} onBack={()=>{}} /></div>);},
 refresh(){window.dispatchEvent(new CustomEvent('chat-messages-updated',{detail:{sessionId:session.id}}));},
 switchSession(id: string){session={...chat.loadChatSessions().find(s=>s.id===id)!};probe.rerender();},
 add(input: Partial<chat.ChatMessage>){return chat.pushChatMessage({sessionId:session.id,role:'assistant',content:'测试消息',...input});},
 scene(messages: Partial<chat.ChatMessage>[]){
  chat.clearChatSessionMessages(session.id);
  const saved=messages.map((msg,i)=>probe.add({createdAt:new Date(Date.UTC(2026,8,29,1,0,i)).toISOString(),...msg}));
  probe.remount();return saved;
 },
 groupScene(messages: Partial<chat.ChatMessage>[]){
  session={...session,isGroup:true,groupName:'Fixture Group',participantIds:['im-reference','im-second'],isSpectator:true};
  chat.saveChatSessions([session]);
  return probe.scene(messages);
 },
 singleScene(messages: Partial<chat.ChatMessage>[]){
  session={...session,isGroup:false,groupName:undefined,participantIds:undefined,isSpectator:undefined};
  chat.saveChatSessions([session]);
  return probe.scene(messages);
 },
 offlineScene(){
  clearChatOfflineTurns(session.id);
  appendChatOfflineTurn({sessionId:session.id,userContent:'线下用户正文用于字号验证',assistantContent:'线下角色正文用于字号验证。第二行保持真实排版。',summary:'线下摘要字号验证',summaryTag:'summary'});
 },
 leave(){root.render(<div>Fixture outside ChatRoom</div>);},
 prepareStream(){
  saveApiConfigs([{id:'fixture-api',provider:'openai',apiKey:'local-fixture-only',baseUrl:location.origin+'/v1',defaultModel:'fixture',enableNativeTools:false,enableImageRecognition:false,enableImageGeneration:false}]);
  saveBindingConfig({globalDefaults:{apiConfigId:'fixture-api'},characterBindings:[]});
  session={...session,streamOnline:true};chat.saveChatSessions([session]);probe.remount();
 },
 requestReply(){window.dispatchEvent(new CustomEvent(chat.CHAT_REQUEST_REPLY_EVENT,{detail:{sessionId:session.id}}));},
 wallpaper(enabled: boolean, tone?: string){
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="402" height="874"><defs><pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" fill="#30475e"/><rect width="18" height="18" fill="#a2bbca"/><rect x="18" y="18" width="18" height="18" fill="#a2bbca"/></pattern></defs><rect width="402" height="874" fill="url(#grid)"/></svg>';
  const backdrop=tone?`<svg xmlns="http://www.w3.org/2000/svg" width="402" height="874"><rect width="402" height="874" fill="${tone}"/></svg>`:svg;
  session={...chat.loadChatSessions()[0],backgroundImage:enabled?'data:image/svg+xml;base64,'+btoa(backdrop):undefined};
  chat.saveChatSessions([session]);probe.remount();
 },
};
(window as unknown as {imTest:typeof probe}).imTest=probe;
