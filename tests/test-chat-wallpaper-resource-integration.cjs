'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
const source = fs.readFileSync(path.join(root,'lib/chat-background-resource.ts'),'utf8');
const js = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const preview = new Blob(['prepared-wallpaper'],{type:'image/webp'});
let previewReads=0, originals=0, nextUrl=0, revision=0, hold=false;
const listeners=[], deferred=[];
const alive = new Set(), revoked=[];
let now=0, timers=[];
const timer = (fn,ms) => {const item={fn,when:now+ms};timers.push(item);return item;};
const clear = item => {timers=timers.filter(x=>x!==item);};
const advance = ms => {now+=ms;const due=timers.filter(t=>t.when<=now);timers=timers.filter(t=>t.when>now);for(const item of due)item.fn();};
const moduleExports={};
const sandbox={exports:moduleExports,Blob,atob,Uint8Array,Date,setTimeout:timer,clearTimeout:clear,
 URL:{createObjectURL(blob) { assert.equal(blob,preview);const u='blob:preview/'+(++nextUrl);alive.add(u);return u; },
   revokeObjectURL(u){assert(alive.has(u),'object URL must not be double revoked');alive.delete(u);revoked.push(u);}},
 require(name){
  if(name==='@/lib/chat-wallpaper-preview') return {getChatWallpaperRevision:()=>String(revision),onChatWallpaperInvalidated:fn=>{listeners.push(fn);return ()=>{};},getOrCreateChatWallpaperPreview:async () => {previewReads++;if(hold) return new Promise(resolve=>deferred.push(()=>resolve({kind:'blob',blob:preview})));return {kind:'blob',blob:preview};}};
  assert.equal(name,'@/lib/chat-asset-storage');return {getChatImageFromIndexedDB:async()=>{originals++;throw new Error('Original must not be read on preview hit');}};
 }};
vm.runInNewContext(js,sandbox);
(async()=>{
 const first=await moduleExports.acquireChatBackground('chat_bg_a');
 const peer=await moduleExports.acquireChatBackground('chat_bg_a');
 assert.equal(first.url,peer.url);assert.equal(previewReads,1);assert.equal(originals,0);
 first.release();peer.release();advance(7000);
 const warm=await moduleExports.acquireChatBackground('chat_bg_a');
 assert.equal(warm.url,peer.url,'warm return reuses URL');assert.equal(previewReads,1);
 moduleExports.invalidateChatBackgroundResource('chat_bg_a');
 assert(alive.has(warm.url),'invalidation must not revoke live CSS resource');
 warm.release();assert(!alive.has(warm.url),'stale URL revoked after final lease');
 const fresh=await moduleExports.acquireChatBackground('chat_bg_a');
 assert.notEqual(fresh.url,warm.url);assert.equal(previewReads,2);
 fresh.release();advance(8000);assert.equal(alive.size,0);assert.equal(revoked.length,2);
 // Two consumers waiting on an invalidated generation must receive only the new URL.
 hold=true;
 const waiting=[moduleExports.acquireChatBackground('chat_bg_race'),moduleExports.acquireChatBackground('chat_bg_race')];
 assert.equal(deferred.length,1,'same generation coalesces');
 revision++;for(const fn of listeners)fn('chat_bg_race');hold=false;
 deferred.shift()();
 const [newA,newB]=await Promise.all(waiting);
 assert.equal(newA.url,newB.url);assert(alive.has(newA.url));assert.equal(alive.size,1);
 assert.equal(revoked.length,3,'unowned stale pending URL revoked exactly once');
 newA.release();assert(alive.has(newB.url),'last consumer still owns new URL');
 newB.release();advance(8000);assert.equal(alive.size,0);assert.equal(revoked.length,4);
 console.log('PASS: derivative hit, one original read avoided, warm lease, live invalidation, final revoke');
})().catch(e=>{console.error(e);process.exitCode=1});
