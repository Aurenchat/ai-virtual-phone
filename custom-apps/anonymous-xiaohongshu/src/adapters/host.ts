import type { ScopedGenerationRequest } from '../../../../lib/custom-app-scoped-generation';
export type { ScopedGenerationRequest };
export type Character = { id:string; name:string; avatar?:string; description?:string; persona?:string; personality?:string };
export type AiErrorCode='MULTIMODAL_UNSUPPORTED'|'PROVIDER_ERROR'|'TIMEOUT'|'CANCELLED'|'MALFORMED_REQUEST'|'HOST_INTERRUPTED';
export type Task = {taskId:string;status:'running'|'completed'|'failed'|'cancelled'|'consumed';result?:{content:string};error?:string;errorCode?:AiErrorCode};
type Row = Record<string,unknown>;
export interface Host {
  ui:{toast(message:string):Promise<unknown>};
  media:{get(input:{ref:string}):Promise<{dataUrl?:string}>};
  characters:{list():Promise<Character[]>};
  app:{close():Promise<unknown>;setPolicy(input:{id:string;namespace:string;text:string}):Promise<unknown>;getAssetUrl(path:string):Promise<string>};
  db:{get(collection:string,id:string):Promise<any>;list(collection:string,options?:{limit:number}):Promise<any[]>;create(collection:string,row:Row):Promise<any>;update(collection:string,id:string,row:Row):Promise<any>};
  ai:{startTask(input:{idempotencyKey:string;request:ScopedGenerationRequest}):Promise<Task>;getTask(input:{taskId:string}):Promise<Task|null>;consumeTask(input:{taskId:string;writes:{collection:string;id:string;operation:'put';value:Row}[]}):Promise<{applied:boolean}>};
  memory:{searchSource(input:Scope):Promise<{revision:number;entries:{content:string}[]}>;writeSource(input:Scope&{expectedRevision:number;evidenceId:string;content:string;timeline:boolean}):Promise<unknown>;invalidateSource(input:Scope):Promise<{revision:number}>};
}
export type Scope={viewerCharacterId:string;sourceNamespace:string;sourceEntityId:string};
export function host():Host {const api=(window as any).AiPhone||(window as any).AiPhoneApp;if(!api?.ai?.startTask||!api.app?.setPolicy)throw Error('需要已安装 Phase 0.5 Host Capability Patch 的 Float 浏览器 Host。');return api;}
