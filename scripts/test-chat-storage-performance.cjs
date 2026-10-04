const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load, fixture, historical } = require('./chat-performance/harness.cjs');
const baseline = process.argv.includes('--baseline');
let checks = 0;
const equal = (a, b, label) => { assert.equal(JSON.stringify(a), JSON.stringify(b), label); checks++; };
async function run() {
 const h = load(fixture(), baseline), c = h.core;
 await c.hydrateChatStorage();
 const verify = label => {
   const sessions = c.loadChatSessions();
   for (const s of sessions) {
     const expected = c.__audit.all().filter(m => m.sessionId === s.id).sort(c.compareChatMessages);
     const actual = c.loadChatMessages(s.id);
     equal(actual, expected, label + ' order ' + s.id);
     for (let i=0;i<actual.length;i++) assert.equal(actual[i],expected[i], 'shared message identity');
     const returned = c.loadChatMessages(s.id); returned.reverse(); returned.splice(0);
     equal(c.loadChatMessages(s.id), expected, label + ' array isolation');
     equal(c.loadChatMessages(s.id, 2), expected.slice(-2), label + ' limit');
     // The preview oracle deliberately does not use the production index.
     const last = [...expected].reverse().find(c.__audit.isSessionPreviewCandidate);
     equal(s.lastMessageId, last?.id, label + ' lastMessageId');
     equal(s.lastMessagePreview || '', last ? c.getChatMessagePreview(last) : '', label + ' preview');
     if (last) equal(s.updatedAt, last.createdAt, label + ' updatedAt');
   }
   c.assertChatMessageIndexConsistency?.();
 };
 verify('hydrate private/group');
 const last = () => c.loadChatMessages('s0').at(-1);
 let m = c.pushChatMessage({ sessionId:'s0',role:'user',content:'new' }); verify('push');
 c.editChatMessage(m.id,'edited'); verify('edit');
 c.updateMessageMediaData(m.id,{label:'media'}); verify('media data');
 c.updateMessageMediaUrl(m.id,'synthetic://image'); verify('media url');
 c.updateMessageMediaStatus(m.id,'opened'); verify('media status');
 c.updateChatMessage(m.id,{status:'failed'}); verify('delivery status');
 c.updateChatMessage(m.id,{mediaType:'image',content:''}); verify('type visibility');
 await c.persistMessageVoiceAudio(m.id,'synthetic://audio','speech'); verify('voice cached');
 h.disk.set('disk-only',{id:'disk-only',sessionId:'absent',content:'voice',role:'assistant'});
 await c.persistMessageVoiceAudio('disk-only','synthetic://audio2','speech2');
 equal(h.disk.get('disk-only').mediaUrl,'synthetic://audio2','voice disk fallback');
 c.retractChatMessage(m.id); verify('retract');
 c.deleteChatMessage(m.id); verify('delete last');
 c.deleteChatMessagesFrom(c.loadChatMessages('s0').at(-3).id); verify('delete below / retry below primitive');
 c.deleteChatMessagesByIds('s1',c.loadChatMessages('s1').slice(-2).map(m=>m.id)); verify('multi delete');
 const split=c.replaceMessageWithParts(last().id,[{content:'part A'},{content:'part B',mediaType:'image'}]); verify('replace parts');
 const batch=c.pushChatMessage({sessionId:'s0',role:'assistant',content:'batch',responseBatchId:'batch',rawResponseText:'old'});
 c.replaceResponseBatchWithParts('s0','batch','new',[{content:'new A'},{content:'new B'}]); verify('batch replace');
 c.pushChatMessage({sessionId:'s4',role:'assistant',content:'round',responseRoundId:'round',senderCharacterId:'c0'});
 c.replaceGroupResponseRound('s4','round','round source',[{content:'a',senderCharacterId:'c0'},{content:'b',senderCharacterId:'c1'}]); verify('group round replace');
 const image=c.pushChatMessage({sessionId:'s0',role:'assistant',content:'image source',responseBatchId:'photo',responseRoundId:'photo-round',rawResponseText:'[照片:old]',editableResponseText:'[照片:old]'});
 c.pushChatMessage({sessionId:'s0',role:'assistant',content:'image sibling',responseBatchId:'photo',responseRoundId:'photo-round',rawResponseText:'[照片:old]',editableResponseText:'[照片:old]'});
 equal(c.syncChatGeneratedImagePromptText(image.id,'old','new',true).length,2,'image prompt updates batch and round');verify('image prompt metadata');
 c.upsertImportedChatMessage({id:'imported',sessionId:'s0',role:'assistant',content:'imported',createdAt:'2020-01-01T00:00:00.000Z',order:999,status:'sent'}); verify('import');
 equal(c.upsertImportedChatMessage(c.loadChatMessages('s0').find(m=>m.id==='imported')).inserted,false,'import idempotence');
 c.reindexSessionMessageOrdersByTime('s0'); verify('order repair');
 c.reassignChatSessionMessages('s1','s0'); verify('reassign source+target');
 c.pushChatMessage({sessionId:'s0',role:'assistant',content:'[获取工具: test]',mediaType:'tool_call'});
 c.clearChatSessionToolHistory('s0'); verify('clear tool history');
 c.clearChatSessionMessages('s2'); verify('clear session');
 const duplicate={...c.loadChatSessions().find(s=>s.id==='s0'),id:'duplicate'};
 c.saveChatSessions([...c.loadChatSessions(),duplicate]); verify('merge duplicate private sessions');
 c.deleteChatSession('s3'); verify('delete session');
 const big=load(fixture(110,1),baseline);await big.core.hydrateChatStorage();
 const all=big.core.loadChatMessages('s0');equal(all.slice(-big.core.CHAT_INITIAL_VISIBLE_MESSAGE_COUNT).length,50,'initial 50');equal(all.slice(-(50+big.core.CHAT_LOAD_MORE_MESSAGE_COUNT)).length,80,'load more +30');
 const room = historical('components/chat/chat-room.tsx'); assert.match(room,/deleteChatMessagesFrom/);checks++;
 // Actual runtime mappings are extracted, not reimplemented.
 const runtime=fs.readFileSync('lib/chat-plugin-runtime.ts','utf8');
 const messagesList=runtime.match(/list: \(sessionId\) => (loadChatMessages\(sessionId\))/)[1];
 const sessionGet=runtime.match(/get: \(id\) => (loadChatSessions\(\)\.find\(s => s.id === id\) \?\? null)/)[1];
 equal(new Function('sessionId','loadChatMessages','return '+messagesList)('s0',c.loadChatMessages),c.loadChatMessages('s0'),'plugin messages.list');
 equal(new Function('id','loadChatSessions','return '+sessionGet)('s0',c.loadChatSessions),c.loadChatSessions().find(s=>s.id==='s0'),'plugin sessions.get');
 assert(runtime.indexOf('await Promise.allSettled([hydrateKvDb(), hydrateChatStorage()])')<runtime.indexOf('if (isChatPluginSafeMode())'));checks++;
 // Randomized/mixed legacy order must preserve the original comparator and its
 // stable input ordering. This also exercises immediate metadata before reads.
 for (let seed=1;seed<=15;seed++) {
   const d=fixture(120,4);let random=seed;
   const rng=()=>{random=(random*1664525+1013904223)>>>0;return random/4294967296;};
   for(const msg of d.messages){if(rng()<.4)delete msg.order;if(rng()<.1)msg.createdAt='invalid';}
   d.messages.sort(()=>rng()-.5);
   const x=load(d,baseline);await x.core.hydrateChatStorage();
   for(let step=0;step<20;step++){
     const sid='s'+(step%4),all=x.core.__audit.all().filter(m=>m.sessionId===sid).sort(x.core.compareChatMessages);
     if(!all.length)continue;
     const target=all[Math.floor(rng()*all.length)];
     if(step%4===0)x.core.updateChatMessage(target.id,{content:'update '+step,mediaType:step%8===0?'tool_notice':undefined});
     else if(step%4===1)x.core.editChatMessage(target.id,'edit '+step);
     else if(step%4===2)x.core.deleteChatMessage(target.id);
     else x.core.pushChatMessage({sessionId:sid,role:'assistant',content:'mixed append',createdAt:step%2?'2000-01-01T00:00:00.000Z':'2030-01-01T00:00:00.000Z'});
     const expected=x.core.__audit.all().filter(m=>m.sessionId===sid).sort(x.core.compareChatMessages);
     equal(x.core.loadChatMessages(sid),expected,'mixed order '+seed+'/'+step);
     const last=[...expected].reverse().find(x.core.__audit.isSessionPreviewCandidate),session=x.core.loadChatSessions().find(s=>s.id===sid);
     equal([session.lastMessageId,session.lastMessagePreview],[last?.id,last?x.core.getChatMessagePreview(last):''],'mixed preview');
     x.core.assertChatMessageIndexConsistency?.();
   }
 }
 // Mutations omitted by old plugin hooks still advance the cheap revision token.
 if(!baseline){
   const id=c.loadChatSessions()[0].id;
   const beforePushWrites=h.writes.filter(w=>w[0]==='dbPutSessions').length;
   const item=c.pushChatMessage({sessionId:id,role:'assistant',content:'revision'});
   equal(h.writes.filter(w=>w[0]==='dbPutSessions').length-beforePushWrites,1,'push writes preview only once');
   for(const mutate of [()=>c.editChatMessage(item.id,'next'),()=>c.updateMessageMediaData(item.id,{label:'x'}),()=>c.updateMessageMediaUrl(item.id,'synthetic://x'),()=>c.updateMessageMediaStatus(item.id,'opened'),()=>c.retractChatMessage(item.id)]){
     const version=c.getChatSessionRevision(id);mutate();assert(c.getChatSessionRevision(id)>version);checks++;
   }
   const writes=h.writes.length;
   for(let i=0;i<10;i++)c.loadChatSessions();
   equal(h.writes.length,writes,'session read has no persistence side effects');
   const exposed=c.loadChatMessages(id)[0],previous=exposed.sessionId;
   exposed.sessionId='invalid-direct-write';
   assert.throws(()=>c.assertChatMessageIndexConsistency(),/mismatch/);checks++;
   exposed.sessionId=previous;c.assertChatMessageIndexConsistency();
 }
 // Historical oracle: same migrations, including earlier candidates consuming notices.
 {
   const d=fixture(30,3),x=load(d,baseline);await x.core.hydrateChatStorage();
   const notification=x.core.pushChatMessage({sessionId:'s0',role:'assistant',content:'User accepted',mediaType:'accept_transfer'});
   x.core.pushChatMessage({sessionId:'s1',role:'assistant',content:'[我向User发起了语音通话]'});
   d.userName='Another';d.characterName='Renamed';
   x.window.dispatchEvent({type:'chat-preview-context-updated'});
   equal(x.core.loadChatSessions().find(s=>s.id==='s0').lastMessagePreview,'User accepted','identity save repairs preview');
   equal(x.core.loadChatSessions().find(s=>s.id==='s1').lastMessagePreview,'Renamed向你发起了语音通话','character save repairs preview');
   equal(x.core.loadChatMessages('s0').at(-1).content,notification.content,'context change never rewrites messages');
   for(const [file,fn] of [['lib/character-storage.ts','saveCharacters'],['lib/settings-storage.ts','saveUserIdentities'],['lib/settings-storage.ts','saveBindingConfig']]){
     const src=fs.readFileSync(file,'utf8').split('export function '+fn+'(')[1].split('\n}')[0];
     assert(src.includes('chat-preview-context-updated'),'explicit preview context write event '+fn);checks++;
   }
 }
 for(const kind of ['none','result','notice','native','user','mixed']){
   const d=fixture(300,4);let index=0;
   for(const msg of d.messages){
     if(index++%7)continue;
     msg.role=kind==='user'?'user':'assistant';
     msg.mediaType=kind==='notice'?'tool_notice':kind==='none'?undefined:'tool_result';
     msg.content='answer [获取工具: test]';
     if(kind==='native')msg.nativeToolResult={toolCallId:'x'};
     if(kind==='notice'){msg.rawResponseText=msg.content;msg.responseBatchId='batch-'+Math.floor(index/21);}
     if(kind==='mixed'){const copy={...msg,id:msg.id+'copy',mediaType:'tool_notice',rawResponseText:msg.content,responseBatchId:'mixed-'+index};d.messages.push(copy);}
     if(index>300)break;
   }
   const old=load(d,true),current=load(d,baseline);
   const normalize=x=>JSON.parse(JSON.stringify(x).replace(/msg_\d+_/g,'msg_TIME_').replace(/resp_\d+_/g,'resp_TIME_'));
   equal(normalize(current.core.__audit.normalizeLegacyTextToolHistory(d.messages)),normalize(old.core.__audit.normalizeLegacyTextToolHistory(d.messages)),'legacy '+kind);
 }
 for(let seed=0;seed<20;seed++){
   const d=fixture(60,3),base=1700000000000;
   for(let i=0;i<d.messages.length;i++){
     const m=d.messages[i];m.role='assistant';m.mediaType=i%4===0?'tool_result':'tool_notice';
     const directive='[获取工具: '+(i%3)+']';m.content='answer '+directive;
     m.createdAt=new Date(base+(i%7)*60000+(seed%3-1)).toISOString();
     if(i%4){m.rawResponseText=(i%2?'other ':'answer ')+directive;m.responseBatchId='batch'+(i%9);}
     if(i%6===0)delete m.order;
   }
   // Distinct sessions, exact text matches outside the time window, strict
   // +/-60-second boundaries and competing batches all use the old oracle.
   const old=load(d,true),now=load(d,baseline);
   const canonical=x=>JSON.parse(JSON.stringify(x).replace(/msg_\d+_/g,'msg_TIME_').replace(/resp_\d+_/g,'resp_TIME_'));
   equal(canonical(now.core.__audit.normalizeLegacyTextToolHistory(d.messages)),canonical(old.core.__audit.normalizeLegacyTextToolHistory(d.messages)),'legacy boundary '+seed);
 }
 console.log(JSON.stringify({baseline,checks,status:'passed'}));
}
run().catch(e=>{console.error(e);process.exitCode=1});
