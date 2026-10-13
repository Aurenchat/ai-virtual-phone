const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const root = path.join(__dirname, '..');

function compile(file, stub) {
  const raw = fs.readFileSync(path.join(root, 'lib', file), 'utf8');
  const outcome = ts.transpileModule(raw, { fileName:file, reportDiagnostics:true, compilerOptions:{ target:ts.ScriptTarget.ES2020, module:ts.ModuleKind.CommonJS, strict:true } });
  const errors = (outcome.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.deepStrictEqual(errors.map(e=>String(e.messageText)), [], file+': parse/emit errors');
  const sandbox = { exports:{}, require:(key) => stub(key), console, window:undefined, Event:class Event{}, Map, Set, JSON, Date };
  vm.runInNewContext(outcome.outputText, sandbox, { filename:file });
  return sandbox.exports;
}

function note() {
  return { id:'note-original', source:'user', authorId:'user1', authorName:'Chloe',title:'沙漠',body:'今晚在沙丘',type:'post',tags:['Morocco'],imageAssetIds:['a','b'],likeCount:4,saveCount:1,commentCount:3,recentLikeNames:[],recentSaveNames:[],comments:[
    {id:'root',authorType:'npc',authorId:'n1',authorName:'路人1', text:'风景不错',noteId:'note-original'},
    {id:'reply',authorType:'npc',authorId:'n2',authorName:'路人2',text:'你去过？',replyToCommentId:'root',noteId:'note-original'},
    {id:'last',authorType:'character',authorId:'character2',authorName:'Roy',text:'记得防晒',replyToCommentId:'reply',noteId:'note-original'},
  ]};
}
let current = { notes:[note()], notifications:[] };
let memory=[];
let saved=[];
const savedShare={ id:'share1',sessionId:'session1', role:'user',mediaType:'xiaohongshu_note_share',mediaData:{xiaohongshuNoteId:'note-original'} };
const savedReply={id:'reply-1',sessionId:'session1',role:'assistant',content:'visible reply'};
const read = compile('xiaohongshu-chat-share.ts', key=>{
  if (key.endsWith('xiaohongshu-storage')) return {loadXiaohongshuState:()=>current};
  if (key.endsWith('xiaohongshu-vision')) return {getXiaohongshuNoteImageIds:n=>n.imageAssetIds,resolveXiaohongshuVisionImages: async()=>({images:[],total:2,unavailablePositions:[1,2],skippedByLimit:0}),makeXiaohongshuVisionMessage:(text, batch)=>({role:'user', content:text})};
  return {};
});
const c = read.formatXhsShareNoteForChat(current.notes[0]);
assert(c.includes('[笔记ID]note-original')&&c.includes('[TAG]Morocco'));
assert(c.includes('回复 路人1')&&c.includes('回复 路人2'));
assert(c.includes('[评论ID]reply'));
assert.strictEqual(read.newestXhsShareMessage([{...savedShare,sessionId:'session1'}],'session1').id,'share1');
assert.strictEqual(read.newestXhsShareMessage([{...savedShare,sessionId:'session1'},{id:'other',sessionId:'session1',role:'user'}],'session1').id,'share1');
assert.strictEqual(read.newestXhsShareMessage([{...savedShare,sessionId:'session1',isRetracted:true}],'session1'),null);
const parsed = read.parseXhsSocialActions('好的< x > <xhs_social_actions>{"like":true,"save":true,"replies":[{"targetCommentId":"root","text":"回复"}]}</xhs_social_actions>');
assert.strictEqual(parsed.actions.like, true); assert.strictEqual(parsed.actions.replies[0].targetCommentId,'root');
assert(!parsed.visibleText.includes('xhs_social_actions'));
assert.strictEqual(read.parseXhsSocialActions('<xhs_social_actions>{broken}</xhs_social_actions>').actions,null);
let out='';const onChunk=read.createXhsStreamSanitizer(t=>{out+=t;});
for (const s of ['hello world this is a long preview without tags. ','Another longer chunk of text. ','<xhs_social_','actions>{"like":true}</xhs_social_actions>']) onChunk(s);
assert(!out.includes('xhs_social_actions')&&!out.includes('like')&&out.includes('hello'));

const commit = compile('xiaohongshu-chat-share-commit.ts', key=>{
 if(key.endsWith('xiaohongshu-chat-share')) return read;
 if(key.endsWith('chat-storage')) return {loadChatMessages:()=>[savedShare,savedReply]};
 if(key.endsWith('chat-db'))return {chatDb:{messages:{bulkGet:async ids=>ids.map(id=>[savedShare,savedReply].find(m=>m.id===id))},sessions:{get:async()=>({contactId:'character1'})}}};
 if(key.endsWith('kv-db'))return {kvUpdateAtomic:async(_key,update)=>{const next=update(JSON.stringify(current));current=JSON.parse(next.value);saved.push(current);return next.result;}};
 if(key.endsWith('character-storage'))return {loadCharacters:()=>[{id:'character1',name:'Krueger'}]};
 if(key.endsWith('xiaohongshu-character-profile'))return {resolveCharacterXiaohongshuDisplayName:()=> 'Krueger'};
 if(key.endsWith('xiaohongshu-storage'))return {
   loadXiaohongshuState:()=>current,
   saveXiaohongshuState:(x)=>{saved.push(x);current=x;return x;},
   makeXiaohongshuComment:({authorType,authorId,authorName,replyToCommentId,replyTo,noteId,text})=>({id:'new-reply-'+saved.length,authorType,authorId,authorName,replyToCommentId,replyTo,noteId,text,createdAt:'2026-10-14',likeCount:0,dislikeCount:0,liked:false,disliked:false}),
   makeXiaohongshuNotification:x=>({...x,id:'notify'})
 };
 if(key.endsWith('xiaohongshu-engine'))return {applyCharacterReaction:(n,ch,action)=>{
   const comment=action.comment?{id:'new-root',text:action.comment,createdAt:'2026-10-14'}:{text:''};
   return {note:{...n,comments: action.comment?[...n.comments, comment]:n.comments,commentCount:n.commentCount+(action.comment?1:0),likeCount:n.likeCount+Number(action.liked),saveCount:n.saveCount+Number(action.saved)},notifications:[],mainComment:comment};
 }};
 if(key.endsWith('xiaohongshu-memory'))return {recordXiaohongshuCommentEvent:x=>memory.push({type:'comment', x}), recordXiaohongshuReplyEvent:x=>memory.push({type:'reply',x})};
 if(key.endsWith('memory-storage'))return {incrementEventCounter:()=>memory.push({type:'counter'})};
 if(key.endsWith('memory-summarizer'))return {maybeRunSummarization:async()=>null};
 return {};
});
const data={sessionId:'session1',characterId:'character1',responseMessageId:'reply-1',pending:{shareMessageId:'share1',noteId:'note-original',action:parsed.actions,allowedReplyIds:['root','reply','last']}};
(async()=>{
assert.strictEqual((await commit.commitXhsShareActions({...data,pending:{...data.pending,action:{like:false,save:false,replies:[{targetCommentId:'bad',text:'bad'}]}}})).applied,false);
assert.strictEqual(saved.length,0);
assert.strictEqual((await commit.commitXhsShareActions(data)).applied,true);
assert.strictEqual(saved.length,1);
assert.strictEqual((await commit.commitXhsShareActions(data)).applied,false);
assert.strictEqual(saved.length,1);
assert.strictEqual(current.notes[0].comments.at(-1).replyToCommentId,'root');
assert.strictEqual(memory.filter(x=>x.type==='reply').length,1);
assert.strictEqual(memory.filter(x=>x.type==='counter').length,1);
assert.strictEqual(memory.filter(x=>x.type==='comment').length,0);
console.log('PASS: read-only context/ancestry, latest-reference gating, JSON sanitize/stream, valid/invalid writes, native reply memory');
})().catch(error=>{console.error(error);process.exitCode=1;});
