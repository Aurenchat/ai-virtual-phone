'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../lib/xiaohongshu-comment-regeneration.ts'), 'utf8');
const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const module_ = { exports: {} };
new Function('module', 'exports', 'require', out.outputText)(module_, module_.exports, id => {
  if (id === './kv-db' || id === './xiaohongshu-memory') return {};
  return require(id);
});
const api = module_.exports;
const c = (id, authorType, replyToCommentId, text = id) => ({ id, noteId: 'n', authorType, authorId:id, authorName:id, text, replyToCommentId, createdAt:'2026-01-01', likeCount: 1, dislikeCount: 0, liked: true, disliked: false, unread: true });
const note = { id:'n', title:'post', commentCount: 9, likeCount:12, comments:[
  c('root','character',undefined,'hello'),
  c('npc1','npc','root','npc1old'),
  c('user1','user','root','user preserved'),
  c('npc2','npc','npc1','npc2old'),
  c('character1','character','npc1','other char preserved'),
  c('npc3','npc','user1','npc3old'),
  c('unrelated','npc',undefined),
  c('npc4','npc','character1','npc4old'),
  c('orphan','npc','missing')
] };
const plan = api.planXiaohongshuCommentRegeneration(note, 'root');
assert.deepEqual(plan.comments.map(c=>c.id), ['root','npc1','npc2','npc3','npc4']);
assert.throws(()=>api.planXiaohongshuCommentRegeneration(note,'user1'),/只允许/);
assert.throws(()=>api.planXiaohongshuCommentRegeneration(note,'missing'),/只允许/);
const repl = new Map(plan.comments.map(c=>[c.id,'new:'+c.id]));
const next = api.applyXiaohongshuCommentRegeneration(note,repl);
assert.deepEqual(next.comments.map(x=>x.id),note.comments.map(x=>x.id));
assert.equal(next.comments.find(c=>c.id==='root').replyToCommentId,undefined);
assert.equal(next.comments.find(c=>c.id==='user1').text,'user preserved');
assert.equal(next.comments.find(c=>c.id==='character1').text,'other char preserved');
assert.equal(next.comments.find(c=>c.id==='npc4').text,'new:npc4');
assert.deepEqual(next.comments.map(x=>x.createdAt),note.comments.map(x=>x.createdAt));
assert.deepEqual(next.comments.map(x=>x.liked),note.comments.map(x=>x.liked));
assert.equal(next.commentCount,9);assert.equal(next.likeCount,12);
assert.equal(api.isXiaohongshuCommentRegenerationSnapshotValid(note,note,plan),true);
const changed={...note,comments:note.comments.map(c=>c.id==='npc1'?{...c,text:'user changed in meantime'}:c)};
assert.equal(api.isXiaohongshuCommentRegenerationSnapshotValid(changed,note,plan),false);
assert.equal(api.isXiaohongshuCommentRegenerationSnapshotValid({...note,comments:note.comments.filter(c=>c.id!=='root')},note,plan),false);
assert.throws(()=>api.applyXiaohongshuCommentRegeneration(note,new Map([['bad','new']])),/不完整/);
const context = api.contextForXiaohongshuCommentRegeneration(note,new Set(['npc1','npc2']));
assert(!context.comments.some(c=>['npc1','npc2'].includes(c.id)));
const notif = [
 { id:'notice1',type:'comment',noteId:'n',actorName:'root',text:'hello',createdAt:'now',unread:false },
 { id:'notice2',type:'comment',noteId:'other',actorName:'root',text:'hello',createdAt:'now',unread:true },
 { id:'notice3',type:'comment',noteId:'n',actorName:'unrelated',text:'unchanged' }
];
const revised = api.reviseXiaohongshuCommentNotifications(notif,note,repl);
assert.equal(revised[0].text,'new:root');assert.equal(revised[1].text,'hello');assert.equal(revised[2].text,'unchanged');
assert.equal(revised[0].id,'notice1');assert.equal(revised[0].unread,false);
const ambiguous = api.reviseXiaohongshuCommentNotifications([...notif, {...notif[0],id:'notice4'}],note,repl);
assert.equal(ambiguous[0].text,'hello'); assert.equal(ambiguous[3].text,'hello');
const cyclic={...note,comments:[c('a','npc','b'),c('b','npc','a')]};
assert.throws(()=>api.planXiaohongshuCommentRegeneration(cyclic,'a'),/循环/);
console.log('PASS: root/NPC descendant BFS, user+character preservation, stable IDs/time/votes, atomic validation, notification ambiguity, cycle safety');
