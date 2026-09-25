import {host} from './adapters/host';
import type {State} from './xiaohongshu-storage';
import {projectNote} from './identity/accounts';
import type {XiaohongshuNote} from './xiaohongshu-types';
export function queueMemories(s:State,viewer:string,jobId:string,notes:XiaohongshuNote[]){
 for(const note of notes){const id=`${jobId}.${note.id}`;if(!s.outbox.some(m=>m.id===id))s.outbox.push({id,viewerCharacterId:viewer,accountId:note.authorId,content:'[匿名小红书] source=anonymous_social_post\n'+JSON.stringify(projectNote(s,note)).slice(0,14500)});}
}
export async function flushMemory(s:State){
 while(s.outbox.length){const m=s.outbox[0],scope={viewerCharacterId:m.viewerCharacterId,sourceNamespace:'social_posts',sourceEntityId:m.accountId};
 const found=await host().memory.searchSource(scope);
 await host().memory.writeSource({...scope,expectedRevision:found.revision,evidenceId:m.id,content:m.content,timeline:true});s.outbox.shift();
 }
}
