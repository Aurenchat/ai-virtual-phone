// CUSTOM-APP-ADAPTER: native event text, explicit account subjects and durable projection outbox.
// App history is authoritative. Deleted evidence is tombstoned and cannot be requeued.
import {host,type Scope} from './host';
import {identity,bindingFor,publicAccount} from './identity';
import {kvGet,kvSet,flush} from './storage';
type EventEntry={id:string;timestamp:string;content:string;noteId?:string;commentId?:string;subjectIds?:string[]};
type Projection=Scope&{evidenceId:string;content:string;noteId?:string;commentId?:string;sent?:boolean;deleted?:boolean};
type Ledger={rows:Projection[];invalidate:Scope[]};
let sending:Promise<void>|undefined;
const read=():Ledger=>JSON.parse(kvGet('memory-ledger')||'{"rows":[],"invalidate":[]}');
const save=(ledger:Ledger)=>kvSet('memory-ledger',JSON.stringify(ledger));
const key=(scope:Scope)=>JSON.stringify([scope.viewerCharacterId,scope.sourceNamespace,scope.sourceEntityId]);
function wake(){void flushMemories().catch(()=>{/* Retry the durable outbox on next event/open. */});}
export function publishEventProjection(viewerAccountId:string,entry:EventEntry){
 const viewer=bindingFor(viewerAccountId);if(viewer?.ownerKind!=='character')return;
 const ledger=read();
 for(const id of new Set(entry.subjectIds||[])){
  const a=identity().accounts[id];if(!a)throw Error('Memory subject is not a social account');
  const evidenceId=entry.id+'.'+id;
  if(ledger.rows.some(e=>e.viewerCharacterId===viewer.ownerId&&e.evidenceId===evidenceId))continue;
  ledger.rows.push({viewerCharacterId:viewer.ownerId,sourceNamespace:'social_posts',sourceEntityId:id,evidenceId,noteId:entry.noteId,commentId:entry.commentId,
   content:'[匿名小红书] '+JSON.stringify({subject:publicAccount(a),participants:[...new Set(entry.subjectIds)].map(id=>publicAccount(identity().accounts[id])),event:entry.content,noteId:entry.noteId,commentId:entry.commentId})});
 }
 save(ledger);wake();
}
export function removeEventProjections(filter:{noteId?:string;commentId?:string;all?:boolean}){
 const ledger=read();
 for(const row of ledger.rows){
  if(row.deleted||!(filter.all||filter.noteId&&row.noteId===filter.noteId||filter.commentId&&row.commentId===filter.commentId))continue;
  row.deleted=true;
  const scope:Scope={viewerCharacterId:row.viewerCharacterId,sourceNamespace:row.sourceNamespace,sourceEntityId:row.sourceEntityId};
  if(!ledger.invalidate.some(s=>key(s)===key(scope)))ledger.invalidate.push(scope);
 }
 save(ledger);wake();
}
export function incrementEventCounter(_id:string){} // Never invoke the unsourced native RP summarizer.
export function maybeRunSummarization(_id?:string,_name?:string){return flushMemories();}
export function flushMemories(){
 if(sending)return sending;
 sending=(async()=>{
  await flush();
  for(;;){
   const ledger=read(),invalid=ledger.invalidate[0];
   if(invalid){
    await host().memory.invalidateSource(invalid);
    const latest=read();latest.invalidate=latest.invalidate.filter(s=>key(s)!==key(invalid));
    for(const row of latest.rows)if(key(row)===key(invalid))row.sent=false;
    save(latest);await flush();continue;
   }
   const e=ledger.rows.find(r=>!r.sent&&!r.deleted);if(!e)break;
   const scope:Scope={viewerCharacterId:e.viewerCharacterId,sourceNamespace:e.sourceNamespace,sourceEntityId:e.sourceEntityId};
   const {revision}=await host().memory.searchSource(scope);
   await host().memory.writeSource({...scope,expectedRevision:revision,evidenceId:e.evidenceId,content:e.content,timeline:true});
   const latest=read(),row=latest.rows.find(r=>key(r)===key(e)&&r.evidenceId===e.evidenceId);
   if(row)row.sent=true;
   save(latest);await flush();
  }
 })().finally(()=>{sending=undefined;});return sending;
}
