// ANON-FORK: runtime ownership stays private. Product-facing IDs/names are social accounts.
import type {IdentityState,SocialAccount} from '../identity/accounts';
import {opaqueId,PROTECTED_RULE,publicAccount,viewerContext} from '../identity/accounts';
import type {XiaohongshuState} from '../fork/lib/xiaohongshu-types';
import {kvGet,kvSet} from './storage';
export {PROTECTED_RULE,publicAccount};
let identities:IdentityState={accounts:{},bindings:[],disclosures:[]};
export function initIdentity(){identities=JSON.parse(kvGet('identity')||'null')||identities;if(!identities.userAccountId){const a=createAccount('旅人_'+opaqueId().slice(-6));identities.userAccountId=a.accountId;identities.bindings.push({accountId:a.accountId,ownerKind:'user',ownerId:'local-controller'});}saveIdentity();}
export function identity(){return identities;}
export function saveIdentity(){kvSet('identity',JSON.stringify(identities));}
export function createAccount(displayName:string):SocialAccount{const a={accountId:opaqueId(),displayName,aliases:[]};identities.accounts[a.accountId]=a;return a;}
export function accountByName(name:string){return Object.values(identities.accounts).find(a=>a.displayName===name||a.aliases.includes(name));}
export function ensureBackground(name:string){return accountByName(name)||createAccount(name);}
export function userAccount(){return identities.accounts[identities.userAccountId!];}
export function hasUserProfile(){return kvGet('user_profile_initialized')==='true';}
export function setUserAvatar(dataUrl:string){userAccount().avatar=dataUrl;saveIdentity();}
export function setUserProfile(name:string){const n=name.trim();if(!n||/^(kk|chloe|user|\{\{user\}\})$/i.test(n))return false;renameAccount(userAccount().accountId,n);kvSet('user_profile_initialized','true');return true;}
export function renameAccount(id:string,name:string){const a=identities.accounts[id];const n=name.trim();if(!a||!n||n.length>40)throw Error('请输入 1–40 字的昵称');if(Object.values(identities.accounts).some(x=>x.accountId!==id&&(x.displayName===n||x.aliases.includes(n))))throw Error('这个网名已被使用');if(n!==a.displayName){a.aliases=[...new Set([...a.aliases,a.displayName])];a.displayName=n;}saveIdentity();const raw=kvGet('ai_phone_xiaohongshu_state_v1');if(raw)kvSet('ai_phone_xiaohongshu_state_v1',JSON.stringify(canonicalPlatform(JSON.parse(raw))));}
export function bindingFor(accountId:string){return identities.bindings.find(b=>b.accountId===accountId);}
export function subjectAccount(id:string,name:string,type:string){return type==='user'?userAccount():identities.accounts[id]||ensureBackground(name);}
export function publicContext(viewer?:string){return viewer?viewerContext(identities,viewer):{source:'[匿名小红书]',accounts:Object.values(identities.accounts).map(publicAccount)};}
export function canonicalPlatform(state:XiaohongshuState):XiaohongshuState{
 const author=subjectAccount;
 const notes=state.notes.map(n=>{const a=author(n.authorId,n.authorName,n.source);return {...n,authorId:a.accountId,authorName:a.displayName,comments:n.comments.map(c=>{const ca=author(c.authorId,c.authorName,c.authorType);return {...c,authorId:ca.accountId,authorName:ca.displayName,replyTo:c.replyTo?accountByName(c.replyTo)?.displayName||c.replyTo:undefined};}),recentLikeNames:n.recentLikeNames.map(x=>ensureBackground(x).displayName),recentSaveNames:n.recentSaveNames.map(x=>ensureBackground(x).displayName)};});
 const graph=(rows:XiaohongshuState['socialGraph']['following'])=>rows.map(a=>{const social=author(a.id,a.name,a.type);return {...a,id:social.accountId,name:social.displayName};});
 const next={...state,notes,profile:{...state.profile,nickname:userAccount().displayName},socialGraph:{following:graph(state.socialGraph.following),followers:graph(state.socialGraph.followers)},notifications:state.notifications.map(n=>({...n,actorName:ensureBackground(n.actorName).displayName,threadName:n.threadName?ensureBackground(n.threadName).displayName:undefined}))};saveIdentity();return next;
}
