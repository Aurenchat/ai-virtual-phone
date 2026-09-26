// CUSTOM-APP-ADAPTER: replay the copied upstream handlers, never a second product reducer.
import {host,type AiErrorCode,type ScopedGenerationRequest} from './host';
import {kvGet,kvSet,kvRemove,flush} from './storage';
type Action={id:string;kind:string;view:any;args:any[];startedAt:number};
export class DurableGenerationError extends Error{constructor(message:string,public readonly code:AiErrorCode|'UNKNOWN'){super(message);this.name='DurableGenerationError';}}
let active:Action|null=null;let randomIndex=0;let callIndex=0;
export function pendingAction():Action|null{return JSON.parse(kvGet('continuation')||'null');}
export async function beginAction(kind:string,view:any,args:any[]){
 if(active)return false;
 active=pendingAction()||{id:crypto.randomUUID(),kind,view:structuredClone(view),args:structuredClone(args),startedAt:Date.now()};
 randomIndex=0;callIndex=0;kvSet('continuation',JSON.stringify(active));await flush();return true;
}
export async function finishAction(){await flush();kvRemove('continuation');await flush();active=null;randomIndex=0;callIndex=0;}
export function actionNow(){return active?.startedAt??Date.now();}
export function actionRandom(){
 if(!active)return Math.random();
 const text=active.id+':'+randomIndex++;let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);
 return (h>>>0)/4294967296;
}
export function actionUuid(){return active?`${active.id}_${randomIndex++}`:crypto.randomUUID();}
export async function durableRaw(request:ScopedGenerationRequest,standaloneKey?:string,knowledgeKey?:string):Promise<string>{
 const key=standaloneKey||`${active?.id||crypto.randomUUID()}.${callIndex++}`;
 let record=await host().db.get('fork_calls',key);
 if(record&&record.knowledgeKey!==knowledgeKey)throw Error('身份知识已更新，请重新生成。');
 if(record?.content!==undefined)return record.content;
 if(!record){record={id:key,request,knowledgeKey};const {put}=await import('./storage');await put('fork_calls',key,record);}
 let task=await host().ai.startTask({idempotencyKey:key,request:record.request});
 while(task.status==='running'){await new Promise(r=>setTimeout(r,300));const next=await host().ai.getTask({taskId:task.taskId});if(!next)throw Error('生成记录暂时不可用');task=next;}
 if(task.status==='consumed'){const stored=await host().db.get('fork_calls',key);if(stored?.content!==undefined)return stored.content;throw Error('生成记录缺少已保存结果');}
 if(task.status!=='completed')throw new DurableGenerationError(task.error||'本次生成未完成，请稍后再试。',task.errorCode||'UNKNOWN');
 const content=task.result?.content||'';
 const result=await host().ai.consumeTask({taskId:task.taskId,writes:[{collection:'fork_calls',id:key,operation:'put',value:{id:key,content,knowledgeKey}}]});
 if(!result.applied)return (await host().db.get('fork_calls',key)).content;
 return content;
}
