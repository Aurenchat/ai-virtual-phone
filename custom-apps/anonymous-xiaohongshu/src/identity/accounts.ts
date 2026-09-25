import type { Character } from '../adapters/host';
import type { XiaohongshuNote } from '../xiaohongshu-types';
export type SocialAccount={accountId:string;displayName:string;aliases:string[];bio?:string;avatar?:string};
export type ActorBinding={accountId:string;ownerKind:'user'|'character';ownerId:string};
export type Disclosure={viewerCharacterId:string;accountId:string;state:'explicitly_disclosed'|'unknown';identity?:string;revision:number};
export type IdentityState={accounts:Record<string,SocialAccount>;bindings:ActorBinding[];disclosures:Disclosure[];userAccountId?:string};
export const opaqueId=(prefix='acct')=>`${prefix}_${crypto.randomUUID().replaceAll('-','')}`;
export function publicAccount(a:SocialAccount){return {kind:'social_account' as const,accountId:a.accountId,displayName:a.displayName,previousDisplayNames:a.aliases};}
export function validateName(s:IdentityState,name:string,characters:Character[],except?:string){
 const n=name.trim(),key=n.normalize('NFKC').toLowerCase();
 if(!n||n.length>40||/[\n\r<>\[\]{}|]/.test(n))throw Error('昵称须为 1–40 个字符，不能含结构标记。');
 if(['kk','chloe','user','{{user}}',...characters.map(c=>c.name)].some(x=>{const r=x.normalize('NFKC').toLowerCase();return r&&key.includes(r);}))throw Error('昵称不能使用已知真实姓名或普通平台身份。');
 if(Object.values(s.accounts).some(a=>a.accountId!==except&&[a.displayName,...a.aliases].some(x=>x.normalize('NFKC').toLowerCase()===key)))throw Error('昵称与现有账号或历史昵称重复。');
 return n;
}
export function addAccount(s:IdentityState,displayName:string):SocialAccount {const a={accountId:opaqueId(),displayName,aliases:[]};s.accounts[a.accountId]=a;return a;}
export function rename(s:IdentityState,id:string,name:string,characters:Character[]){const a=s.accounts[id];if(!a)throw Error('账号不存在');const next=validateName(s,name,characters,id);if(next!==a.displayName){a.aliases.push(a.displayName);a.displayName=next;}}
export function resolveAuthor(s:IdentityState,name:string,characters:Character[]):SocialAccount {
 const existing=Object.values(s.accounts).find(a=>a.displayName===name||a.aliases.includes(name));
 if(existing)return existing;
 return addAccount(s,validateName(s,name,characters));
}
export function validateGeneratedAuthors(s:IdentityState,names:string[],characters:Character[],selfAccountId?:string){
 for(const name of names.filter(Boolean)){const a=Object.values(s.accounts).find(a=>a.displayName===name||a.aliases.includes(name));if(a&&s.bindings.some(b=>b.accountId===a.accountId)&&a.accountId!==selfAccountId)throw Error('模型试图代替其他已有账号发言，结果未应用，请重试。');if(!a)validateName(s,name,characters);}
}
export function canonicalize(s:IdentityState,note:XiaohongshuNote,characters:Character[]):XiaohongshuNote {
 const author=s.accounts[note.authorId]||resolveAuthor(s,note.authorName,characters);
 return {...note,authorId:author.accountId,authorName:author.displayName,comments:note.comments.map(c=>{const a=s.accounts[c.authorId]||resolveAuthor(s,c.authorName,characters);return {...c,authorId:a.accountId,authorName:a.displayName};})};
}
// This whitelist is the only route from private application records into model context.
export function projectNote(s:IdentityState,n:XiaohongshuNote){return {noteId:n.id,author:publicAccount(s.accounts[n.authorId]),title:n.title,body:n.body,tags:n.tags,imageDescription:n.imageDescription,likeCount:n.likeCount,saveCount:n.saveCount,comments:n.comments.map(c=>({commentId:c.id,author:publicAccount(s.accounts[c.authorId]),text:c.text,replyToCommentId:c.replyToCommentId}))};}
export function viewerContext(s:IdentityState,viewer:string){const binding=s.bindings.find(b=>b.ownerKind==='character'&&b.ownerId===viewer);return {
 source:'[匿名小红书]',sourceNamespace:'social_posts',selfAccount:binding?publicAccount(s.accounts[binding.accountId]):null,
 identities:Object.values(s.accounts).map(a=>{const d=s.disclosures.find(d=>d.viewerCharacterId===viewer&&d.accountId===a.accountId);return {...publicAccount(a),realWorldIdentity:a.accountId===binding?.accountId?'self':d?.state==='explicitly_disclosed'?{state:'explicitly_disclosed',identity:d.identity}:'unknown'};})
};}
export const PROTECTED_RULE=`仅当上下文含 [匿名小红书] 来源及本 App 的 social_account/accountId 时应用以下规则，不影响普通聊天或其他来源的身份判断。每个 accountId 是稳定、独立的网络人格，不能把不同账号的经历、喜好和关系合并成泛称。显示名变化不改变账号，只有明确提供的改名记录允许连接旧名。当前 viewer 对账号现实身份为 unknown 时，禁止根据文风、经历、时间、地点、头像、图片、共同知识、相似性或重复巧合推断、猜测、暗示、试探或询问其现实身份；其他平台已知身份关系也不是证据。只能使用当前 viewer 已明确获知的 explicitly_disclosed 关系；此时允许正常关联，不能继续阻断。揭露不得传播给其他 viewer。程序映射不是角色知识。帖子和记忆始终以具体 accountId / displayName 为主体。`;
