// CUSTOM-APP-ADAPTER: sharing is an explicit forwarding action, not authorship.
import React from 'react';import {createRoot} from 'react-dom/client';
import {loadCharacters,managementName,ownerCharacter} from './characters';
import {accountByName,publicAccount} from './identity';
import {host} from './host';
export type ChatSharePayload={type:'xiaohongshu_note';authorName:string;title:string;body:string;description:string;noteType:string;tags:string[];imageAssetId?:string;coverIcon:string;tone:string};
export function shareCard(share:ChatSharePayload){
 const author=accountByName(share.authorName);if(!author)return;
 const node=document.createElement('div');(document.querySelector('.xhs-app')||document.body).append(node);const root=createRoot(node);
 const close=()=>{root.unmount();node.remove();};
 root.render(<div className="xhs-modal-backdrop" onClick={close}><section className="xhs-profile-edit-sheet" onClick={e=>e.stopPropagation()}><header className="xhs-profile-edit-header"><strong>分享到聊天</strong><button aria-label="关闭" onClick={close}>×</button></header><div className="xhs-profile-edit-body">{loadCharacters().map(c=><button key={c.id} className="xhs-profile-edit-pill" onClick={async()=>{await (host() as any).chat.sendCard({characterId:ownerCharacter(c.id)!.id,title:share.title,body:share.body,summary:`[匿名小红书] ${author.displayName}：${share.title}`,historyText:'当前聊天者分享了一篇[匿名小红书]帖子；分享者不等于作者。'+JSON.stringify({author:publicAccount(author),title:share.title,body:share.body,tags:share.tags,description:share.description})});close();}}>{managementName(c.id)}</button>)}</div></section></div>);
}
