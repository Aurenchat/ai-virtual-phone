import React from 'react';
import {createRoot} from 'react-dom/client';
import {host} from './adapters/host';
import {hydrate,flush} from './adapters/storage';
import {initIdentity,PROTECTED_RULE} from './adapters/identity';
import {initializeCharacters,initializeNicknames} from './adapters/characters';
import {initializeMedia} from './adapters/media';
import {flushMemories} from './adapters/memory';
const root=createRoot(document.getElementById('root')!);
const close=()=>{void host().app.close();};
root.render(<section className="xhs-app cp-xhs-module"><header className="cp-xhs-appbar"><button className="cp-float-back" aria-label="返回桌面" onClick={close}>‹</button></header></section>);
async function start(){
 await hydrate();initIdentity();
 await Promise.all([initializeCharacters(),initializeMedia(),host().app.setPolicy({id:'pseudonymous-identities',namespace:'social_posts',text:PROTECTED_RULE})]);await flush();
 // Dynamic import ensures packaged avatar URLs exist before evaluating native constants.
 const {XiaohongshuApp}=await import('./fork/components/xiaohongshu/xiaohongshu-app');
 root.render(<XiaohongshuApp onClose={close} onNotice={message=>{void host().ui.toast(message);}}/>);
 void flushMemories().catch(()=>{});
 const {loadXiaohongshuState}=await import('./fork/lib/xiaohongshu-storage');
 void initializeNicknames(loadXiaohongshuState().settings.participantCharacterIds);
}
void start().catch(()=>root.render(<section className="xhs-app cp-xhs-module"><button aria-label="返回桌面" onClick={close}>返回</button><p>暂时无法读取应用数据，请稍后重新打开。</p></section>));
