import React, {useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ChatRoom} from '@/components/chat/chat-room';
import {useKeyboardDismissAutoSend} from '@/components/chat/use-keyboard-dismiss-auto-send';
import * as chat from '@/lib/chat-storage';
import {hydrateKvDb, kvSet} from '@/lib/kv-db';
import {saveCharacters} from '@/lib/character-storage';
import {ensureSettingsStorageHydrated, saveApiConfigs, saveBindingConfig} from '@/lib/settings-storage';
import {setSessionKeyboardAutoSendDebounce, setSessionKeyboardAutoSendEnabled} from '@/lib/keyboard-auto-send-config';
import {installChatPluginFromCode} from '@/lib/chat-plugin-loader';
import {getChatPluginRuntime} from '@/lib/chat-plugin-runtime';
import {loadCustomAppPackage, installCustomApp, writeCustomAppCollection} from '@/lib/custom-app-storage';

const root=createRoot(document.getElementById('app')!);
let session: chat.ChatSession;
let triggers=0;
let updateProbe: React.Dispatch<React.SetStateAction<{active:boolean;pending:boolean;generating:boolean;panelOpen:boolean;interactionOpen:boolean;sessionId:string}>>;
function Probe() {
 const ref=useRef<HTMLDivElement>(null);
 const [state,setState]=useState({active:true,pending:true,generating:false,panelOpen:false,interactionOpen:false,sessionId:session.id});
 updateProbe=setState;
 const handlers=useKeyboardDismissAutoSend(ref,{...state,onTrigger:()=>{triggers++;}});
 (window as unknown as {keyboardProbe:typeof handlers}).keyboardProbe=handlers;
 return <div ref={ref} className="chat-room-wrapper"><div className="chat-input-bar"><textarea className="chat-input-textarea"/><button id="toolbar">Toolbar</button></div><button id="outside">Outside</button></div>;
}
const api={
 chat,
 async init() {
  await hydrateKvDb();await chat.hydrateChatStorage();await ensureSettingsStorageHydrated();
  const now=new Date().toISOString();
  saveCharacters(['one','two'].map(id=>({id:'keyboard-'+id,name:'Synthetic '+id,avatar:null,persona:'Synthetic keyboard regression only',createdAt:now,updatedAt:now})));
  chat.addChatContact('keyboard-one');session=chat.createOrGetSession('keyboard-one');
  session={...session,autoReplied:true,streamOnline:true,customCSS:await (await fetch('/theme/iMessage-Native-Day.css')).text()};
  chat.saveChatSessions([session]);
  saveApiConfigs([{id:'keyboard-api',provider:'openai',apiKey:'synthetic-local-only',baseUrl:location.origin+'/v1',defaultModel:'fixture',enableNativeTools:false,enableImageRecognition:false,enableImageGeneration:false}]);
  saveBindingConfig({globalDefaults:{apiConfigId:'keyboard-api'},characterBindings:[]});
  for(const file of ['iMessage-Message-Bridge.js','iMessage-Toolbar.js']) {
   const result=await installChatPluginFromCode(await (await fetch('/theme/'+file)).text());if(!result.ok)throw Error(result.error);
  }
  await getChatPluginRuntime().ensureStarted();
  for(const file of ['menu.js','reactions.js']) {
   const response=await fetch('/theme/'+file);if(!response.ok)continue;
   const result=await installChatPluginFromCode(await response.text());if(!result.ok)throw Error(result.error);
  }
  const collect=await fetch('/collect.zip');
  if(collect.ok) {
   const app=installCustomApp(await loadCustomAppPackage(new File([await collect.blob()],'collect.zip')));
   writeCustomAppCollection(app.id,'collect_treasures',[{id:'synthetic-treasure',characterId:'keyboard-one',title:'Synthetic test keepsake',category:'Test',confirmed:true,meaning:'Synthetic fixture only',createdAt:now,updatedAt:now}]);
  }
 },
 scene(delay=2000,mode='probe',group=false) {
  kvSet('chat-offline-mode:'+session.id,'0');
  triggers=0;setSessionKeyboardAutoSendEnabled(session.id,true);setSessionKeyboardAutoSendDebounce(session.id,delay);
  session={...session,isGroup:group,groupName:group?'Synthetic Group':undefined,participantIds:group?['keyboard-one','keyboard-two']:undefined};
  chat.saveChatSessions([session]);chat.clearChatSessionMessages(session.id);
  chat.pushChatMessage({sessionId:session.id,role:'user',content:'Synthetic pending user message'});
  root.render(mode==='probe'?<Probe key={Math.random()}/>:<div className="chat-app" style={{height:'100%',position:'relative'}}><ChatRoom key={Math.random()} session={{...session}} onBack={()=>{}}/></div>);
 },
 update(state: Parameters<typeof updateProbe>[0]){updateProbe(state);},
 triggers:()=>triggers,
 enabled:(enabled:boolean)=>setSessionKeyboardAutoSendEnabled(session.id,enabled),
 nextProbeSession(){
  const id=session.id+'-next';setSessionKeyboardAutoSendEnabled(id,true);setSessionKeyboardAutoSendDebounce(id,2000);
  chat.pushChatMessage({sessionId:id,role:'user',content:'Synthetic other session'});updateProbe(s=>({...s,sessionId:id,panelOpen:false,interactionOpen:false}));
 },
 session:()=>session.id,
 leave(){root.render(<div>Outside chat</div>);},
};
(window as unknown as {keyboardTest:typeof api}).keyboardTest=api;
