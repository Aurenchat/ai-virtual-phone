// CUSTOM-APP-ADAPTER: synchronous native KV API over a hydrated, App-scoped SDK database.
// Every key below is a record INSIDE this installed App, never Float's native KV namespace.
import {host} from './host';
type Values=Record<string,string>;
let values:Values={};
let writes:Promise<void>=Promise.resolve();
let fault:unknown;
export async function put(collection:string,id:string,value:Record<string,unknown>){
 const api=host();const prior=await api.db.get(collection,id);
 if(prior)await api.db.update(collection,id,value);else await api.db.create(collection,{...value,id});
}
export async function hydrate(){
 const row=await host().db.get('fork_storage','kv');values=row?.values||{};
 if(!row){
  const legacy=await host().db.get('phase1a_state','state');
  if(legacy){
   if(legacy.jobs?.some((job:any)=>job.status==='queued'||job.status==='running'))throw Error('旧版本仍有未完成任务；迁移暂停，原任务和数据均保留');
   const platform=structuredClone(legacy.platform);
   if(legacy.noteIds){platform.notes=await Promise.all(legacy.noteIds.map((id:string)=>host().db.get('notes_v2',id)));if(platform.notes.some((n:unknown)=>!n))throw Error('旧帖子索引不完整，迁移停止；原记录保持不变');}
   values['ai_phone_xiaohongshu_state_v1']=JSON.stringify(platform);
   values['identity']=JSON.stringify({accounts:legacy.accounts,bindings:legacy.bindings,disclosures:legacy.disclosures,userAccountId:legacy.userAccountId});
   values['user_profile_initialized']=legacy.userAccountId?'true':'false';
   values['nickname-ready']=JSON.stringify(legacy.bindings.filter((b:any)=>b.ownerKind==='character').map((b:any)=>b.accountId));
  }else{
   const accounts=await host().db.list('social_accounts',{limit:500});
   if(accounts.length){
    const {createDefaultXiaohongshuState}=await import('../fork/lib/xiaohongshu-storage');
    const {migrateLegacy}=await import('./legacy-migration');
    const migrated={accounts:{},bindings:[],disclosures:[],platform:createDefaultXiaohongshuState(),images:{}} as Parameters<typeof migrateLegacy>[0];
    await migrateLegacy(migrated,accounts);
    const {platform,images:_images,migrationNotice,...identity}=migrated;
    values['identity']=JSON.stringify(identity);values['ai_phone_xiaohongshu_state_v1']=JSON.stringify(platform);
    values['user_profile_initialized']=identity.userAccountId?'true':'false';values['migration_notice']=migrationNotice||'';
    values['nickname-ready']=JSON.stringify(identity.bindings.filter(b=>b.ownerKind==='character').map(b=>b.accountId));
   }
  }
  await put('fork_storage','kv',{values});
 }
}
export function kvGet(key:string){return values[key]??null;}
export function kvSet(key:string,value:string){values[key]=value;enqueue();}
export function kvRemove(key:string){delete values[key];enqueue();}
export function kvKeysWithPrefix(prefix:string){return Object.keys(values).filter(k=>k.startsWith(prefix));}
export function registerDynamicPrefix(_prefix:string){}
export function registerKvMigration(_key:string){}
function enqueue(){const snapshot=structuredClone(values);writes=writes.then(()=>put('fork_storage','kv',{values:snapshot})).catch(e=>{fault=e;});}
export async function flush(){await writes;if(fault){const e=fault;fault=undefined;throw e;}}
