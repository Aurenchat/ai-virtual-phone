const assert = require('node:assert/strict');
const fs = require('node:fs'); const ts = require('typescript');
// Runs against actual browser IndexedDB/Dexie and the existing v2 importer.
module.exports = async ({ browser, baseURL, schema, check, snapshot, savedParts }) => {
  const errors = []; const unexpectedRequests = [];
  const context = await browser.newContext({ baseURL }); const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => { const request = route.request(); if (request.method() !== 'GET' || new URL(request.url()).origin !== baseURL) { unexpectedRequests.push(request.url()); return route.abort(); } return route.continue(); });
  const dexieInstalled = fs.readFileSync(require.resolve('dexie/dist/dexie.min.js'), 'utf8').replace(/\/\/# sourceMappingURL=.*$/m, '');
  check('standalone vendor is exactly the installed project Dexie distribution, not a second library version', () => assert.ok(fs.readFileSync('public/float-rescue/dexie-runtime.js','utf8').endsWith(dexieInstalled)));
  check('standalone KV modules never import kv-db/hydration/plugins/normal runtime; original four probes unchanged', () => {
    for (const file of ['kv-reader.js','kv-exporter.js','kv-page.js']) assert.ok(!/from\s+['"][^'"]*(?:kv-db|chat-storage|plugin)/.test(fs.readFileSync('public/float-rescue/' + file, 'utf8')));
    assert.ok(!/hydrateKvDb\(/.test(fs.readFileSync('lib/kv-rescue-cache-handoff.ts','utf8')));
  });
  async function seed(target) {
    await target.goto('/fixture');
    return target.evaluate(async schema => {
      const rows = new Map();
      for (const module of schema.modules) for (const source of module.sources.filter(source => source.type === 'kv')) {
        for (const key of source.keys || []) rows.set(key, JSON.stringify({ original: true, key, value: '私密配置' }));
        for (const prefix of source.prefixes || []) for (let n = 0; n < 2; n++) rows.set(prefix + 'dynamic-' + n, 'dynamic preserved ' + n);
      }
      rows.set('unknown-z', 'unclassified exact value'); rows.set('unknown-a', 'escape: "\\\n\t\ud800\udfff');
      rows.set('ai_phone_cloud_backup_state_v1', 'intentional excluded run state');
      rows.set('ai_phone_cloud_backup_config_v1', '{ "credential" : "PRIVATE_CLOUD_KEY" }');
      rows.set('ai_phone_wallet_state_v1', '{ "cards" : [], "transactions" : [], "paymentLedger" : { "version":1,"records":{},"drafts":{} } }');
      rows.set('ai_phone_custom_app_data_v1:large', ' {  "audio" : "data:audio/wav;base64,' + 'AQID'.repeat(3300000) + '", "spaces" : true } ');
      rows.set('unknown-medium', 'data:image/png;base64,' + 'BAUG'.repeat(550000));
      const request = indexedDB.open('AiPhoneKvDB', 10); request.onupgradeneeded = () => request.result.createObjectStore('entries', { keyPath: 'key' });
      const db = await new Promise(resolve => { request.onsuccess = () => resolve(request.result); }); const tx = db.transaction('entries','readwrite');
      for (const [key, value] of rows) tx.objectStore('entries').put({ key, value }); await new Promise(resolve => { tx.oncomplete = resolve; }); db.close();
      return { count: rows.size };
    }, schema);
  }
  async function guards(target) {
    await target.evaluate(() => {
      window.kvAudit = { writes: 0, opens: [], maxRows: 0, maxKeys: 0, maxJson: 0, maxHash: 0, maxRead: 0, pending: 0, enumerations: 0 };
      indexedDB.databases = () => { kvAudit.enumerations++; return new Promise(() => {}); };
      const open = indexedDB.open; indexedDB.open = function(name, version) { kvAudit.opens.push({ name, version }); if (name !== 'AiPhoneKvDB' || version !== undefined) throw Error('non-KV DB or version upgrade forbidden'); return open.call(this, name); };
      indexedDB.deleteDatabase = () => { kvAudit.writes++; throw Error('delete DB forbidden'); };
      for (const method of ['put','add','delete','clear']) IDBObjectStore.prototype[method] = () => { kvAudit.writes++; throw Error('business write'); };
      const tx = IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction = function(names, mode = 'readonly', ...rest) { if (mode !== 'readonly') { kvAudit.writes++; throw Error('business write tx'); } return tx.call(this,names,mode,...rest); };
      IDBObjectStore.prototype.getAll = () => { throw Error('whole value array forbidden'); };
      const keys = IDBObjectStore.prototype.getAllKeys; IDBObjectStore.prototype.getAllKeys = function(range, count) { if (!count || count > 32) throw Error('unbounded keys'); kvAudit.maxKeys = Math.max(kvAudit.maxKeys,count); return keys.call(this,range,count); };
      const array = Blob.prototype.arrayBuffer; Blob.prototype.arrayBuffer = function() { kvAudit.maxRead = Math.max(kvAudit.maxRead,this.size); if (this.size > 1024*1024) throw Error('unbounded read'); return array.call(this); };
      window.atob = () => { throw Error('KV raw string export must not decode/duplicate media'); };
      const set = Storage.prototype.setItem; const remove = Storage.prototype.removeItem;
      Storage.prototype.setItem = function(key,value) { if (key !== 'float_kv_rescue_checkpoint_v1') throw Error('business LS write'); return set.call(this,key,value); };
      Storage.prototype.removeItem = function(key) { if (key !== 'float_kv_rescue_checkpoint_v1') throw Error('business LS deletion'); return remove.call(this,key); };
      window.kvProbe = (kind,value) => {
        if (kind === 'batch') { kvAudit.maxRows = Math.max(kvAudit.maxRows,value.rows); if (value.rows > 1) throw Error('more than one KV value'); }
        if (kind === 'kvJsonChunkChars') { kvAudit.maxJson = Math.max(kvAudit.maxJson,value); if (value > 65536) throw Error('unbounded stringify'); }
        if (kind === 'kvHashChunkBytes') { kvAudit.maxHash = Math.max(kvAudit.maxHash,value); if (value > 131072) throw Error('unbounded hash'); }
        if (kind === 'readChunkBytes' && value > 1024*1024) throw Error('unbounded zip/hash/CRC');
        if (kind === 'pendingParts') { kvAudit.pending = Math.max(kvAudit.pending,value); if (value > 1) throw Error('multiple pending'); }
      };
    });
  }
  async function load(target) { await target.addScriptTag({ url: '/float-rescue/dexie-runtime.js' }); await target.evaluate(async () => { window.kv = await import('/float-rescue/kv-reader.js'); window.core = await import('/float-rescue/kv-exporter.js'); }); }
  async function transfer(parts) {
    for (let i = 0; i < parts.length; i++) {
      const chunks = [];
      for (let offset = 0; offset < parts[i].bytes; offset += 1024*1024) {
        const base64 = await page.evaluate(async ({i,offset}) => { const bytes = new Uint8Array(await kvParts[i].blob.slice(offset,offset+1024*1024).arrayBuffer()); let binary=''; for(let n=0;n<bytes.length;n+=32768) binary += String.fromCharCode(...bytes.subarray(n,n+32768)); return btoa(binary); },{i,offset}); chunks.push(Buffer.from(base64,'base64'));
      } savedParts.set('/saved/'+parts[i].filename,Buffer.concat(chunks));
    }
  }
  try {
    const seeded = await seed(page); const before = await snapshot(page,['AiPhoneKvDB']); delete before.localStorage;
    before.AiPhoneKvDB.entries = before.AiPhoneKvDB.entries.filter(row => row.key !== 'ai_phone_cloud_backup_state_v1');
    await guards(page); await load(page);
    const diagnosis = await page.evaluate(() => new kv.DexieKvReader().diagnose());
    check('real installed Dexie bounded primary/one-row diagnostic waits for readonly transaction complete', () => { assert.equal(diagnosis.status,'SUCCESS'); assert.equal(diagnosis.rowCount,1); assert.ok(diagnosis.events.some(event => event.lastStage === 'TX_COMPLETE')); assert.ok(!JSON.stringify(diagnosis).includes('PRIVATE')); });
    const start = await page.evaluate(async schema => {
      window.kvParts=[]; window.kvExporter = await core.KvRescueExporter.prepare(schema,new kv.DexieKvReader(),{partTargetBytes:1024*1024,probe:kvProbe}); kvExporter.persist();
      const part = await kvExporter.nextPart(); kvParts.push({blob:part.blob,metadata:part.metadata}); part.saveSucceeded=true; kvExporter.confirmSaved();
      return { audit:kvExporter.audit, parts:kvParts.map(part=>part.metadata), checkpoint:core.KvRescueExporter.readCheckpoint() };
    },schema);
    check('KV physical coverage reconciles all canonical sources, unknown/prefix keys and cloud credential source 999; explicit state exclusion', () => { assert.equal(start.audit.physicalCount,seeded.count); assert.equal(start.audit.excluded.length,1); assert.equal(start.audit.excluded[0].key,'ai_phone_cloud_backup_state_v1'); assert.equal(start.audit.inventory.reduce((sum,task)=>sum+task.count,0),seeded.count-1); assert.equal(start.audit.inventory.find(task=>task.moduleId==='settings' && task.sourceIndex===999).count,1); for(const task of start.audit.inventory) assert.deepEqual(task.source,schema.modules.find(module=>module.id===task.moduleId).sources.find(source=>source.sourceIndex===task.sourceIndex)); });
    check('KV checkpoint contains bounded cursor/hashes/counts, no values/media/credentials and uses separate key', () => { assert.equal(start.checkpoint.mode,'kv-only'); assert.ok(!JSON.stringify(start.checkpoint).includes('PRIVATE') && !JSON.stringify(start.checkpoint).includes('data:audio')); assert.ok(Object.values(start.checkpoint.state.fingerprints).every(value=>/^[a-f0-9]{64}$/.test(value))); });
    await transfer(start.parts); await page.reload(); await guards(page); await load(page);
    const completed = await page.evaluate(async schema => {
      const exporter = await core.KvRescueExporter.resume(schema,new kv.DexieKvReader(),{probe:kvProbe}); window.kvParts=[]; let part;
      while ((part=await exporter.nextPart())) { kvParts.push({blob:part.blob,metadata:part.metadata}); part.saveSucceeded=true; exporter.confirmSaved(); }
      const index=await exporter.finish(); exporter.reader.close(); return {index,parts:kvParts.map(part=>part.metadata),audit:kvAudit};
    },schema);
    await transfer(completed.parts);
    check('KV-only reload resume/finish reconciles count AND exact content fingerprints with zero other DB access/writes/enumeration', () => { assert.ok(completed.index.complete); assert.equal(completed.index.mode,'kv-only'); assert.ok(completed.index.totalParts>=4); assert.equal(completed.audit.writes,0); assert.equal(completed.audit.enumerations,0); assert.ok(completed.audit.opens.every(open=>open.name==='AiPhoneKvDB' && open.version===undefined)); });
    check('large inline KV string is streamed losslessly: row cap 1, 64Ki JSON, 128Ki fingerprint, 1Mi ZIP reads, one pending part', () => { assert.equal(completed.audit.maxRows,1); assert.ok(completed.audit.maxJson<=65536 && completed.audit.maxHash<=131072 && completed.audit.maxRead<=1024*1024 && completed.audit.pending===1); });
    const verified = await page.evaluate(async index => { indexedDB.open=()=>{throw Error('verifier DB access')}; const {verifyRescueFiles}=await import('/float-rescue/verifier.js'); const files=[]; for(const part of index.parts) files.push(new File([await(await fetch('/saved/'+part.filename)).blob()],part.filename)); return verifyRescueFiles(new Blob([JSON.stringify(index)]),files); },completed.index);
    check('KV set verifier checks all part hashes/manifests/source counts/physical coverage without DB access',()=>assert.ok(verified.complete));
    const restoredContext=await browser.newContext({baseURL});
    try {
      const restored=await restoredContext.newPage(); restored.on('pageerror',error=>errors.push(error.message)); await restored.goto('/restore'); await restored.waitForFunction(()=>!!window.rescueRestore);
      const result=await restored.evaluate(async index=>{
        for(const name of ['AiPhoneChatDB','AiPhoneMediaCacheDB','AiPhoneStoryDB']) { const request=indexedDB.open(name);request.onupgradeneeded=()=>request.result.createObjectStore('sentinel',{keyPath:'id'});const db=await new Promise(resolve=>{request.onsuccess=()=>resolve(request.result)});const tx=db.transaction('sentinel','readwrite');tx.objectStore('sentinel').put({id:'keep',value:'non-KV preserved'});await new Promise(resolve=>{tx.oncomplete=resolve});db.close(); }
        localStorage.setItem('non-kv-sentinel','unchanged'); await rescueRestore.hydrateKvDb(); const tx=IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction=function(names,mode='readonly',...rest){if(this.name!=='AiPhoneKvDB' && mode!=='readonly')throw Error('non-KV restore write');return tx.call(this,names,mode,...rest)};
        const results=[];const identities=[];const keys=[];
        for(const part of index.parts.slice().reverse()){const blob=await(await fetch('/saved/'+part.filename)).blob();const manifest=await rescueRestore.readBackupManifest(blob);if(manifest.rescueSet.mode!=='kv-only')throw Error('wrong manifest');const zip=await rescueRestore.JSZip.loadAsync(blob,{checkCRC32:true});for(const[name,entry]of Object.entries(zip.files))if(!entry.dir&&name.startsWith('modules/')){const payload=JSON.parse(await entry.async('string'));if(payload.sources.some(source=>source.type!=='kv'))throw Error('non-KV payload');identities.push({moduleId:payload.moduleId,sourceIndex:Number(name.split('/')[2].split('-')[0])});keys.push(...payload.sources.flatMap(source=>source.records.map(record=>record.key)));}results.push(await rescueRestore.importBackupBlob(blob,undefined,{overwrite:true}));}
        return{results,identities,keys,local:localStorage.getItem('non-kv-sentinel')};
      },completed.index);
      check('actual importer restores every KV v2 part in reverse order, preserving sourceIndex and no duplicated/missing keys',()=>{assert.ok(result.results.every(result=>result.errors.length===0),JSON.stringify(result.results.map(result=>result.errors)));assert.equal(result.keys.length,seeded.count-1);assert.equal(new Set(result.keys).size,result.keys.length);assert.ok(result.identities.every(identity=>schema.modules.find(module=>module.id===identity.moduleId).sources.some(source=>source.type==='kv'&&source.sourceIndex===identity.sourceIndex)));});
      const after=await snapshot(restored,['AiPhoneKvDB']);delete after.localStorage;
      check('every restored KV value equals original string including 12+Mi inline media, whitespace/escapes, secrets, dynamic and unknown keys',()=>assert.deepEqual(after,before));
      const other=await snapshot(restored,['AiPhoneChatDB','AiPhoneMediaCacheDB','AiPhoneStoryDB']);
      check('KV-only importer never overwrites previous chat/media/other DB data or localStorage sentinel',()=>{assert.equal(result.local,'unchanged');for(const name of ['AiPhoneChatDB','AiPhoneMediaCacheDB','AiPhoneStoryDB'])assert.deepEqual(other[name].sentinel,[{id:'keep',value:'non-KV preserved'}]);});
    }finally{await restoredContext.close();}

    // Diagnostic timeouts and schema mismatch, including old Safari readiness.
    await page.reload(); await load(page);
    const faults=await page.evaluate(async()=>{
      const get=IDBObjectStore.prototype.get; const keys=IDBObjectStore.prototype.getAllKeys;const cursor=IDBObjectStore.prototype.openCursor;const timer=setTimeout;window.setTimeout=(fn,ms,...rest)=>timer(fn,ms===15000?50:ms,...rest);
      try{
        IDBObjectStore.prototype.getAllKeys=()=>({});IDBObjectStore.prototype.openCursor=()=>({});const keyTimeout=await new kv.DexieKvReader().diagnose();IDBObjectStore.prototype.getAllKeys=keys;IDBObjectStore.prototype.openCursor=cursor;
        IDBObjectStore.prototype.get=()=>({});const rowTimeout=await new kv.DexieKvReader().diagnose();IDBObjectStore.prototype.get=get;
        const invalid=new kv.CacheKvReader([{key:'x',value:'x'}]);let large;try{kv.validateRow({key:'large',value:'x'.repeat(32*1024*1024+1)})}catch(error){large=error.message}invalid.close();
        return{keyTimeout,rowTimeout,large};
      }finally{window.setTimeout=timer;IDBObjectStore.prototype.get=get;IDBObjectStore.prototype.getAllKeys=keys;IDBObjectStore.prototype.openCursor=cursor;}
    });
    check('Dexie pending primary/row requests time out with request/transaction stages, never a confirmed empty DB',()=>{assert.equal(faults.keyTimeout.status,'TIMEOUT');assert.ok(faults.keyTimeout.events.some(event=>event.lastStage==='REQUEST_ISSUED'));assert.equal(faults.rowTimeout.status,'TIMEOUT');assert.equal(faults.rowTimeout.step,'READ_ROW');});
    check('single giant value is explicitly stopped, never omitted or marked COMPLETE',()=>assert.ok(faults.large.includes('32 Mi')));

    // Same-count mutation invalidates resume and final reconciliation.
    const changing=await browser.newContext({baseURL});try{
      const target=await changing.newPage();await seed(target);await load(target);
      const changed=await target.evaluate(async schema=>{
        const exporter=await core.KvRescueExporter.prepare(schema,new kv.DexieKvReader(),{partTargetBytes:1024*1024});exporter.persist();const part=await exporter.nextPart();part.saveSucceeded=true;exporter.confirmSaved();exporter.reader.close();
        const request=indexedDB.open('AiPhoneKvDB');const db=await new Promise(resolve=>{request.onsuccess=()=>resolve(request.result)});const tx=db.transaction('entries','readwrite');tx.objectStore('entries').put({key:'unknown-z',value:'same count different value'});await new Promise(resolve=>{tx.oncomplete=resolve});db.close();let error;const reader=new kv.DexieKvReader();try{await core.KvRescueExporter.resume(schema,reader)}catch(failure){error=failure.message}finally{reader.close()}
        const fresh=await core.KvRescueExporter.prepare(schema,new kv.DexieKvReader(),{partTargetBytes:1024*1024});let next;while((next=await fresh.nextPart())){next.saveSucceeded=true;fresh.confirmSaved();}
        const changeRequest=indexedDB.open('AiPhoneKvDB');const changeDb=await new Promise(resolve=>{changeRequest.onsuccess=()=>resolve(changeRequest.result)});const changeTx=changeDb.transaction('entries','readwrite');changeTx.objectStore('entries').put({key:'unknown-z',value:'changed again before finish'});await new Promise(resolve=>{changeTx.oncomplete=resolve});changeDb.close();const index=await fresh.finish();fresh.reader.close();
        return{error,index};
      },schema);
      check('resume detects value changes even when physical/source counts are unchanged',()=>assert.ok(changed.error.includes('已发生变化')));
      check('finish refuses COMPLETE if any value changes after all parts are saved, even with unchanged counts',()=>assert.equal(changed.index.complete,false));
    }finally{await changing.close();}
    await require('./kv-cache-scenarios.cjs')({browser,baseURL,schema,check,errors});
    check('KV rescue has no browser errors or backup network upload',()=>{assert.deepEqual(errors,[]);assert.deepEqual(unexpectedRequests,[])});
  }finally{await context.close();}
};
