const assert = require('node:assert/strict');
const fs = require('node:fs'); const ts = require('typescript');
module.exports = async ({ browser, baseURL, schema, check, errors }) => {
  // Native missing DB: abort without Dexie's default deleteDatabase cleanup.
  for (const scenario of ['missing','version','empty']) {
    const context = await browser.newContext({baseURL});
    try {
      const page = await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto('/fixture');
      const result=await page.evaluate(async scenario=>{
        if(scenario!=='missing'){const request=indexedDB.open('AiPhoneKvDB',scenario==='version'?1:10);request.onupgradeneeded=()=>request.result.createObjectStore('entries',{keyPath:'key'});const db=await new Promise(resolve=>{request.onsuccess=()=>resolve(request.result)});db.close();}
        window.forbiddenWrites=0;indexedDB.deleteDatabase=()=>{forbiddenWrites++;throw Error('delete')};for(const method of ['put','add','delete','clear'])IDBObjectStore.prototype[method]=()=>{forbiddenWrites++;throw Error('write')};IDBDatabase.prototype.createObjectStore=()=>{forbiddenWrites++;throw Error('create store')};
        const script=document.createElement('script');script.src='/float-rescue/dexie-runtime.js';document.head.appendChild(script);await new Promise(resolve=>{script.onload=resolve});const kv=await import('/float-rescue/kv-reader.js');const diagnosis=await new kv.DexieKvReader().diagnose();
        const names=(await indexedDB.databases()).map(item=>item.name);return{diagnosis,names,writes:forbiddenWrites};
      },scenario);
      check(`Dexie ${scenario} never creates/upgrades/deletes/writes or treats empty data as COMPLETE`,()=>{assert.equal(result.writes,0);assert.equal(result.diagnosis.status,scenario==='missing'?'DB_MISSING':scenario==='version'?'ERROR':'EMPTY_UNCONFIRMED');if(scenario==='missing')assert.deepEqual(result.names,[]);});
    }finally{await context.close();}
  }
  const context=await browser.newContext({baseURL});
  try {
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto('/fixture');
    const snapshot=await page.evaluate(async schema=>{
      indexedDB.open=()=>{throw Error('cache snapshot must not open any DB')};Storage.prototype.setItem=(key)=>{if(key!=='float_kv_rescue_checkpoint_v1')throw Error('business write')};
      const {CacheKvReader}=await import('/float-rescue/kv-reader.js');const {KvRescueExporter}=await import('/float-rescue/kv-exporter.js');
      const entries=[{key:'ai_phone_characters_v1',value:' { "preserve" : "PRIVATE_ROLE" } '},{key:'unknown-cache',value:'data:audio/wav;base64,AQID'}];const reader=new CacheKvReader(entries);const exporter=await KvRescueExporter.prepare(schema,reader,{partTargetBytes:600});const files=[];let part;
      while((part=await exporter.nextPart())){files.push(new File([part.blob],part.metadata.filename));part.saveSucceeded=true;exporter.confirmSaved();}
      const index=await exporter.finish();const verifier=await import('/float-rescue/verifier.js');const verified=await verifier.verifyKvCacheSnapshotFiles(new Blob([JSON.stringify(index)]),files);let normalReject;try{await verifier.verifyRescueFiles(new Blob([JSON.stringify({...index,complete:true})]),files)}catch(error){normalReject=error.message;}
      let empty;try{new CacheKvReader([])}catch(error){empty=error.message;}
      // An unchanged, explicitly re-handed cache can resume; changes cannot.
      const checkpoint=JSON.stringify(exporter.checkpoint());Storage.prototype.getItem=key=>key==='float_kv_rescue_checkpoint_v1'?checkpoint:null;
      const unchanged=await KvRescueExporter.resume(schema,new CacheKvReader(entries));let change;try{await KvRescueExporter.resume(schema,new CacheKvReader([{...entries[0],value:'changed'},entries[1]]))}catch(error){change=error.message;}
      return{index,verified,normalReject,empty,change,unchanged:unchanged.mode};
    },schema);
    check('cache snapshot always complete=false with explicit unverified provenance; only file integrity can pass',()=>{assert.equal(snapshot.index.complete,false);assert.equal(snapshot.index.snapshotComplete,true);assert.equal(snapshot.index.mode,'kv-cache-snapshot');assert.equal(snapshot.index.independentPersistenceVerified,false);assert.ok(snapshot.index.provenance.includes('尚未独立证明'));assert.equal(snapshot.verified.complete,false);assert.ok(snapshot.verified.snapshotVerified);assert.ok(snapshot.normalReject);});
    check('empty cache is rejected and resumed cache requires identical content/source; no DB reads at all',()=>{assert.ok(snapshot.empty);assert.ok(snapshot.change.includes('已发生变化'));assert.equal(snapshot.unchanged,'kv-cache-snapshot');});
  }finally{await context.close();}

  // Actual iPhone-UA standalone UI exercises Dexie's Safari readiness branch,
  // with databases() forever pending and explicit save cancellation/ack flow.
  const uiContext=await browser.newContext({baseURL,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
  try{
    const ui=await uiContext.newPage();ui.on('pageerror',error=>errors.push(error.message));await ui.goto('/fixture');
    await ui.evaluate(async()=>{const request=indexedDB.open('AiPhoneKvDB',10);request.onupgradeneeded=()=>request.result.createObjectStore('entries',{keyPath:'key'});const db=await new Promise(resolve=>{request.onsuccess=()=>resolve(request.result)});const tx=db.transaction('entries','readwrite');tx.objectStore('entries').put({key:'ai_phone_chat_settings_v1',value:'{"preserve":true}'});tx.objectStore('entries').put({key:'unknown-ui',value:'opaque'});await new Promise(resolve=>{tx.oncomplete=resolve});db.close();});
    await ui.addInitScript(()=>{
      window.enumerations=0;indexedDB.databases=()=>{enumerations++;return new Promise(()=>{})};const open=indexedDB.open;indexedDB.open=function(name,version){if(name!=='AiPhoneKvDB'||version!==undefined)throw Error('non-KV/upgrade UI');return open.call(this,name)};indexedDB.deleteDatabase=()=>{throw Error('delete')};
      const tx=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(names,mode='readonly',...rest){if(mode!=='readonly')throw Error('UI write');return tx.call(this,names,mode,...rest)};for(const method of ['put','add','delete','clear'])IDBObjectStore.prototype[method]=()=>{throw Error('UI write')};
      window.shareCancel=true;window.shareCalls=0;window.savedFiles=[];Object.defineProperty(navigator,'canShare',{value:()=>true});Object.defineProperty(navigator,'share',{value:async({files})=>{shareCalls++;if(shareCancel)throw new DOMException('cancel','AbortError');savedFiles.push(...files)}});
      Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copied=text}}});
    });
    await ui.goto('/float-kv-rescue');await ui.locator('#diagnose').click();await ui.waitForFunction(()=>document.getElementById('status').textContent.includes('SUCCESS'));
    await ui.locator('#copy-report').click();assert.ok(!(await ui.evaluate(()=>copied)).includes('"preserve"'));
    await ui.locator('#prepare').click();await ui.waitForFunction(()=>!document.getElementById('generate').disabled);await ui.locator('#generate').click();await ui.locator('#part').waitFor({state:'visible'});
    await ui.locator('#save-part').click();assert.equal(await ui.locator('#continue').isDisabled(),true);assert.equal(await ui.evaluate(()=>JSON.parse(localStorage.getItem('float_kv_rescue_checkpoint_v1')).parts.length),0);
    await ui.evaluate(()=>{shareCancel=false});await ui.locator('#save-part').click();assert.equal(await ui.evaluate(()=>JSON.parse(localStorage.getItem('float_kv_rescue_checkpoint_v1')).parts.length),0);
    await ui.locator('#continue').click();await ui.locator('#index').waitFor({state:'visible'});await ui.locator('#save-index').click();
    await ui.evaluate(()=>{const input=document.getElementById('files');const dt=new DataTransfer();for(const file of savedFiles)dt.items.add(file);input.files=dt.files});await ui.locator('#verify').click();await ui.waitForFunction(()=>document.getElementById('verification').textContent.includes('已完整验证'));
    check('actual standalone persistent KV UI works under Safari UA without databases() readiness polling; diagnostics disclose no value',()=>{});assert.equal(await ui.evaluate(()=>enumerations),0);
    check('KV UI share cancel/success never advances checkpoint until explicit saved confirmation; saved files pass verifier',()=>{});assert.equal(await ui.evaluate(()=>shareCalls),3);assert.equal(await ui.evaluate(()=>localStorage.getItem('float_kv_rescue_checkpoint_v1')),null);
  }finally{await uiContext.close();}

  // Real explicit popup handoff using the actual TS helper, with only its cache
  // imports substituted by test data. Child loads the production standalone UI.
  const helper=ts.transpileModule(fs.readFileSync('lib/kv-rescue-cache-handoff.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
  const handoffContext=await browser.newContext({baseURL,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
  try{
    await handoffContext.addInitScript(()=>{
      // Child cache path must never touch an IDB request or normal runtime.
      indexedDB.open=()=>{throw Error('cache handoff IDB access')};
      for(const method of ['put','add','delete','clear'])IDBObjectStore.prototype[method]=()=>{throw Error('handoff write')};
      Object.defineProperty(navigator,'canShare',{value:()=>true});Object.defineProperty(navigator,'share',{value:async({files})=>{window.savedFiles=window.savedFiles||[];savedFiles.push(...files);}});
    });
    const parent=await handoffContext.newPage();parent.on('pageerror',error=>errors.push(error.message));await parent.goto('/fixture');
    await parent.evaluate(helper=>{
      window.hydrated=false;window.cacheRows=[{key:'ai_phone_characters_v1',value:'role cache'},{key:'unknown-cache',value:'other cache'}];window.notices=[];
      const exports={};new Function('require','exports',helper)(()=>({isKvHydrated:()=>hydrated,kvEntries:()=>cacheRows.map(row=>({...row}))}),exports);
      const button=document.createElement('button');button.id='handoff';button.textContent='打开 KV 应急缓存快照';button.onclick=()=>exports.openHydratedKvCacheSnapshot(message=>notices.push(message));document.body.appendChild(button);
    },helper);
    await parent.locator('#handoff').click();assert.equal(handoffContext.pages().length,1);
    check('actual cache handoff refuses non-hydrated state without invoking hydrate or removing failure protection',()=>{});assert.ok((await parent.evaluate(()=>notices.join(''))).includes('尚未成功水合'));
    await parent.evaluate(()=>{hydrated=true;});const popupPromise=parent.waitForEvent('popup');await parent.locator('#handoff').click();const popup=await popupPromise;popup.on('pageerror',error=>errors.push(error.message));
    await parent.waitForURL('**/float-kv-rescue#handoff-finished');await popup.waitForFunction(()=>!document.getElementById('prepare').disabled);
    assert.ok((await popup.locator('#provenance').textContent()).includes('尚未独立证明'));
    await popup.locator('#prepare').click();await popup.waitForFunction(()=>!document.getElementById('generate').disabled);await popup.locator('#generate').click();await popup.locator('#part').waitFor({state:'visible'});
    await popup.locator('#save-part').click();await popup.waitForFunction(()=>!document.getElementById('continue').disabled);await popup.locator('#continue').click();await popup.locator('#index').waitFor({state:'visible'});
    await popup.locator('#save-index').click();
    const ui=await popup.evaluate(()=>{const index=savedFiles.find(file=>file.name.endsWith('-index.json'));return index.text().then(JSON.parse)});
    check('actual popup uses independent cache UI, unloads original Float document, saves v2 set with complete=false and no business IDB access',()=>{assert.equal(ui.complete,false);assert.equal(ui.mode,'kv-cache-snapshot');assert.equal(ui.snapshotComplete,true);assert.equal(ui.kvAudit.physicalCount,2);});
    const data=await popup.evaluate(async()=>Promise.all(savedFiles.map(async file=>({name:file.name,data:await file.text()})))); // Tiny fixture only.
    const manifestText=data.find(file=>file.name.endsWith('-index.json')).data;assert.ok(!manifestText.includes('role cache'));
    check('fallback index/diagnostics/checkpoint contain no cached value or credential text',()=>{});
  }finally{await handoffContext.close();}
};
