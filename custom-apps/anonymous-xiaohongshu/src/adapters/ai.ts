// CUSTOM-APP-ADAPTER: native generator calls keep their protocols and call graph.
import type {Character} from './characters';
import {ownerCharacter,routingCharacter,projectedPersona,projectProfileText} from './characters';
import {identity,publicContext,userAccount} from './identity';
import {durableRaw} from './tasks';
import {NATIVE_CHARACTER_PROMPTS} from '../fork/lib/xiaohongshu-prompts';
import {host,type ScopedGenerationRequest} from './host';
import {projectPromptIdentity} from '../identity/prompt-projection';
export type LLMContentPart={type:'text';text:string}|{type:'image_url';image_url:{url:string;detail?:string}};
export type LLMMessage={role:'system'|'user'|'assistant';content:string|LLMContentPart[];_debugMeta?:unknown};
export type ApiConfig={id:string;enableImageRecognition:boolean;defaultModel?:string};
export type PresetConfig={name:string};export type RegexConfig=never;
export type AssemblerInput={character:Character;appTags:string[];feedContext?:string;userPostContext?:string;commentContext?:string;mentionContext?:string;xiaohongshuBilingualInstruction:string;userIdentity?:{name:string}};
export class ChatEngineError extends Error{}
export function assemblePromptPayload(input:AssemblerInput):LLMMessage[]{
 const kind=input.appTags.includes('activity')?'activity':input.appTags.includes('mention')?'mention':input.appTags.includes('comment')?'reply':'reaction';
 const context=input.feedContext||input.userPostContext||input.commentContext||input.mentionContext||'';
 const prompt=NATIVE_CHARACTER_PROMPTS[kind].split('\n').filter(line=>!line.includes('否则只能根据公开内容')&&!line.includes('与{{user}}的关系')).join('\n')
  .replaceAll('{{char}}',input.character.name).replaceAll('{{user}}',userAccount().displayName)
  .replace(/\{\{xiaohongshu(?:Feed|UserPost|Comment|Mention)Context\}\}/g,context);
 return [{role:'system',content:input.xiaohongshuBilingualInstruction},{role:'user',content:prompt}];
}
export function previewMessagesForApi(_api:ApiConfig,_preset:PresetConfig|null,messages:LLMMessage[]){return messages;}
export function formatChatTimestamp(timestamp:string){return new Date(timestamp).toLocaleString('zh-CN',{hour12:false});}
export async function sendLLMRequest(api:ApiConfig,_preset:PresetConfig|null,messages:LLMMessage[],_regexes:RegexConfig[],_meta:unknown,options:{appId:string;appTags?:string[];skipOutputRegex?:boolean}):Promise<string>{
 const owner=ownerCharacter(api.id);const route=owner||routingCharacter();
 const current=identity();const memoryScopes=owner?Object.keys(current.accounts).slice(-100).map(sourceEntityId=>({sourceNamespace:'social_posts',sourceEntityId})):[];
 const knowledge=JSON.stringify(current.disclosures.filter(d=>d.viewerCharacterId===owner?.id));
 const project=(text:string)=>projectProfileText(projectPromptIdentity(text,userAccount().displayName),owner?.id);
 const projected=messages.map(m=>({role:m.role,content:typeof m.content==='string'?project(m.content):m.content.map(p=>p.type==='text'?{type:'text' as const,text:project(p.text)}:p)}));
 const request={...(route?{characterId:route.id}:{}),contextPolicy:{characterProfile:false,boundPreset:false,worldbook:false,regex:false,generationRules:!!owner,userProfile:false,coreMemory:'deny' as const,longTermMemory:owner&&memoryScopes.length?'own_source' as const:'deny' as const,...(memoryScopes.length?{memorySources:memoryScopes}:{})},appContext:JSON.stringify({platform:publicContext(owner?.id),...(owner?{selfPersona:projectedPersona(api.id)}:{})}),messages:projected,maxTokens:10000};
 const raw=await durableRaw(request as ScopedGenerationRequest,undefined,knowledge);
 if(knowledge!==JSON.stringify(identity().disclosures.filter(d=>d.viewerCharacterId===owner?.id)))throw new ChatEngineError('身份知识已更新，请重新生成。');
 return raw;
}
