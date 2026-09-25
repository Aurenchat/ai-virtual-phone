import {host,type ScopedGenerationRequest} from './adapters/host';
import {createDefaultXiaohongshuState} from './baseline-storage';
import type {XiaohongshuState} from './xiaohongshu-types';
import type {IdentityState} from './identity/accounts';
import {migrateLegacy} from './adapters/legacy-migration';
export type JobKind='nickname'|'feed'|'activity'|'npc-reaction'|'reaction'|'npc-reply'|'reply';
export type Job={id:string;kind:JobKind;characterId?:string;noteId?:string;commentId?:string;taskId?:string;request?:ScopedGenerationRequest;knowledgeSnapshot?:string;status:'queued'|'running'|'done'|'error';error?:string};
export type MemoryProjection={id:string;viewerCharacterId:string;accountId:string;content:string;revision?:number};
export type State=IdentityState&{id:'state';version:2;platform:XiaohongshuState;noteIds?:string[];images:Record<string,string>;jobs:Job[];outbox:MemoryProjection[];migrationNotice?:string};
export const COLLECTION='phase1a_state';
export const persistedState=(s:State)=>({...s,images:{},noteIds:s.platform.notes.map(n=>n.id),platform:{...s.platform,notes:[]}});
export function stateWrites(s:State,before?:State){const prior=new Map(before?.platform.notes.map(n=>[n.id,JSON.stringify(n)]));return [
 {collection:COLLECTION,id:'state',operation:'put' as const,value:persistedState(s)},
 ...s.platform.notes.filter(n=>prior.get(n.id)!==JSON.stringify(n)).map(n=>({collection:'notes_v2',id:n.id,operation:'put' as const,value:{...n}}))
 ];}
export function emptyState():State{return {id:'state',version:2,accounts:{},bindings:[],disclosures:[],platform:createDefaultXiaohongshuState(),images:{},jobs:[],outbox:[]};}
export async function loadState():Promise<State>{
 const api=host(),current=await api.db.get(COLLECTION,'state');if(current){const s=current as State;if(s.noteIds){s.platform.notes=[];for(let i=0;i<s.noteIds.length;i+=25){const batch=await Promise.all(s.noteIds.slice(i,i+25).map(id=>api.db.get('notes_v2',id)));if(batch.some(n=>!n))throw Error('帖子索引缺少记录，已停止加载，原数据未修改');s.platform.notes.push(...batch);}}s.images=s.images||{};const ids=new Set(s.platform.notes.flatMap(n=>n.imageAssetIds||[n.imageAssetId]).filter(Boolean));await Promise.all([...ids].map(async id=>{if(!s.images[id!]){const row=await api.db.get('post_images',id!);if(row?.dataUrl)s.images[id!]=row.dataUrl;}}));return s;}
 const s=emptyState();
 // Never reinterpret the earlier prototype's inferred disclosures as verified evidence.
 const legacy=await api.db.list('social_accounts',{limit:500});
 await migrateLegacy(s,legacy);
 for(const note of s.platform.notes)await api.db.create('notes_v2',note);
 await api.db.create(COLLECTION,persistedState(s));return s;
}
export async function saveState(s:State,before?:State){for(const w of stateWrites(s,before).slice(1)){const current=await host().db.get(w.collection,w.id);if(current)await host().db.update(w.collection,w.id,w.value);else await host().db.create(w.collection,w.value);}await host().db.update(COLLECTION,'state',persistedState(s));}
