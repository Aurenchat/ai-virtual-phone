import {host} from './host';
import {createUserXiaohongshuNote,makeXiaohongshuComment} from '../fork/lib/xiaohongshu-storage';
import type {IdentityState} from '../identity/accounts';
import type {XiaohongshuAuthorType,XiaohongshuState} from '../fork/lib/xiaohongshu-types';
type State=IdentityState&{platform:XiaohongshuState;images:Record<string,string>;migrationNotice?:string};
export async function migrateLegacy(s:State,accounts:any[]){
 if(!accounts.length)return;
 const api=host(),[bindings,posts]=await Promise.all([api.db.list('actor_bindings_private',{limit:500}),api.db.list('posts',{limit:500})]);
 if([accounts,bindings,posts].some(rows=>rows.length>=500))throw Error('原型集合达到 500 条读取上限；为避免截断旧数据，迁移已停止。原集合未改动。');
 for(const a of accounts)s.accounts[a.id]={accountId:a.id,displayName:a.displayName,aliases:(a.aliasHistory||[]).map((x:any)=>x.displayName).filter(Boolean),bio:a.bio||''};
 for(const b of bindings){if(!s.accounts[b.accountId])throw Error('旧绑定缺少账号，未修改旧数据');if(b.ownerKind==='human_controller'){s.userAccountId=b.accountId;s.bindings.push({accountId:b.accountId,ownerKind:'user',ownerId:'local-controller'});}else if(b.ownerKind==='character')s.bindings.push({accountId:b.accountId,ownerKind:'character',ownerId:b.ownerId});}
 if(s.userAccountId){const a=s.accounts[s.userAccountId];s.platform.profile.nickname=a.displayName;s.platform.profile.signature=a.bio||'';s.platform.profile.handle=a.accountId.slice(-10);}
 for(const p of posts){const a=s.accounts[p.authorAccountId];if(!a)throw Error('旧帖子缺少作者账号，迁移已停止');
  const binding=s.bindings.find(b=>b.accountId===a.accountId);const source:XiaohongshuAuthorType=binding?.ownerKind||'npc';
  const note={...createUserXiaohongshuNote({title:p.title,body:p.body,tags:p.tags||[]},s.platform.profile),id:p.id,source,authorId:a.accountId,authorName:a.displayName,createdAt:p.createdAt,updatedAt:p.updatedAt||p.createdAt,liked:(p.likedByAccountIds||[]).includes(s.userAccountId),saved:(p.savedByAccountIds||[]).includes(s.userAccountId),likeCount:p.likedByAccountIds?.length||0,saveCount:p.savedByAccountIds?.length||0,comments:(p.comments||[]).map((c:any)=>{const author=s.accounts[c.authorAccountId];if(!author)throw Error('旧评论缺少作者账号');return {...makeXiaohongshuComment({noteId:p.id,authorType:s.bindings.find(b=>b.accountId===author.accountId)?.ownerKind||'npc',authorId:author.accountId,authorName:author.displayName,text:c.text,replyToCommentId:c.replyToCommentId}),id:c.id,createdAt:c.createdAt};})};
  note.commentCount=note.comments.length;
  if(p.imageRef){const media=await api.media.get({ref:p.imageRef});if(!media?.dataUrl)throw Error('旧帖子图片无法读取；迁移停止且原数据保留');const id='legacy_'+p.id;await api.db.create('post_images',{id,dataUrl:media.dataUrl});note.imageAssetId=id;note.imageAssetIds=[id];s.images[id]=media.dataUrl;}
  s.platform.notes.push(note);
 }
 s.migrationNotice=`已保留 accountId 迁移 ${accounts.length} 个账号与 ${posts.length} 篇帖子；旧集合未改动。旧版推断出的身份关系不作为证据，请按角色重新确认。角色头像改用角色卡，路人不再需要管理。`;
}
