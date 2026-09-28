// Execute the real Host source-memory module with isolated persistence fixtures.
// Never accesses browser/profile data or existing user memories.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

export function createSourceMemoryFixture() {
 const entries=[],timeline=[],revisions=new Map();let reads=0,writes=0;
 const key=s=>JSON.stringify([s.sourceAppId,s.viewerCharacterId,s.sourceNamespace,s.sourceEntityId]);
 const modules={
  './memory-storage':{async loadMemoryEntries(viewer){reads++;return entries.filter(e=>e.characterId===viewer);},async saveMemoryEntry(e){writes++;entries.push(structuredClone(e));}},
  './custom-app-protected-policy':{requireAppCapability(app,p){if(!app.permissions.includes(p))throw Error('Permission denied');}},
  './memory-provenance':{memorySourceKey:key,async readMemoryRevisions(){return Object.fromEntries(revisions);},async invalidateMemorySource(s){const k=key(s),r=(revisions.get(k)||0)+1;revisions.set(k,r);return r;}},
  './character-storage':{loadCharacters:()=>['private-a','private-b'].map(id=>({id}))},
  './kv-db':{async hydrateKvDb(){}},
  './custom-app-storage':{
   loadCustomAppTimelineEntries:viewer=>timeline.filter(e=>e.characterId===viewer),
   appendCustomAppTimelineEntry(app,input){const e={id:'tl_'+timeline.length,appId:app.id,appName:app.name,...input};timeline.push(structuredClone(e));return e;},
  },
 };
 const module={exports:{}};
 const file=path.resolve('lib/custom-app-source-memory.ts');
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>{assert(id in modules,id);return modules[id];},navigator:{locks:{request:async(_key,fn)=>fn()}}},{filename:file});
 const api=app=>({searchSource:s=>module.exports.searchSourceMemory(app,s),writeSource:s=>module.exports.writeSourceMemory(app,s),invalidateSource:s=>module.exports.revokeSourceMemory(app,s)});
 const activeTimeline=(app,scope)=>timeline.filter(e=>e.appId===app.id&&e.provenance.sources.every(s=>key(s)===key({...scope,sourceAppId:app.id})&&s.revision===(revisions.get(key(s))||0)));
 return {api,activeTimeline,entries,timeline,get reads(){return reads;},get writes(){return writes;}};
}

if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)) {
 const f=createSourceMemoryFixture();
 const app={id:'fixture.app',name:'Fixture',permissions:['memory.source.read','memory.source.write']};
 const api=f.api(app),scope={viewerCharacterId:'private-a',sourceNamespace:'social_posts',sourceEntityId:'acct_opaque'};
 const request={...scope,expectedRevision:0,evidenceId:'event_1',content:'[source] '+JSON.stringify({accountId:'acct_opaque',displayName:'nightfilm',event:'post'}),target:'timeline'};
 await api.writeSource(request);await api.writeSource(request);
 assert.equal(f.reads,0);assert.equal(f.writes,0);assert.equal(f.entries.length,0);assert.equal(f.timeline.length,1);
 assert.equal(f.timeline[0].summary,request.content);
 assert.deepEqual(f.timeline[0].provenance,{sources:[{sourceKind:'custom_app',sourceAppId:app.id,...scope,revision:0}],mixed:false});
 await assert.rejects(api.writeSource({...request,content:'conflict'}),/Evidence id conflict/);
 await assert.rejects(api.writeSource({...request,target:'bad'}),/Invalid source memory target/);
 await assert.rejects(f.api({...app,permissions:[]}).writeSource(request),/Permission denied/);
 const invalid=await api.invalidateSource(scope);assert.equal(invalid.revision,1);assert.equal(f.activeTimeline(app,scope).length,0);
 await assert.rejects(api.writeSource(request),/Stale memory source revision/);
 await api.writeSource({...request,expectedRevision:1});assert.equal(f.activeTimeline(app,scope).length,1);assert.equal(f.writes,0);
 const other=f.api({...app,id:'ordinary.app'});
 await other.writeSource({...scope,expectedRevision:0,evidenceId:'ordinary',content:'ordinary long-term',timeline:true});
 assert.equal(f.entries.length,1);assert.equal(f.entries[0].type,'long_term');assert.equal(f.entries[0].provenance.sources[0].sourceAppId,'ordinary.app');
 assert.equal(f.timeline.filter(e=>e.appId==='ordinary.app').length,1);
 await other.writeSource({...scope,expectedRevision:0,evidenceId:'ordinary',content:'ordinary long-term',timeline:true});assert.equal(f.entries.length,1);
 assert.equal((await other.searchSource(scope)).entries.length,1);
 await other.writeSource({...scope,expectedRevision:0,evidenceId:'ordinary_2',content:'default long-term'});
 assert.equal(f.entries.length,2);assert.equal(f.timeline.filter(e=>e.appId==='ordinary.app').length,1);
 console.log('PASS timeline-only Host: no long-term reads/writes, provenance, dedupe, permissions, revision invalidation; ordinary App defaults unchanged');
}
