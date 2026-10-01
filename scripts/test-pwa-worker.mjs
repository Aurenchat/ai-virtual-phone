import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { MessageChannel } from 'node:worker_threads';
const source = await fs.readFile('public/sw.js', 'utf8');
let passed=0;
function check(value,label){assert.ok(value,label);passed++;console.log('PASS',label);}
function harness({rootId='test-b',missing=false,clients=[]}={}){
  const store=new Map(), listeners={}, notices=[], messages=[];let skips=0;
  const abs=k=>new URL(typeof k==='string'?k:k.url,'https://float.test').href;
  const caches={keys:async()=>[...store.keys()],delete:async n=>store.delete(n),open:async n=>{
    if(!store.has(n))store.set(n,new Map());const map=store.get(n);
    return {match:async k=>map.get(abs(k))?.clone(),put:async(k,v)=>{map.set(abs(k),v.clone());},keys:async()=>[...map.keys()].map(k=>new Request(k))};
  }};
  const self={location:new URL('https://float.test/sw-versioned.js'),addEventListener:(n,f)=>listeners[n]=f,skipWaiting:async()=>{skips++;},registration:{showNotification:async(t,o)=>notices.push({t,o})},clients:{matchAll:async()=>clients,openWindow:async u=>messages.push({open:u})}};
  const fetch=async req=>{const url=abs(req);if(new URL(url).pathname==='/')return new Response(`<meta name="float-build-id" content="${rootId}"><script src="/_next/static/chunks/core-123.js"></script>`,{headers:{'Content-Type':'text/html'}});return new Response('script',{status:missing?404:200,headers:{'Content-Type':'application/javascript'}});};
  vm.runInNewContext(source.replace('"__FLOAT_BUILD_ID__"','"test-b"'),{self,caches,fetch,URL,Request,Response,MessageChannel,setTimeout,clearTimeout,console});
  const run=async(type,props={})=>{let promise,response;listeners[type]({...props,waitUntil:p=>promise=p,respondWith:p=>response=p});if(promise)await promise;return response?await response:null;};
  const ready=async()=>{let reply;await run('message',{data:{type:'PWA_CLIENT_READY',buildId:'test-b'},source:{id:'b'},ports:[{postMessage:m=>reply=m}]});return reply;};
  return {store,caches,self,run,ready,notices,messages,get skips(){return skips;}};
}
const bClient={id:'b',visibilityState:'visible',postMessage:(m,ports)=>ports?.[0]?.postMessage({buildId:'test-b',ready:true})};
let h=harness({clients:[bClient]});
await h.caches.open('ai-phone-pwa-v10-static');await h.caches.open('ai-phone-pwa-v12-static');
await h.run('install');await h.run('activate');check(h.skips===0&&h.store.has('ai-phone-pwa-v10-static'),'Install/activate neither skip nor evict');
check((await h.ready()).ok,'Verified root and all assets stage successfully');
check(h.skips===1,'All clients ready permits activation');
check(Boolean(await(await h.caches.open('float-pwa-build-test-b-shell')).match('/')),'Verified offline shell committed');
check((await h.caches.keys()).filter(x=>x.startsWith('ai-phone')).length===1,'Keep one previous generation after ready');
const root=(await h.run('fetch',{request:{url:'https://float.test/',mode:'navigate',method:'GET'}}));
// Native Request construction rejects the synthetic request: this exercises offline fallback.
check((await root.text()).includes('test-b'),'Fallback serves own verified build');
h=harness({rootId:'other'});check(!(await h.ready()).ok&&h.skips===0,'Wrong root build refuses preparation/activation');
h=harness({missing:true});let installRejected=false;try { await h.run('install'); } catch { installRejected=true; }check(installRejected,'Missing boot chunk also prevents natural install/activation');check(!(await h.ready()).ok&&h.skips===0,'Missing boot chunk refuses preparation/activation');check(!await(await h.caches.open('float-pwa-build-test-b-shell')).match('/'),'Incomplete shell is never published');
const oldClient={id:'a',postMessage:(m,ports)=>ports?.[0]?.postMessage({buildId:'test-a',ready:true})};
h=harness({clients:[oldClient,bClient]});await h.caches.open('ai-phone-pwa-v10-static');await h.caches.open('ai-phone-pwa-v12-static');check((await h.ready()).ok,'New build may stage while old client stays open');check(h.skips===0&&h.store.has('ai-phone-pwa-v10-static'),'Old client blocks activation and cleanup');
h=harness({clients:[{id:'suspended',postMessage:()=>{}}]});await h.ready();check(h.skips===0,'Nonresponsive client conservatively blocks takeover');
let delivered=[];const visible={id:'v',visibilityState:'visible',postMessage:m=>delivered.push(m),focus:async()=>delivered.push('focus')};
h=harness({clients:[visible]});await h.run('push',{data:{json:()=>({type:'incoming_call',sessionId:'s',callTs:123})}});check(delivered[0].type==='incoming_call_push'&&delivered[1].type==='push_outbox_ready'&&h.notices.length===0,'Visible incoming call preserves in-app delivery');
h=harness();await h.run('push',{data:{json:()=>({type:'incoming_call',title:'Call',sessionId:'s'})}});check(h.notices[0].o.data.type==='incoming_call','Background incoming call preserves system notification');
await h.run('push',{data:{json:()=>({web_push:8030,notification:{title:'Declared',body:'Body',data:{type:'chat_outbox'}}})}});check(h.notices[1].t==='Declared','Declarative push remains supported');
delivered=[];h=harness({clients:[visible]});await h.run('notificationclick',{notification:{close(){},data:{type:'shortcut_command',url:'/shortcut-run?id=test'}}});check(delivered[0].type==='run_shortcut'&&delivered[1]==='focus'&&h.messages.length===0,'Shortcut focuses live page without navigation');
h=harness();await h.run('notificationclick',{notification:{close(){},data:{type:'shortcut_command',url:'/shortcut-run?id=test'}}});check(h.messages[0].open==='https://float.test/shortcut-run?id=test','Shortcut opens dispatch URL when no page exists');
delivered=[];h=harness({clients:[visible]});await h.run('push',{data:{json:()=>({type:'chat_outbox'})}});check(delivered[0].type==='push_outbox_ready','Visible outbox push delivery preserved');
console.log(`${passed} PWA worker checks passed`);
