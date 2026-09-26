// ANON-FORK: only additional settings section, reusing original fields and layout.
import React,{useState} from 'react';
import {loadCharacters,managementName,editNickname} from '../adapters/characters';
import {kvGet} from '../adapters/storage';
export function NicknameSettings({onChange}:{onChange:()=>void}){
 const [error,setError]=useState('');const ready:string[]=JSON.parse(kvGet('nickname-ready')||'[]');
 if(!ready.length)return null;
 return <div className="xhs-profile-edit-field"><span className="xhs-profile-edit-section-title">NICKNAMES <em>角色网名</em></span>{loadCharacters().filter(c=>ready.includes(c.id)).map(c=><label key={c.id} className="xhs-profile-edit-field"><span>{managementName(c.id)}</span><input aria-label={`${managementName(c.id)} 匿名网名`} className="xhs-profile-edit-pill" defaultValue={c.name} onBlur={e=>{try{editNickname(c.id,e.target.value);setError('');onChange();}catch(err){setError(String((err as Error).message));}}}/></label>)}{error?<span role="alert">{error}</span>:null}</div>;
}
