// ANON-FORK: the native product receives projected Character records, with UI-only avatars.
import {host} from './host';
import {identity,saveIdentity,createAccount,renameAccount} from './identity';
import {kvGet,kvSet,flush} from './storage';
import {durableRaw} from './tasks';
export type Character={id:string;name:string;avatar?:string|null;persona?:string;personality?:string};
let privateCharacters:Character[]=[];
const listeners=new Set<()=>void>();let naming:Promise<void>|undefined;let retryTimer:ReturnType<typeof setTimeout>|undefined;
export async function initializeCharacters(){privateCharacters=await host().characters.list();for(const c of privateCharacters){if(!identity().bindings.some(b=>b.ownerKind==='character'&&b.ownerId===c.id)){const a=createAccount('旅人_'+crypto.randomUUID().slice(0,8));identity().bindings.push({accountId:a.accountId,ownerKind:'character',ownerId:c.id});}}saveIdentity();}
export function loadCharacters():Character[]{return privateCharacters.flatMap(c=>{const binding=identity().bindings.find(b=>b.ownerKind==='character'&&b.ownerId===c.id);const a=binding&&identity().accounts[binding.accountId];return a?[{id:a.accountId,name:a.displayName,avatar:c.avatar}]:[];});}
export function ownerCharacter(accountId:string){const binding=identity().bindings.find(b=>b.accountId===accountId&&b.ownerKind==='character');return privateCharacters.find(c=>c.id===binding?.ownerId);}
export function routingCharacter(){return privateCharacters[0];}
export function managementName(accountId:string){return ownerCharacter(accountId)?.name||identity().accounts[accountId]?.displayName||'';}
export function subscribeCharacters(fn:()=>void){listeners.add(fn);return ()=>{listeners.delete(fn);};}
function emit(){listeners.forEach(fn=>fn());window.dispatchEvent(new Event('xiaohongshu-updated'));}
export function projectProfileText(value:string,selfId?:string){
 // Static persona projection only. Legacy/mixed memories remain entirely excluded.
 let text=value;
 const names=[...privateCharacters.flatMap(c=>[{from:c.id,to:c.id===selfId?'当前账号':'一位熟人'},{from:c.name,to:c.id===selfId?'当前账号':'一位熟人'}]),{from:'Chloe',to:'一位熟人'},{from:'kk',to:'一位熟人'}].sort((a,b)=>b.from.length-a.from.length);
 for(const {from,to} of names){if(!from)continue;const escaped=from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const latin=/^[\w -]+$/.test(from);text=text.replace(new RegExp(latin?`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`:escaped,'giu'),to);}
 return text.replace(/\{\{\s*(user|char)\s*\}\}/gi,(_m,key)=>key.toLowerCase()==='char'?'当前账号':'一位独立社交账号');
}
export function projectedPersona(accountId:string){const c=ownerCharacter(accountId);return c?projectProfileText([c.persona,c.personality].filter(Boolean).join('\n'),c.id):'';}
function uniqueName(raw:string,accountId:string){
 const forbidden=['kk','chloe',...privateCharacters.map(c=>c.name)].map(n=>n.toLocaleLowerCase());
 let base=raw.trim().replace(/[\r\n<>\[\]{}|]/g,'').slice(0,28);
 if(!base||forbidden.some(n=>n&&base.toLowerCase().includes(n)))base='夜航_'+crypto.randomUUID().slice(0,6);
 let name=base,n=2;const used=(x:string)=>Object.values(identity().accounts).some(a=>a.accountId!==accountId&&[a.displayName,...a.aliases].some(v=>v.normalize('NFKC').toLowerCase()===x.normalize('NFKC').toLowerCase()));
 while(used(name))name=base+'_'+n++;
 return name;
}
export function editNickname(accountId:string,name:string){const n=name.trim();if(uniqueName(n,accountId)!==n)throw Error('请输入未被占用且不含真实姓名的网名');renameAccount(accountId,n);const ready=JSON.parse(kvGet('nickname-ready')||'[]');if(!ready.includes(accountId)){ready.push(accountId);kvSet('nickname-ready',JSON.stringify(ready));}emit();}
export function initializeNicknames(ids:string[]):Promise<void>{
 if(naming)return naming;
 const ready:string[]=JSON.parse(kvGet('nickname-ready')||'[]');const missing=ids.filter(id=>ownerCharacter(id)&&!ready.includes(id));if(!missing.length)return Promise.resolve();
 naming=(async()=>{
  let job=JSON.parse(kvGet('nickname-batch')||'null');
  if(!job){job={key:'nicknames.'+crypto.randomUUID(),ids:missing,request:{characterId:routingCharacter()!.id,contextPolicy:{},appContext:'[匿名小红书] 平台网名初始化工具；不扮演任何账号，不接收现实身份。',messages:[{role:'user',content:'为以下独立 social_account 批量生成固定网络昵称，不用真名、代号或身份。每个账号输出一个，不要共享昵称。只输出 JSON {"accounts":[{"accountId":"...","displayName":"..."}]}。\n'+JSON.stringify(missing.map(id=>({accountId:id,profile:projectedPersona(id)})))}]}};kvSet('nickname-batch',JSON.stringify(job));await flush();}
  const raw=await durableRaw(job.request,job.key);const parsed=JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g,''));
  if(!Array.isArray(parsed.accounts))throw Error('nickname format');
  const currentReady:string[]=JSON.parse(kvGet('nickname-ready')||'[]');
  for(const id of job.ids){if(currentReady.includes(id))continue;const candidate=parsed.accounts.find((a:any)=>a.accountId===id);if(!candidate?.displayName)continue;renameAccount(id,uniqueName(String(candidate.displayName),id));currentReady.push(id);}
  kvSet('nickname-ready',JSON.stringify(currentReady));kvSet('nickname-batch','null');await flush();emit();
  if(job.ids.some((id:string)=>!currentReady.includes(id)))throw Error('incomplete nickname batch');
 })().catch(()=>{
  // Private retry state; never block feed, never show a task error, never use a real-name fallback.
  kvSet('nickname-batch','null');if(!retryTimer)retryTimer=setTimeout(()=>{retryTimer=undefined;void initializeNicknames(ids);},15000);
 }).finally(()=>{naming=undefined;});return naming;
}
