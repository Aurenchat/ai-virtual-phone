import React,{useState} from 'react';
import type {XiaohongshuEngine} from '../xiaohongshu-engine';
import {confirmDisclosure,revokeDisclosure} from './disclosure';
export function DisclosureSettings({engine,act}:{engine:XiaohongshuEngine;act:(fn:()=>Promise<unknown>)=>Promise<void>}){
 const [viewer,setViewer]=useState(''),[account,setAccount]=useState(''),[identity,setIdentity]=useState('');
 const row=engine.state.disclosures.find(d=>d.viewerCharacterId===viewer&&d.accountId===account);
 return <details><summary>按角色确认身份揭露（可选）</summary><p>仅当这个角色已被明确告知具体身份关系时确认。不会推测、读取其他角色记忆或自动传播。</p><label>知情角色<select aria-label="知情角色" value={viewer} onChange={e=>setViewer(e.target.value)}><option value="">选择角色</option>{engine.characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>网络账号<select aria-label="揭露账号" value={account} onChange={e=>setAccount(e.target.value)}><option value="">选择账号</option>{Object.values(engine.state.accounts).map(a=><option key={a.accountId} value={a.accountId}>{a.displayName}</option>)}</select></label><label>明确告知的现实身份<input aria-label="揭露身份" value={identity} onChange={e=>setIdentity(e.target.value)}/></label><p>当前：{row?.state==='explicitly_disclosed'?row.identity:'unknown'}</p><button disabled={!viewer||!account||!identity.trim()} onClick={()=>void act(()=>engine.edit(s=>confirmDisclosure(s,viewer,account,identity)))}>确认仅该角色知情</button><button disabled={!viewer||!account} onClick={()=>void act(()=>engine.edit(s=>revokeDisclosure(s,viewer,account)))}>撤销该角色的揭露</button><p>此版本由管理页确认；不会从语义相似或旧记忆自动恢复关系。</p></details>;
}
