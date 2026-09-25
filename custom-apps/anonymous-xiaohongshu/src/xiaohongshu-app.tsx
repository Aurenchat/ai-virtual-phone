// Phase 1A controller around Float's original waterfall/card/detail/comment components.
import React,{useEffect,useState} from 'react';
import {ChevronLeft,Heart,Bookmark,MessageCircle,RotateCw,Plus,Settings,Loader2} from 'lucide-react';
import {NoteCard,NoteImage,CommentList,XhsAvatar,formatCount,formatTime} from './baseline-ui';
import {XiaohongshuEngine} from './xiaohongshu-engine';
import {addAccount,validateName,rename} from './identity/accounts';
import type {XiaohongshuComment} from './xiaohongshu-types';

import {readImage} from "./adapters/images";
import {PublishSheet} from "./baseline-publish";
import {DisclosureSettings} from './identity/disclosure-settings';
import {host} from './adapters/host';

export function XiaohongshuApp(){
 const [engine]=useState(()=>new XiaohongshuEngine()),[,render]=useState(0),[error,setError]=useState(''),[tab,setTab]=useState('home'),[selectedId,select]=useState<string>(),[settings,setSettings]=useState(false);
 const [nickname,setNickname]=useState(''),[bio,setBio]=useState(''),[avatar,setAvatar]=useState(''),[comment,setComment]=useState(''),[reply,setReply]=useState<XiaohongshuComment>();
 const act=async(fn:()=>Promise<unknown>)=>{try{setError('');await fn();}catch(e){setError(String(e));}};
 useEffect(()=>{const unsubscribe=engine.subscribe(()=>render(n=>n+1));void act(()=>engine.init());return unsubscribe;},[engine]);
 const s=engine.state;
 if(!s)return <div className="anon-loading">{error||'正在连接 Float…'}</div>;
 const own=s.accounts[s.userAccountId||''];
 const notes=s.platform.notes.map(n=>({...n,authorName:s.accounts[n.authorId]?.displayName||n.authorName,comments:n.comments.map(c=>({...c,authorName:s.accounts[c.authorId]?.displayName||c.authorName}))}));
 const selected=notes.find(n=>n.id===selectedId);
 const shown=tab==='profile'?notes.filter(n=>n.authorId===s.userAccountId):notes.filter(n=>n.type==='post'&&n.feedScope!=='nearby');
 const columns=[shown.filter((_,i)=>i%2===0),shown.filter((_,i)=>i%2===1)];
 const editProfile=()=>{setNickname(own?.displayName||'');setBio(own?.bio||'');setAvatar(own?.avatar||'');setSettings(true);};
 async function saveProfile(){await engine.edit(next=>{const name=validateName(next,nickname,engine.characters,next.userAccountId);let a=next.accounts[next.userAccountId||''];if(!a){a=addAccount(next,name);next.userAccountId=a.accountId;next.bindings.push({accountId:a.accountId,ownerKind:'user',ownerId:'local-controller'});}else rename(next,a.accountId,name,engine.characters);a.bio=bio;a.avatar=avatar;next.platform.profile.nickname=name;next.platform.profile.signature=bio;next.platform.profile.handle=a.accountId.slice(-10);});setSettings(false);}
 async function vote(kind:'liked'|'saved'){if(!selected)return;await engine.edit(next=>{const n=next.platform.notes.find(n=>n.id===selected.id)!;const count=kind==='liked'?'likeCount':'saveCount';n[count]=Math.max(0,n[count]+(n[kind]?-1:1));n[kind]=!n[kind];});}
 const waterfall=<div className="cp-xhs-waterfall-grid">{columns.map((column,i)=><div key={i} className="cp-xhs-waterfall-column">{column.map(n=><NoteCard key={n.id} note={n} imageMap={s.images} avatarSrc={engine.avatar(n.authorId)} onOpen={()=>select(n.id)} collapseBilingualTranslation={true}/>)}</div>)}</div>;
 return <section className="xhs-app cp-xhs-module">
  {!selected&&<header className="cp-xhs-appbar xhs-appbar"><button aria-label="返回桌面" className="cp-float-back" onClick={()=>void act(()=>host().app.close())}><ChevronLeft size={24}/></button><div className="cp-xhs-header-stack"><button className="cp-xhs-header-title is-active" onClick={()=>setTab('home')}>发现</button></div><div className="cp-appbar-actions"><button aria-label="生成小红书内容" className="cp-float-refresh xhs-icon-action--refresh" disabled={engine.running||!own} onClick={()=>void act(()=>engine.refresh())}><RotateCw size={18}/></button><button aria-label="设置" onClick={editProfile}><Settings size={18}/></button></div></header>}
  {(error||engine.error)&&<div role="alert" className="anon-error">{error||engine.error}<button onClick={()=>void act(()=>engine.drain())}>重试同步</button></div>}
  {s.migrationNotice&&<p className="anon-error">{s.migrationNotice}</p>}
  {engine.running&&<div className="cp-refresh-indicator cp-refresh-indicator--floating"><Loader2 size={15} className="cp-spin"/>生成中 · 可以关闭 App，重新进入后接续</div>}
  {s.jobs.filter(j=>j.status==='error').map(j=><div className="anon-error" key={j.id}>{j.kind}：{j.error}<button onClick={()=>void act(()=>engine.retry(j.id))}>重试</button></div>)}
  <main className="cp-xhs-body">
  {settings||!own?<div className="cp-xhs-scroll anon-settings">
   <h2>{own?'账号设置':'创建你的匿名账号'}</h2><p>普通小红书和 Float 用户资料保持不变。角色与路人会自动参与。</p>
   <label>匿名昵称<input aria-label="匿名昵称" value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={40}/></label>
   <label>简介<textarea aria-label="简介" value={bio} onChange={e=>setBio(e.target.value)} maxLength={160}/></label>
   <label>头像<input aria-label="用户头像" type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)void act(async()=>setAvatar(await readImage(f)));}}/></label>
   {avatar&&<XhsAvatar className="cp-xhs-profile-avatar" src={avatar} name={nickname}/>}
   <button className="xhs-empty-generate-btn" onClick={()=>void act(saveProfile)}>保存匿名账号</button>{own&&<button onClick={()=>setSettings(false)}>返回</button>}
   <h3>角色网名</h3><p>首次参与后自动生成；此处只修改已生成账号。真实角色名仅在本地设置页显示。</p>
   {s.bindings.filter(b=>b.ownerKind==='character').map(b=><CharacterName key={b.accountId} name={engine.characters.find(c=>c.id===b.ownerId)?.name||'已移除的角色'} displayName={s.accounts[b.accountId].displayName} avatar={engine.avatar(b.accountId)} save={name=>act(()=>engine.edit(next=>rename(next,b.accountId,name,engine.characters)))}/>)}
   <DisclosureSettings engine={engine} act={act}/>
   <p className="anon-phase-note">Phase 1A：附近、完整视频、私信、通知中心和关注系统稍后开放。</p>
  </div>:selected?<div className="cp-xhs-scroll cp-xhs-scroll--detail xhs-detail-page">
   <div className="cp-xhs-note-detail-header"><button className="cp-xhs-detail-back" aria-label="返回" onClick={()=>select(undefined)}><ChevronLeft size={24}/></button><div className="cp-xhs-detail-author-info"><XhsAvatar className="cp-xhs-detail-avatar" src={engine.avatar(selected.authorId)} name={selected.authorName}/><span className="cp-xhs-detail-name">{selected.authorName}</span></div></div>
   <article className="cp-xhs-note-detail xhs-note-detail-page"><div className="xhs-note-detail-media"><NoteImage note={selected} imageMap={s.images} collapseBilingualTranslation={true} isDetail/></div><div className="cp-xhs-note-detail-card"><h3>{selected.title}</h3><p className="cp-xhs-note-detail-body">{selected.body}</p><div className="cp-xhs-note-detail-tags">{selected.tags.map(t=><em key={t}>#{t}</em>)}</div><div className="cp-xhs-note-detail-time">{formatTime(selected.createdAt)}</div></div>
   <div className="cp-xhs-comment-section xhs-detail-comment-section"><div className="cp-xhs-comment-count">共 {formatCount(selected.commentCount)} 条评论</div><div className="cp-xhs-comment-list"><CommentList comments={selected.comments} getAvatar={c=>engine.avatar(c.authorId)} onReply={setReply} collapseBilingualTranslation={true}
    onDeleteComment={c=>void act(()=>engine.edit(next=>{if(c.authorId!==next.userAccountId)throw Error('只能删除自己的评论');const n=next.platform.notes.find(n=>n.id===c.noteId)!;n.comments=n.comments.filter(x=>x.id!==c.id);n.commentCount=Math.max(0,n.commentCount-1);} ))}
    onVoteComment={(c,v)=>void act(()=>engine.edit(next=>{const row=next.platform.notes.find(n=>n.id===c.noteId)!.comments.find(x=>x.id===c.id)!;const k=v==='like'?'liked':'disliked',count=v==='like'?'likeCount':'dislikeCount';row[count]=Math.max(0,row[count]+(row[k]?-1:1));row[k]=!row[k];}))}/></div></div></article>
   <div className="cp-xhs-detail-bottom-bar xhs-detail-bottom-bar"><div className="xhs-detail-comment-stack">{reply&&<div className="xhs-reply-target">回复 {reply.authorName}<button onClick={()=>setReply(undefined)}>取消</button></div>}<div className="cp-xhs-input-box xhs-detail-input-box"><textarea aria-label="说点什么" placeholder="说点什么..." value={comment} onChange={e=>setComment(e.target.value)}/></div></div><button className="xhs-detail-send-btn" disabled={!comment.trim()} onClick={()=>void act(async()=>{await engine.comment(selected.id,comment,reply?.id);setComment('');setReply(undefined);})}>发送</button><div className="cp-xhs-action-icons"><button aria-label="点赞" className={`cp-xhs-action-btn ${selected.liked?'is-liked':''}`} onClick={()=>void act(()=>vote('liked'))}><Heart size={24}/><span>{formatCount(selected.likeCount)}</span></button><button aria-label="收藏" className="cp-xhs-action-btn" onClick={()=>void act(()=>vote('saved'))}><Bookmark size={24}/></button></div></div>
  </div>:<div className={`cp-xhs-scroll ${tab==='profile'?'cp-xhs-scroll--profile':''}`}>
   {(tab==='home'||tab==='publish')&&<section className="cp-xhs-home">{shown.length?waterfall:<div className="cp-xhs-status cp-empty-copy"><p>暂无小红书内容</p><span>生成首页和角色互动</span><button className="xhs-empty-generate-btn" disabled={engine.running} onClick={()=>void act(()=>engine.refresh())}>生成小红书内容</button></div>}</section>}
   {tab==='profile'&&<section className="cp-xhs-profile xhs-profile"><div className="cp-xhs-profile-hero"><div className="cp-xhs-profile-main"><XhsAvatar className="cp-xhs-profile-avatar" src={engine.avatar(own.accountId)} name={own.displayName}/><div className="cp-xhs-profile-meta"><h3>{own.displayName}</h3><span>小红书号：{s.platform.profile.handle}</span></div></div><div className="cp-xhs-profile-bio"><p>{own.bio}</p></div><div className="cp-xhs-profile-actions"><button className="cp-xhs-profile-edit" onClick={editProfile}>编辑资料</button></div></div><div className="cp-xhs-profile-content"><div className="cp-xhs-profile-tabs"><button className="is-active">笔记</button></div>{waterfall}</div></section>}

  </div>}
  </main>
  {tab==='publish'&&<PublishSheet onClose={()=>setTab('home')} onPublish={(input,media)=>engine.publish(input,media)}/>}

  {!selected&&own&&!settings&&<nav className="cp-xhs-tabbar xhs-tabbar">{[['home','首页'],['publish','发布'],['profile','我']].map(([id,label])=><button key={id} aria-label={label} className={id==='publish'?'cp-xhs-tab-publish':`cp-xhs-tab ${tab===id?'is-active':''}`} onClick={()=>setTab(id)}>{id==='publish'?<div className="cp-xhs-tab-publish-inner"><Plus size={20}/></div>:<div className="cp-xhs-tab-inner"><span>{label}</span></div>}</button>)}</nav>}
 </section>;
}
function CharacterName({name,displayName,avatar,save}:{name:string;displayName:string;avatar:string;save:(name:string)=>Promise<unknown>}){const [value,setValue]=useState(displayName);return <div className="anon-character-setting"><XhsAvatar className="cp-xhs-comment-avatar" src={avatar} name={displayName}/><label>{name}<input aria-label={`${name} 匿名昵称`} value={value} onChange={e=>setValue(e.target.value)}/></label><button onClick={()=>void save(value)}>修改</button></div>;}
