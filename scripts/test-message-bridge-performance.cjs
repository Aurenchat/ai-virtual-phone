const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
 const context=await browser.newContext({viewport:{width:402,height:874}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<html><head></head><body></body></html>');
 const result=await page.evaluate(async source=>{
 const results=[],check=(name,ok)=>{if(!ok)throw Error(name);results.push(name);},wait=ms=>new Promise(r=>setTimeout(r,ms||100));
 const sessions=Array.from({length:5},(_,i)=>({id:'s'+i,contactId:'c'+i,isGroup:i===1,groupName:'Group'}));
 const messages=new Map(sessions.map(s=>[s.id,[]])),versions=new Map(sessions.map(s=>[s.id,0]));
 let reads={sessions:0,messages:0},hooks={};
 const ctx={data:{sessions:{get:id=>{reads.sessions++;return sessions.find(s=>s.id===id);},revision:id=>versions.get(id)},messages:{list:id=>{reads.messages++;return messages.get(id).slice();},revision:id=>versions.get(id)},characters:{get:()=>({name:'Name'})}},hooks:{on:(name,fn)=>{hooks[name]=fn;return()=>delete hooks[name];}},system:{settings:{get:()=> 'truthful',onChange:()=>()=>{}}}};
 const row=(id,role='assistant',kind='text',sender='c0')=>{
 const msg={id,role,sessionId:'s0',content:'text',status:'sent',senderCharacterId:sender};
 let content='<span class="body-text">body</span>',cls='';
 if(kind==='voice'){msg.mediaType='audio';content='<div class="voice-msg-bubble"><span class="voice-msg-bars"></span><span class="voice-msg-dur">12"</span></div>';}
 if(kind==='music'){msg.mediaType='music_share';cls=' chat-bubble-music-share';content='<div class="chat-music-share-surface">song</div>';}
 if(kind==='image'){msg.mediaType='image';cls=' chat-bubble-media';content='<div class="chat-photo-card--image">image</div>';}
 if(kind==='quote'){msg.mediaType='quote';content='<div class="chat-quote-message">quote</div><span>reply</span>';}
 return {msg,html:'<div class="chat-msg-wrapper" id="message-'+id+'" data-role="'+role+'" data-consecutive=""><div class="chat-msg-content-wrap"><div class="chat-bubble-role-'+role+cls+'" data-msg-id="'+id+'">'+content+'</div></div></div>'};
 };
 document.head.innerHTML='<style>.chat-room-wrapper{--im-theme:1}.page-body{height:600px;overflow:auto}.chat-bubble-role-user,.chat-bubble-role-assistant{position:relative;width:240px;min-height:40px;padding:8px}.chat-bubble-music-share{height:100px}.im-text-outline{position:absolute;top:0;left:0;pointer-events:none}</style>';
 const initial=[row('text1'),row('text2'),row('voice','user','voice'),row('music','assistant','music'),row('image','user','image'),row('quote','assistant','quote')];
 messages.set('s0',initial.map(r=>r.msg));
 for(let i=0;i<5;i++){
 const layer=document.createElement('div');layer.id='layer'+i;if(i)layer.style.display='none';
 const items=i===0?initial:[row('g'+i+'a','assistant','text','c0'),row('g'+i+'b','assistant','text','c0'),row('g'+i+'c','assistant','text','c1')];
 if(i)messages.set('s'+i,items.map(r=>({...r.msg,sessionId:'s'+i})));
 layer.innerHTML='<div class="chat-room-wrapper session-s'+i+'"><header class="page-header chat-room-main-pane"><div class="page-header-content"><div class="page-title">Title '+i+'</div><div class="page-header-right"><button aria-label="更多">More</button></div></div></header><div class="page-body chat-room-main-pane">'+items.map(r=>r.html).join('')+'</div><div class="chat-input-bar"><textarea></textarea></div></div>';
 document.body.append(layer);
 }
 const plugin=new Function(source.replace('export default','return'))(),cleanup=plugin.setup(ctx);
 await wait();
 check('initial metadata only visible room',reads.sessions===1&&reads.messages===1);
 const bubble=id=>document.querySelector('[data-msg-id="'+id+'"]');
 check('consecutive first/middle boundary',bubble('text1').getAttribute('data-im-group')==='first'&&bubble('text2').getAttribute('data-im-group')==='last');
 check('voice outline',bubble('voice').classList.contains('im-geometry-ready'));
 check('quote outline',bubble('quote').classList.contains('im-geometry-ready'));
 check('music outline preserved',bubble('music').style.getPropertyValue('--im-music-outline').startsWith('path('));
 check('single image marker',bubble('image').hasAttribute('data-im-single-image'));
 reads={sessions:0,messages:0};
 document.querySelector('.body-text').firstChild.data='streamed longer body';await wait();
 check('ordinary text zero data reads',reads.sessions===0&&reads.messages===0);
 document.querySelector('.page-title').firstChild.data='Renamed';await wait();
 check('precise title watch',document.querySelector('.im-contact-name').textContent==='Renamed');
 const dur=document.querySelector('.voice-msg-dur');dur.firstChild.data='17"';await wait();
 check('precise duration watch',dur.getAttribute('data-im-duration')==='00:17');
 document.querySelector('.voice-msg-bars').setAttribute('data-playing','');await wait();
 check('voice state watch',document.querySelector('.voice-msg-bubble').getAttribute('aria-label')==='暂停语音');
 check('title voice no list reads',reads.sessions===0&&reads.messages===0);
 const previous=bubble('music').style.getPropertyValue('--im-music-outline');bubble('music').style.width='200px';await wait();
 check('music resize keeps geometry',bubble('music').style.getPropertyValue('--im-music-outline')!==previous);
 check('resize no metadata reads',reads.sessions===0&&reads.messages===0);
 const added=row('new','user');messages.get('s0').push(added.msg);versions.set('s0',1);
 document.querySelector('.page-body').insertAdjacentHTML('beforeend',added.html);hooks['message.persisted']({message:added.msg});await wait();
 check('persist coalesces once',reads.sessions===1&&reads.messages===1);
 check('new receipt',bubble('new').closest('.chat-msg-content-wrap').querySelector('.im-receipt')?.textContent==='已发送');
 reads={sessions:0,messages:0};
 const old=messages.get('s0').find(m=>m.id==='new');messages.set('s0',messages.get('s0').map(m=>m===old?{...m,status:'failed'}:m));versions.set('s0',2);
 // No hook and no DOM mutation: revision reconciliation must still update metadata.
 await wait(2200);
 check('silent update revision fallback',bubble('new').closest('.chat-msg-content-wrap').querySelector('.im-receipt')?.textContent==='发送失败');
 check('revision fallback only affected visible room',reads.sessions===1&&reads.messages===1);
 // Reusing a mounted DOM room for another session must invalidate even when
 // both sessions have exactly the same revision token.
 versions.set('s4',versions.get('s0'));
 reads={sessions:0,messages:0};
 const reused=document.querySelector('#layer0 .chat-room-wrapper');
 reused.classList.replace('session-s0','session-s4');await wait();
 check('room identity switch with equal revision',reads.sessions===1&&reads.messages===1);
 reused.classList.replace('session-s4','session-s0');await wait();
 reads={sessions:0,messages:0};
 versions.set('s1',1);hooks['message.updated']({id:'g1a'});await wait();
 check('hidden mutation no reads',reads.sessions===0&&reads.messages===0);
 document.getElementById('layer0').style.display='none';document.getElementById('layer1').style.display='';await wait();
 check('show hidden room sync once',reads.sessions===1&&reads.messages===1);
 check('group same sender groups',bubble('g1a').getAttribute('data-im-group')==='first');
 check('group different sender separates',bubble('g1b').getAttribute('data-im-group')==='last'&&bubble('g1c').getAttribute('data-im-group')==='single');
 const before={...reads};await wait(2200);check('idle revision checks no reads',JSON.stringify(reads)===JSON.stringify(before));
 cleanup();await wait();check('cleanup decorations',document.querySelectorAll('.im-text-outline').length===0);
 // Old host compatibility: finite reconciliation catches mutations without hooks.
 delete ctx.data.messages.revision;delete ctx.data.sessions.revision;
 const cleanOld=plugin.setup(ctx);await wait();reads={sessions:0,messages:0};
 document.querySelector('#layer1 .body-text').firstChild.data='old host text';await wait();
 check('old host body text still no reads',reads.sessions===0&&reads.messages===0);
 await wait(2200);check('old host bounded reconciliation',reads.sessions===1&&reads.messages===1);
 cleanOld();return results;
 },fs.readFileSync('themes/imessage-native-day/iMessage-Message-Bridge.js','utf8'));
 assert.deepEqual(errors,[]);
 fs.writeFileSync('scripts/chat-performance/bridge-results.json',JSON.stringify({checks:result.length,results:result,errors},null,2));
 console.log(JSON.stringify({checks:result.length,results:result,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
