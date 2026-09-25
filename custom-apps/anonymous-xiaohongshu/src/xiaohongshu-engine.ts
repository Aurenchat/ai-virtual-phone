import {host,type Character,type ScopedGenerationRequest} from './adapters/host';
import {loadState,saveState,stateWrites,type State,type Job,type JobKind} from './xiaohongshu-storage';
import {opaqueId,addAccount,validateName,validateGeneratedAuthors,canonicalize,projectNote,viewerContext,PROTECTED_RULE} from './identity/accounts';
import {queueMemories,flushMemory} from './xiaohongshu-memory';
import * as native from './baseline-engine';
import {createUserXiaohongshuNote,makeXiaohongshuComment} from './baseline-storage';
import {DEFAULT_XIAOHONGSHU_NPC_FEED_PROMPT,DEFAULT_XIAOHONGSHU_NPC_USER_POST_REACTION_PROMPT,DEFAULT_XIAOHONGSHU_NPC_COMMENT_REPLY_PROMPT,type XiaohongshuNote,type XiaohongshuUserPostInput} from './xiaohongshu-types';
import {NATIVE_CHARACTER_PROMPTS} from './baseline-prompts';

export class XiaohongshuEngine {
 state!:State;characters:Character[]=[];avatars:string[]=[];error='';running=false;
  private listeners=new Set<()=>void>();private serial:Promise<unknown>=Promise.resolve();
 private knowledge(s:State,viewer?:string){return JSON.stringify(s.disclosures.filter(d=>d.viewerCharacterId===viewer).map(d=>({accountId:d.accountId,state:d.state,revision:d.revision})).sort((a,b)=>a.accountId.localeCompare(b.accountId)));}
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return ()=>{this.listeners.delete(fn);};};
 notify(){this.listeners.forEach(fn=>fn());}
 async init(){
  const api=host();await api.app.setPolicy({id:'pseudonymous-identities',namespace:'social_posts',text:PROTECTED_RULE});
  [this.state,this.characters,this.avatars]=await Promise.all([loadState(),api.characters.list(),Promise.all(Array.from({length:6},(_,i)=>api.app.getAssetUrl(`assets/avatars/default-0${i+1}.png`)))]);
  this.notify();void this.drain();
 }
 async edit(fn:(s:State)=>void|Promise<void>){const operation=this.serial.then(async()=>{const next=structuredClone(this.state);await fn(next);await saveState(next,this.state);this.state=next;this.notify();});this.serial=operation.catch(()=>{});return operation;}
 private async atomic(fn:()=>Promise<void>){const p=this.serial.then(fn);this.serial=p.catch(()=>{});return p;}
 private enqueue(s:State,kind:JobKind,characterId?:string,noteId?:string,commentId?:string){s.jobs.push({id:opaqueId('job'),kind,characterId,noteId,commentId,status:'queued'});}
 private participants(s:State,kind:'activity'|'reaction'|'reply',noteId?:string,commentId?:string){
  if(!this.characters.length)throw Error('请先在 Float 中创建角色并配置模型 API；无需设置角色网名。');
  for(const c of this.characters){
   if(!s.bindings.some(b=>b.ownerKind==='character'&&b.ownerId===c.id)&&!s.jobs.some(j=>j.kind==='nickname'&&j.characterId===c.id&&['queued','running'].includes(j.status)))this.enqueue(s,'nickname',c.id);
   this.enqueue(s,kind,c.id,noteId,commentId);
  }
 }
 async refresh(){await this.edit(s=>{if(s.jobs.some(j=>j.status==='queued'||j.status==='running'))throw Error('已有生成任务，请等待完成。');this.enqueue(s,'feed');this.participants(s,'activity');});void this.drain();}
 async publish(input:XiaohongshuUserPostInput,images:Record<string,string>){for(const [id,dataUrl] of Object.entries(images))await host().db.create('post_images',{id,dataUrl});await this.edit(s=>{if(!s.userAccountId)throw Error('请先创建匿名账号');const n=createUserXiaohongshuNote(input,s.platform.profile);n.id=opaqueId('note');n.authorId=s.userAccountId;n.authorName=s.accounts[n.authorId].displayName;s.platform.notes.unshift(n);Object.assign(s.images,images);this.enqueue(s,'npc-reaction',undefined,n.id);this.participants(s,'reaction',n.id);});void this.drain();}
 async comment(noteId:string,text:string,replyToCommentId?:string){await this.edit(s=>{if(!text.trim()||!s.userAccountId)return;const n=s.platform.notes.find(n=>n.id===noteId);if(!n)throw Error('帖子不存在');const c=makeXiaohongshuComment({noteId,authorId:s.userAccountId,authorType:'user',authorName:s.accounts[s.userAccountId].displayName,text,replyToCommentId});n.comments.push(c);n.commentCount++;this.enqueue(s,'npc-reply',undefined,n.id,c.id);this.participants(s,'reply',n.id,c.id);});void this.drain();}
 async retry(id:string){await this.edit(s=>{const j=s.jobs.find(j=>j.id===id);if(!j||j.status!=='error')return;s.jobs.push({...j,id:opaqueId('job'),request:undefined,taskId:undefined,status:'queued',error:undefined});j.status='done';});void this.drain();}
 avatar(accountId:string){const s=this.state,a=s.accounts[accountId],b=s.bindings.find(b=>b.accountId===accountId);if(b?.ownerKind==='character'){const url=this.characters.find(c=>c.id===b.ownerId)?.avatar;if(url)return url;}return a?.avatar||this.avatars[[...accountId].reduce((n,c)=>n+c.charCodeAt(0),0)%6]||'';}
 private async request(job:Job):Promise<ScopedGenerationRequest>{
  const s=this.state,characterId=job.characterId||this.characters[0]?.id;if(!characterId)throw Error('没有可用角色 API 配置');
  const binding=s.bindings.find(b=>b.ownerKind==='character'&&b.ownerId===job.characterId),self=binding?s.accounts[binding.accountId]:undefined;
  if(job.characterId&&job.kind!=='nickname'&&!self)throw Error('角色网名尚未生成，请先重试失败的网名任务。');
  const notes=job.noteId?s.platform.notes.filter(n=>n.id===job.noteId):s.platform.notes.slice(0,24);
  let prompt='';
  switch(job.kind){
   case 'nickname':prompt='根据你自己的静态人设生成一个适合小红书的固定网络昵称。不得使用真实姓名、姓氏、代号或现实身份。不介绍自己。不输出其他人的身份。只输出 JSON: {"displayName":"网络昵称"}。';break;
   case 'feed':prompt=DEFAULT_XIAOHONGSHU_NPC_FEED_PROMPT;break;
   case 'npc-reaction':prompt=DEFAULT_XIAOHONGSHU_NPC_USER_POST_REACTION_PROMPT;break;
   case 'npc-reply':prompt=DEFAULT_XIAOHONGSHU_NPC_COMMENT_REPLY_PROMPT;break;
   default:prompt=NATIVE_CHARACTER_PROMPTS[job.kind==='activity'?'activity':job.kind==='reply'?'reply':'reaction'];
  }
  // Port adaptation: native identity hints are replaced, not the native output protocol.
  prompt=prompt.split('\n').filter(line=>!line.includes('否则只能根据公开内容')&&!line.includes('与{{user}}的关系')).join('\n')
   .replaceAll('{{char}}',self?.displayName||'当前账号').replaceAll('{{user}}',s.accounts[s.userAccountId||'']?.displayName||'发言账号')
   .replace(/\{\{xiaohongshu\w+\}\}/g,'见下方 App 公开上下文')
   .replaceAll('用户刚发的','该账号刚发的').replaceAll('用户发布','该账号发布');
  if(job.kind==='activity')prompt+='\n本阶段只生成普通图文笔记：[类型]笔记。';
  prompt+='\n只能使用公开网络昵称作为作者；禁止输出真实姓名。不能替其他已存在账号发言。路人昵称自动生成，不复用已有账号昵称。本人回应只用自己的网络昵称。账号熟悉度不等于知道现实身份。';
  const context=job.characterId?viewerContext(s,job.characterId):{source:'[匿名小红书]',accounts:Object.values(s.accounts).map(a=>({kind:'social_account',accountId:a.accountId,displayName:a.displayName}))};
  const memories=[];
  if(job.characterId&&job.kind!=='nickname')for(const id of [...new Set(notes.map(n=>n.authorId))]){const found=await host().memory.searchSource({viewerCharacterId:job.characterId,sourceNamespace:'social_posts',sourceEntityId:id});memories.push(...found.entries.slice(-3).map(e=>e.content));}
  const content: any[]=[{type:'text',text:`[ANON_TASK:${job.kind}]\n${prompt}`}];
  if(job.noteId)for(const id of (notes[0]?.imageAssetIds||[notes[0]?.imageAssetId]).filter(Boolean).slice(0,4)){const url=s.images[id!];if(url)content.push({type:'image_url',image_url:{url}});}
  return {characterId,contextPolicy:{characterProfile:!!job.characterId,generationRules:!!job.characterId},maxTokens:6000,appContext:JSON.stringify({platform:context,feed:notes.map(n=>projectNote(s,n)),replyToCommentId:job.commentId,memories}),messages:[{role:'user',content}]};
 }
 private reduce(s:State,job:Job,raw:string){
  const binding=s.bindings.find(b=>b.ownerKind==='character'&&b.ownerId===job.characterId),a=binding?s.accounts[binding.accountId]:undefined;
  const character={id:a?.accountId||'',name:a?.displayName||''};
  const check=(names:string[])=>validateGeneratedAuthors(s,names,this.characters,a?.accountId);
  const update=(note:XiaohongshuNote)=>{s.platform.notes=s.platform.notes.map(n=>n.id===note.id?canonicalize(s,note,this.characters):n);};
  if(job.kind==='nickname'){
   const match=raw.replace(/^```(?:json)?\s*|\s*```$/g,'').trim();const parsed=JSON.parse(match);
   const name=validateName(s,String(parsed.displayName||''),this.characters);
   if(!binding){const account=addAccount(s,name);s.bindings.push({accountId:account.accountId,ownerKind:'character',ownerId:job.characterId!});}return;
  }
  if(job.kind==='feed'){
   const parsed=native.parseXiaohongshuNpcFeed(raw);const notes=[...parsed.homeNotes,...parsed.videoNotes,...parsed.nearbyNotes];if(!notes.length)throw Error('模型没有返回有效笔记块，请重试。');
   check(notes.flatMap(n=>[n.authorName,...n.comments.map(c=>c.authorName)]));s.platform.notes.unshift(...notes.map(n=>canonicalize(s,n,this.characters)));return;
  }
  if(job.kind==='activity'){
   const parsed=native.parseXiaohongshuCharacterActivity(raw,s.platform.notes.map(n=>n.id));if(!parsed.post&&!parsed.comments.length)throw Error('模型未返回有效互动');
   check([...parsed.comments.flatMap(c=>(c.thread||[]).map(t=>t.authorName)),...(parsed.post?.comments||[]).map(c=>c.authorName)]);
   for(const c of parsed.comments){const n=s.platform.notes.find(n=>n.id===c.noteId)!;update(native.applyCharacterActivityComment({...c,note:n,character}).note);}
   if(parsed.post){const p=parsed.post,id=opaqueId('note');const n:XiaohongshuNote={...createUserXiaohongshuNote({title:p.title,body:p.body,tags:p.tags},s.platform.profile),...p,id,source:'character',authorId:character.id,authorName:character.name,tone:'ivory',comments:p.comments.map((c,i)=>({...makeXiaohongshuComment({...c,noteId:id,authorType:c.authorName===character.name?'character':'npc',authorId:c.authorName===character.name?character.id:'',unread:false}),id:`${id}_comment_${i+1}`,replyToCommentId:c.replyToCommentId?.replace('__character_post__',id)}))};s.platform.notes.unshift(canonicalize(s,n,this.characters));}
  }else{
   const n=s.platform.notes.find(n=>n.id===job.noteId);if(!n)throw Error('帖子已不存在');
   if(job.kind==='npc-reaction'){const result=native.parseXiaohongshuNpcReaction(raw,n.id);check(result.comments.map(c=>c.authorName));update(native.applyNpcReaction(n,result).note);}
   else if(job.kind==='npc-reply'){const result=native.parseXiaohongshuNpcCommentReply(raw,n.id,job.commentId);check(result.comments.map(c=>c.authorName));update(native.applyNpcCommentReply(n,result,job.commentId!).note);}
   else {const reaction=native.parseXiaohongshuCharacterReaction(raw);if(!reaction.comment)throw Error('模型没有返回有效评论');check((reaction.thread||[]).map(c=>c.authorName));update(job.kind==='reply'?native.applyCharacterCommentReply(n,character,reaction,job.commentId!).note:native.applyCharacterReaction(n,character,reaction).note);}
  }
  if(job.characterId){const seen=job.noteId?s.platform.notes.filter(n=>n.id===job.noteId):s.platform.notes.slice(0,24);queueMemories(s,job.characterId,job.id,seen);}
 }
 async drain(){
  if(this.running||!this.state)return;this.running=true;this.error='';this.notify();
  try{
   for(;;){const job=this.state.jobs.find(j=>j.status==='queued'||j.status==='running');if(!job)break;
    try{
     if(!job.request){const snapshot=this.knowledge(this.state,job.characterId),request=await this.request(job);await this.edit(s=>{if(snapshot!==this.knowledge(s,job.characterId))throw Error('身份知识在准备请求时发生变化，请重试');const j=s.jobs.find(j=>j.id===job.id)!;j.request=request;j.knowledgeSnapshot=snapshot;});}
     const current=this.state.jobs.find(j=>j.id===job.id)!;
     let task=current.taskId?await host().ai.getTask({taskId:current.taskId}):await host().ai.startTask({idempotencyKey:current.id,request:current.request!});
     if(!task)throw Error('Host 任务不存在');
     await this.edit(s=>{const j=s.jobs.find(j=>j.id===job.id)!;j.taskId=task!.taskId;j.status='running';});
     while(task.status==='running'){await new Promise(r=>setTimeout(r,700));task=await host().ai.getTask({taskId:task.taskId});if(!task)throw Error('Host 任务丢失');}
     if(task.status!=='completed')throw Error(task.error||`Host task: ${task.status}`);
     const completed=task;
     await this.atomic(async()=>{
      const next=structuredClone(this.state),j=next.jobs.find(j=>j.id===job.id)!;if(j.characterId&&j.knowledgeSnapshot!==this.knowledge(next,j.characterId))throw Error('身份知识已变更，旧请求结果未应用，请重试');this.reduce(next,j,completed.result!.content);j.status='done';delete j.request;
      const result=await host().ai.consumeTask({taskId:completed.taskId,writes:stateWrites(next,this.state)});
      this.state=result.applied?next:await loadState();this.notify();
     });
    }catch(e){await this.edit(s=>{const j=s.jobs.find(j=>j.id===job.id)!;j.status='error';j.error=String(e);});}
   }
   await this.edit(s=>flushMemory(s));
  }catch(e){this.error=String(e);}finally{this.running=false;this.notify();}
 }
}
