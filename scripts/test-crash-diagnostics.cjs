// Disposable VM documents and synthetic records only; never opens user databases.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), cp = require('node:child_process'), ts = require('typescript');
const {performance}=require('node:perf_hooks');
const compile = s => ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const bootstrapExports={};
vm.runInNewContext(compile(fs.readFileSync('lib/crash-diagnostics-bootstrap.ts','utf8')),{exports:bootstrapExports});
const code=bootstrapExports.crashDiagnosticsScript('test-build');
const prefix='float:crashdiag:v1:';
const keys={current:prefix+'current',history:prefix+'history',suspect:prefix+'suspect',enabled:prefix+'enabled'};
const A='1791580000000-abc', B='bg_1791580000000_xyz';
let checks=0,clock=1791580000000;
const check=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const plain=x=>JSON.parse(JSON.stringify(x));
class Clock extends Date {constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
function boot(records=new Map(), build='test-build', options={}){
    const writes=[], removals=[], reads=[], wl=new Map(),dl=new Map();
    let failure=options.failure;
    const storage={getItem(k){reads.push(k);if(failure==='get')throw Error('private');return records.get(k)??null;},
        setItem(k,v){if(failure==='set')throw Error('quota');writes.push({key:k,value:v});records.set(k,v);},
        removeItem(k){if(failure)throw Error('private');removals.push(k);records.delete(k);}};
    const add=(map,k,fn)=>{map.set(k,[...(map.get(k)||[]),fn]);};
    const document={visibilityState:'visible',addEventListener:(k,fn)=>add(dl,k,fn)};
    const window={localStorage:storage,addEventListener:(k,fn)=>add(wl,k,fn)};
    const forbidden=()=>{throw Error('forbidden API');};
    const context=vm.createContext({window,document,localStorage:storage,exports:{},Date:Clock,Math,console,
        fetch:forbidden,indexedDB:new Proxy({},{get:forbidden}),setTimeout:forbidden,setInterval:forbidden,requestAnimationFrame:forbidden,Blob:forbidden});
    vm.runInContext(bootstrapExports.crashDiagnosticsScript(build,options.defaultEnabled??true),context);
    const bridge=window.__FLOAT_CRASH_DIAG_INTERNAL_V1__;
    const fire=(kind,event={})=>{for(const fn of wl.get(kind)||dl.get(kind)||[])fn(event);};
    vm.runInContext(compile(fs.readFileSync('lib/crash-diagnostics.ts','utf8')),context);
    return {records,writes,removals,reads,context,window,document,bridge,api:context.exports,fire,
        snapshot:()=>plain(bridge.read()),fail:v=>{failure=v;},crashWrites:()=>writes.filter(w=>w.key.startsWith(prefix))};
}
const record=(runId,source,stage)=>({version:1,runId,source,lastStage:stage,startedAt:clock,lastStageAt:clock+1,
    completed:false,historyCount:6906,draftCount:3,publishedCount:1,sessionId:'PRIVATE-SESSION',prompt:'PRIVATE-PROMPT',response:'PRIVATE-BODY'});
function actualGeneration(b){
    const exports={}; const ctx=vm.createContext({...b.context,exports,window:b.window,localStorage:b.window.localStorage,Date:Clock,Math});
    vm.runInContext(compile(fs.readFileSync('lib/chat-generation-diagnostics.ts','utf8')),ctx);
    return exports;
}
let b=boot();
check('early bootstrap is idempotent; no extra session or listeners',()=>{
    const id=b.snapshot().current.documentId,w=b.writes.length;
    vm.runInContext(code,b.context);
    assert.equal(b.snapshot().current.documentId,id);assert.equal(b.writes.length,w);
});
check('app category dedupes and refuses private app names',()=>{
    b.bridge.app('chat');const w=b.writes.length;b.bridge.app('chat');b.bridge.app('PRIVATE-CHARACTER');
    assert.equal(b.writes.length,w);assert.equal(b.snapshot().current.app,'chat');
});
const g=actualGeneration(b), before=b.crashWrites().length;
g.startGenerationDiagnostic(A,'PRIVATE-SESSION',false);
g.startGenerationDiagnostic(B,'PRIVATE-OTHER',false,'background');
for(let i=0;i<100;i++)g.markGenerationDiagnostic(A,'API_FIRST_DELTA');
g.markGenerationDiagnostic(B,'STAGGER_WAIT_BEGIN',{},3,1);
check('actual front/background starts add two P0 writes; stages add none',()=>{
    assert.equal(b.crashWrites().length-before,2);
    assert.deepEqual(b.snapshot().current.activeGenerationRunIds,[A,B]);
});
const oldDocument=b.snapshot().current.documentId;clock+=500;
let next=boot(b.records,'different-build');
check('restart freezes correct old run stages, deduping CURRENT/PREVIOUS/slots',()=>{
    const old=next.snapshot().history.at(-1);
    assert.equal(old.documentId,oldDocument);assert.equal(old.buildId,'test-build');
    assert.equal(old.evidence,'UNOBSERVED_FOREGROUND_END');assert.equal(old.systemTerminationReason,'unknown');
    assert.equal(old.generationSnapshots.length,2);
    assert.equal(old.generationSnapshots.find(r=>r.runId===B).lastStage,'STAGGER_WAIT_BEGIN');
    assert.equal(old.generationSnapshots.find(r=>r.runId===B).source,'background');
    assert.equal(old.generationSnapshots.find(r=>r.runId===A).lastStage,'API_FIRST_DELTA');
    b.records.set('ai_phone_chat_generation_diag_slot_0_v1',JSON.stringify(record(A,'chatroom','GEN_FINALLY')));
    assert.equal(next.snapshot().history.at(-1).generationSnapshots.find(r=>r.runId===A).lastStage,'API_FIRST_DELTA');
});
check('old document cannot overwrite a newer document current',()=>{
    const writes=b.crashWrites().length;b.bridge.app('characters');assert.equal(b.crashWrites().length,writes);
    assert.notEqual(next.snapshot().current.documentId,oldDocument);
});
const frozen=next.snapshot().suspect.documentId;
for(let i=0;i<14;i++){next.fire('pagehide',{persisted:false});clock+=500;next=boot(next.records,'build-'+i);}
check('14 ordinary restarts keep last suspect independently; history max eight',()=>{
    assert.equal(next.snapshot().history.length,8);assert.equal(next.snapshot().suspect.documentId,frozen);
    assert.equal(next.snapshot().history.at(-1).evidence,'PAGEHIDE_OBSERVED');
});
check('stale/clock-regressed visible records are UNKNOWN',()=>{
    const c=boot();clock+=31*60*1000;assert.equal(boot(c.records).snapshot().history.at(-1).evidence,'UNKNOWN');
    const d=boot();clock-=1000;assert.equal(boot(d.records).snapshot().history.at(-1).evidence,'UNKNOWN');clock+=1000;
});
check('hidden and resumed/BFCache are facts, never safe-exit proof',()=>{
    const c=boot();c.document.visibilityState='hidden';c.fire('visibilitychange');
    clock+=10;assert.equal(boot(c.records).snapshot().history.at(-1).evidence,'BACKGROUND_OR_SUSPENDED');
    const d=boot();d.document.visibilityState='hidden';d.fire('visibilitychange');d.document.visibilityState='visible';d.fire('visibilitychange');
    d.fire('pagehide',{persisted:true});d.fire('pageshow',{persisted:true});
    assert.equal(d.snapshot().current.pagehideObserved,false);assert.equal(d.snapshot().current.pageshowFromBFCache,true);
    clock+=10;assert.equal(boot(d.records).snapshot().history.at(-1).evidence,'UNOBSERVED_FOREGROUND_END');
});
check('missing run snapshots say not_available; invalid stages never exported',()=>{
    const c=boot();c.bridge.runStart(A,'chatroom');c.records.set('ai_phone_chat_generation_diag_current_v1',JSON.stringify(record(A,'chatroom','PRIVATE-PROMPT')));
    clock+=10;assert.equal(boot(c.records).snapshot().history.at(-1).generationSnapshots[0].status,'not_available');
});
check('actual completion/error/finally removes run IDs with constant two writes',()=>{
    const c=boot(),api=actualGeneration(c);const writes=c.crashWrites().length;
    api.startGenerationDiagnostic(A,'synthetic',false);api.markGenerationDiagnostic(A,'GEN_ERROR',{errorName:'TypeError'});
    api.markGenerationDiagnostic(A,'GEN_FINALLY',{completed:true});api.markGenerationDiagnostic(A,'GEN_FINALLY',{completed:true});
    assert.equal(c.crashWrites().length-writes,2);assert.deepEqual(c.snapshot().current.activeGenerationRunIds,[]);
});
check('eight active runs cap and immutable event ring',()=>{
    const c=boot();
    for(let i=0;i<12;i++)c.bridge.runStart('1791580000000-r'+i,'chatroom');
    assert.equal(c.snapshot().current.activeGenerationRunIds.length,8);
    for(let i=0;i<50;i++)c.bridge.app(i%2?'chat':'desktop');
    assert.equal(c.snapshot().current.recentEvents.length,16);
});
check('disabled default/toggle persists across restart, preserving diagnostics',()=>{
    const c=boot(new Map(),'test-build',{defaultEnabled:false});assert.equal(c.writes.length,0);
    c.bridge.setEnabled(true);c.bridge.app('settings');c.bridge.setEnabled(false);
    const saved=c.records.get(keys.current),writes=c.writes.length;
    c.bridge.app('chat');c.bridge.runStart(A,'chatroom');c.fire('pagehide');assert.equal(c.writes.length,writes);
    const d=boot(c.records);assert.equal(d.snapshot().enabled,false);assert.equal(d.writes.length,0);assert.equal(d.records.get(keys.current),saved);
    d.bridge.setEnabled(true);assert.equal(d.snapshot().enabled,true);assert.equal(d.snapshot().history.at(-1).evidence,'UNKNOWN');
});
check('get/set exceptions and quota failures never propagate or claim success',()=>{
    for(const failure of ['get','set']){
        const c=boot(new Map(),'test-build',{failure});assert.doesNotThrow(()=>{c.bridge.app('chat');c.bridge.setEnabled(true);c.fire('error',{error:new Error('PRIVATE')});c.api.crashDiagnosticsReport();});
        const api=actualGeneration(c);assert.doesNotThrow(()=>{api.startGenerationDiagnostic(A,'x',false);api.markGenerationDiagnostic(A,'GEN_FINALLY',{completed:true});});
    }
    const c=boot(),at=c.snapshot().current.lastRecordedAt;clock+=100;c.fail('set');c.bridge.app('chat');assert.equal(c.snapshot().current.lastRecordedAt,at);
});
check('same-document disabled observation gap and malformed generation metadata cannot suggest a confirmed failure',()=>{
    const c=boot();c.bridge.app('chat');c.bridge.setEnabled(false);c.bridge.setEnabled(true);
    assert.equal(c.snapshot().current.observationGap,true);clock+=10;
    assert.equal(boot(c.records).snapshot().history.at(-1).evidence,'UNKNOWN');
    const d=boot();d.bridge.runStart(A,'chatroom');
    const malformed=record(A,'chatroom','API_BEGIN');delete malformed.lastStageAt;
    d.records.set('ai_phone_chat_generation_diag_current_v1',JSON.stringify(malformed));clock+=10;
    assert.equal(boot(d.records).snapshot().history.at(-1).generationSnapshots[0].status,'not_available');
});
check('throwing P0 boundary callbacks do not change existing generation diagnostics',()=>{
    const c=boot(),api=actualGeneration(c);
    c.window.__FLOAT_CRASH_DIAG_INTERNAL_V1__.runStart=()=>{throw new Error('private');};
    c.window.__FLOAT_CRASH_DIAG_INTERNAL_V1__.runEnd=()=>{throw new Error('private');};
    assert.doesNotThrow(()=>{api.startGenerationDiagnostic(A,'synthetic',false);api.markGenerationDiagnostic(A,'GEN_FINALLY',{completed:true});});
    assert.equal(api.readGenerationDiagnostics().current.completed,true);
});
const secret='PRIVATE_API_KEY https://private.invalid data:image/png;base64,PRIVATE PRIVATE-CHARACTER PRIVATE-PROMPT PRIVATE-BODY';
check('JS error names are whitelisted, count capped, handlers never preventDefault',()=>{
    const c=boot();let prevented=0;
    c.fire('error',{error:{name:'TypeError',message:secret,stack:secret},filename:secret,message:secret,preventDefault(){prevented++;}});
    c.fire('unhandledrejection',{reason:{name:secret,message:secret,stack:secret},preventDefault(){prevented++;}});
    assert.equal(c.snapshot().current.jsErrors.lastName,'OtherError');assert.equal(c.snapshot().current.jsErrors.lastKind,'unhandledrejection');
    for(let i=0;i<100;i++)c.fire('error',{error:new Error(secret)});
    assert.equal(c.snapshot().current.jsErrors.count,8);assert.equal(prevented,0);
    assert.equal(c.crashWrites().length,9);
    assert.ok(!c.api.crashDiagnosticsReport().includes('PRIVATE'));
});
check('input/privacy allowlists and cross-restart report never expose private fields',()=>{
    const c=boot();c.bridge.canvas(true,3,2,1);c.bridge.runStart(A,'chatroom');
    c.records.set('ai_phone_chat_generation_diag_slot_0_v1',JSON.stringify({...record(A,'chatroom','SHORT_TERM_ASSEMBLY_BEGIN'),apiKey:secret,avatar:secret,errorMessage:secret}));
    c.bridge.app(secret);c.bridge.runStart(secret,'chatroom');c.fire('unhandledrejection',{reason:secret});
    clock+=10;const d=boot(c.records);
    const report=d.api.crashDiagnosticsReport();
    for(const word of ['PRIVATE','https://private','data:image','PRIVATE-SESSION'])assert.ok(!report.includes(word),word);
    for(const w of [...c.crashWrites(),...d.crashWrites()])assert.ok(!w.value.includes('PRIVATE'));
    assert.ok(report.includes('startedAtISO')&&report.includes('lastRecordedAtLocal'));
});
check('oversized/corrupt records are rejected, clear touches only independent keys',()=>{
    const c=boot(new Map([[keys.current,'x'.repeat(8193)],[keys.history,'broken-json']]));
    c.records.set('ai_phone_boot_diag_current_v1','protected');c.records.set('business-secret','protected');
    c.bridge.clear();assert.deepEqual(c.removals.sort(),[keys.current,keys.history,keys.suspect].sort());
    assert.equal(c.records.get('business-secret'),'protected');assert.equal(c.records.get('ai_phone_boot_diag_current_v1'),'protected');
});
function gestureFixture(source,c){
    const ast=ts.createSourceFile('character.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX), functions=[];
    const names=['handleCanvasPointerDown','handleCanvasPointerMove','handleCanvasPointerUp','onTouchStart','onTouchMove','onTouchEnd'];
    const visit=node=>{if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))functions.push(node.getText(ast));ts.forEachChild(node,visit);};visit(ast);
    assert.equal(functions.length,names.length);
    let pan={x:0,y:0,zoom:1};const captures=new Set(),ctx={pinchRef:{current:null},placementActive:false,isEditing:true,isEditingRef:{current:true},
        canvasElRef:{current:{getBoundingClientRect:()=>({left:0,top:0})}},panRef:{current:pan},pan,linkFromId:null,isDraggingCanvasRef:{current:false},canvasPointerIdRef:{current:null},startPanRef:{current:{}},
        setPan(fn){pan=fn(pan);ctx.pan=pan;ctx.panRef.current=pan;},setLinkFromId(){},recordCrashCanvasGesture:(...args)=>c.bridge.gesture(...args),
        target:{hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),getBoundingClientRect:()=>({left:0,top:0})}};
    ctx.canvasElRef.current=ctx.target;vm.createContext(ctx);vm.runInContext(compile(functions.join('\n')),ctx);
    const e={clientX:5,clientY:6,pointerId:1,target:{closest:()=>null},currentTarget:{setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)}};
    ctx.handleCanvasPointerDown(e);for(let i=0;i<100;i++)ctx.handleCanvasPointerMove({...e,clientX:6+i,clientY:7+i});ctx.handleCanvasPointerUp(e);
    const touch=dist=>({touches:[{clientX:0,clientY:0},{clientX:dist,clientY:dist}],cancelable:true,preventDefault(){}});
    ctx.onTouchStart(touch(20));for(let i=0;i<100;i++)ctx.onTouchMove(touch(20+i));ctx.onTouchEnd({touches:[]});
    return {pan,captures:[...captures],dragging:ctx.isDraggingCanvasRef.current,pinch:ctx.pinchRef.current};
}
check('real canvas handlers: 100 pointer/touch moves add only four boundary writes; baseline interactions equal',()=>{
    const c=boot();c.bridge.canvas(true,3,2,1);const start=c.crashWrites().length;
    const now=gestureFixture(fs.readFileSync('components/phone-character-app.tsx','utf8'),c);
    const before=gestureFixture(cp.execFileSync('git',['show','HEAD:components/phone-character-app.tsx'],{encoding:'utf8'}),boot());
    assert.deepEqual(plain(now),plain(before));assert.equal(c.crashWrites().length-start,4);
    assert.equal(c.snapshot().current.canvas.gesture,'none');
});
check('real mount/world-switch count effects and unmount do not read image/card contents',()=>{
    const src=fs.readFileSync('components/phone-character-app.tsx','utf8'),ast=ts.createSourceFile('c.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),effects=[];
    const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.getText(ast).includes('recordCrashCanvas('))effects.push(node.getText(ast));ts.forEachChild(node,visit);};visit(ast);
    assert.equal(effects.length,2);
    const c=boot(),ctx={crashWorldRef:{current:null},currentWorldId:'world-1',characters:[],bgItems:[],worldGroups:[],worldCharacters:[{canvasX:0},{canvasX:2},{}],worldBgItems:[{},{}],relationLines:[{}],
        recordCrashCanvas:(...args)=>c.bridge.canvas(...args),useEffect:fn=>{const cleanup=fn();if(cleanup)ctx.cleanup=cleanup;}};
    vm.createContext(ctx);vm.runInContext(compile(effects.join(';\n')),ctx);
    assert.equal(c.snapshot().current.canvas.renderedCards,2);const w=c.writes.length;
    for(let i=0;i<100;i++)vm.runInContext(compile(effects[0]),ctx);
    assert.equal(c.writes.length,w);
    ctx.currentWorldId='world-2';vm.runInContext(compile(effects[0]),ctx);assert.equal(c.writes.length,w+1);
    ctx.cleanup();assert.equal(c.snapshot().current.canvas.mounted,false);
});
check('script has no high-frequency APIs, business stores or network; layout leaves boot script first',()=>{
    for(const forbidden of ['setInterval','requestAnimationFrame','pointermove','touchmove','fetch(','indexedDB','beforeunload'])assert.ok(!code.includes(forbidden),forbidden);
    const layout=fs.readFileSync('app/layout.tsx','utf8');assert.ok(layout.indexOf('id="float-boot-diagnostics"')<layout.indexOf('id="float-crash-diagnostics"'));
    assert.ok(b.reads.every(k=>k.startsWith(prefix)||k.startsWith('ai_phone_chat_generation_diag_')));
});
check('actual DesktopShell effect maps only fixed categories',()=>{
    const src=fs.readFileSync('components/desktop-shell.tsx','utf8'),ast=ts.createSourceFile('d.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),effects=[];
    const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.getText(ast).includes('recordCrashApp('))effects.push(node.getText(ast));ts.forEachChild(node,visit);};visit(ast);
    assert.equal(effects.length,1);
    const c=boot(),ctx={activeApp:null,useEffect:fn=>fn(),recordCrashApp:app=>c.bridge.app(app)};vm.createContext(ctx);
    for(const [app,expected] of [[null,'desktop'],['chat','chat'],['characters','characters'],['settings','settings'],[secret,'other']]){
        ctx.activeApp=app;vm.runInContext(compile(effects[0]),ctx);assert.equal(c.snapshot().current.app,expected);
    }
});
const p=boot(),pStart=p.crashWrites().length,t0=performance.now();
for(let i=0;i<100;i++){const id='1791580000000-p'+i;p.bridge.runStart(id,'chatroom');p.bridge.runEnd(id);}
const elapsed=performance.now()-t0;
check('normal generation adds exactly start/end writes; all storage stays bounded',()=>{
    assert.equal(p.crashWrites().length-pStart,200);
    for(const w of [...p.crashWrites(),...next.crashWrites()]){
        const max=w.key===keys.history?65536:w.key===keys.enabled?16:8192;assert.ok(w.value.length<=max);JSON.parse(w.value);
    }
});
const simulated=boot();simulated.bridge.app('chat');simulated.bridge.runStart(B,'background');simulated.records.set('ai_phone_chat_generation_diag_slot_2_v1',JSON.stringify(record(B,'background','STAGGER_WAIT_BEGIN')));clock+=250;
const recovered=boot(simulated.records);
console.log(JSON.stringify({checks,normalGenerationWrites:2,vm100StartEndPairsMs:Number(elapsed.toFixed(2)),maxMeasuredCurrentChars:Math.max(...p.crashWrites().map(w=>w.value.length)),
    simulatedInterruption:recovered.snapshot().history.at(-1)},null,2));


if(process.argv.includes('--browser'))(async()=>{
    const path=require('node:path'),os=require('node:os'),fsp=require('node:fs/promises'),root=path.resolve(__dirname,'..');
    const temp=await fsp.mkdtemp(path.join(os.tmpdir(),'float-crash-p0-browser-')),entry=path.join(temp,'entry.js');
    await fsp.writeFile(entry,[
        'const React=require('+JSON.stringify(require.resolve('react'))+');',
        'const {createRoot}=require('+JSON.stringify(require.resolve('react-dom/client'))+');',
        'const api=require('+JSON.stringify(path.join(root,'lib/crash-diagnostics.ts'))+');',
        'const boot=require('+JSON.stringify(path.join(root,'lib/crash-diagnostics-bootstrap.ts'))+');',
        'const generation=require('+JSON.stringify(path.join(root,'lib/chat-generation-diagnostics.ts'))+');',
        'const {CrashDiagnostics}=require('+JSON.stringify(path.join(root,'components/settings/crash-diagnostics.tsx'))+');',
        'window.p0Test={...api,...boot,generation};createRoot(document.getElementById("app")).render(React.createElement(CrashDiagnostics));'
    ].join('\n'));
    const wp=require('next/dist/compiled/webpack/webpack');wp.init();
    await new Promise((resolve,reject)=>wp.webpack({mode:'production',optimization:{minimize:false},target:'web',devtool:false,context:root,entry,
        output:{path:temp,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root}},
        module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(root,'scripts/anonymous-xhs-phase0/ts-loader.cjs')}]}
    },(err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString({all:false,errors:true}))):resolve()));
    const bundle=(await require('next/dist/compiled/terser').minify(await fsp.readFile(path.join(temp,'fixture.js'),'utf8'))).code;
    const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
    const browser=await chromium.launch({headless:true,channel:'msedge'});
    const results=[],errors=[],network=[];
    const ok=(label,value)=>{assert.ok(value,label);results.push(label);};
    try{
        const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
        await context.route('**/*',route=>{
            const request=route.request(),url=new URL(request.url());network.push({method:request.method(),host:url.hostname});
            if(url.hostname!=='float-crash-p0.invalid'||request.method()!=='GET')return route.abort();
            return route.fulfill({contentType:url.pathname==='/fixture.js'?'text/javascript':'text/html',body:url.pathname==='/fixture.js'?bundle:
                '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><script>'+
                'window.p0Writes=[];const nativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){window.p0Writes.push([k,v]);return nativeSet.call(this,k,v)};'+
                'window.p0Pagehide=[];const nativeAdd=window.addEventListener;window.addEventListener=function(k,fn,...args){if(k==="pagehide")window.p0Pagehide.push(fn);return nativeAdd.call(this,k,fn,...args)};'+
                'window.p0Visibility=[];const nativeDocAdd=document.addEventListener;document.addEventListener=function(k,fn,...args){if(k==="visibilitychange")window.p0Visibility.push(fn);return nativeDocAdd.call(this,k,fn,...args)};'+
                'indexedDB.open=function(){throw Error("P0 must not open DB")};window.fetch=function(){throw Error("P0 must not upload")};'+
                '</script><script>'+code+'</script></head><body style="font:14px system-ui"><div id="app"></div><script src="/fixture.js"></script></body></html>'});
        });
        const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
        await page.goto('http://float-crash-p0.invalid/');
        await page.getByText('闪退诊断（仅本机 · P0）',{exact:true}).click();
        await page.evaluate(({a,b})=>{
            window.__FLOAT_CRASH_DIAG_INTERNAL_V1__.app('chat');
            const g=window.p0Test.generation;g.startGenerationDiagnostic(a,'PRIVATE-CARD',false);g.startGenerationDiagnostic(b,'PRIVATE-CARD',false,'background');
            g.markGenerationDiagnostic(a,'SHORT_TERM_ASSEMBLY_BEGIN',{historyCount:6906});g.markGenerationDiagnostic(b,'STAGGER_WAIT_BEGIN',{},3,1);
            for(const fn of window.p0Pagehide)window.removeEventListener('pagehide',fn);
            for(const fn of window.p0Visibility)document.removeEventListener('visibilitychange',fn);
        },{a:A,b:B});
        await page.reload();await page.getByText('闪退诊断（仅本机 · P0）',{exact:true}).click();
        ok('real reload freezes previous document foreground/background stages',await page.evaluate(()=>{const s=window.p0Test.readCrashDiagnostics().history.at(-1);return s.evidence==='UNOBSERVED_FOREGROUND_END'&&s.generationSnapshots.length===2&&s.generationSnapshots.some(g=>g.lastStage==='STAGGER_WAIT_BEGIN'&&g.publishedCount===1)&&s.generationSnapshots.some(g=>g.lastStage==='SHORT_TERM_ASSEMBLY_BEGIN');}));
        ok('actual React panel displays cautious classification and old stages', (await page.locator('#app').textContent()).includes('疑似前台异常中断')&&(await page.locator('#app').textContent()).includes('STAGGER_WAIT_BEGIN'));
        await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));
        await page.getByRole('button',{name:'复制脱敏报告',exact:true}).click();
        const copied=await page.getByRole('textbox',{name:'脱敏报告（只读）'}).inputValue();
        ok('clipboard fallback is a read-only redacted report',!copied.includes('PRIVATE-CARD')&&copied.includes('lastRecordedAtISO')&&await page.getByRole('textbox').getAttribute('readonly')!==null);
        const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'导出 JSON',exact:true}).click();
        const download=await downloadPromise,file=path.join(temp,'report.json');await download.saveAs(file);
        ok('manual JSON download contains only redacted diagnostics',JSON.parse(await fsp.readFile(file,'utf8')).format==='float-crash-diagnostics');
        await page.getByRole('checkbox').uncheck();
        const before=await page.evaluate(()=>localStorage.getItem('float:crashdiag:v1:current'));
        await page.evaluate(()=>{window.__FLOAT_CRASH_DIAG_INTERNAL_V1__.app('characters');window.p0Test.generation.startGenerationDiagnostic('1791580000000-off','synthetic',false);});
        await page.reload();await page.getByText('闪退诊断（仅本机 · P0）',{exact:true}).click();
        ok('disable survives real reload, retains records, leaves existing generation diagnostics running',await page.evaluate(expected=>localStorage.getItem('float:crashdiag:v1:current')===expected&&!window.p0Test.readCrashDiagnostics().enabled&&JSON.parse(localStorage.getItem('ai_phone_chat_generation_diag_current_v1')).runId==='1791580000000-off',before));
        await page.getByRole('checkbox').check();
        const metrics=await page.evaluate(()=>{
            const times=[],start=window.p0Writes.filter(([k])=>k.startsWith('float:crashdiag:')).length;
            for(let i=0;i<100;i++){const t=performance.now(),id=Date.now()+'-measure'+i;window.__FLOAT_CRASH_DIAG_INTERNAL_V1__.runStart(id,'chatroom');window.__FLOAT_CRASH_DIAG_INTERNAL_V1__.runEnd(id);times.push(performance.now()-t);}
            times.sort((a,b)=>a-b);return {writes:window.p0Writes.filter(([k])=>k.startsWith('float:crashdiag:')).length-start,medianPairMs:times[50],p95PairMs:times[95],maxCurrentChars:Math.max(...window.p0Writes.filter(([k])=>k==='float:crashdiag:v1:current').map(([,v])=>v.length))};
        });
        ok('real Chromium localStorage: exactly two writes per start/end pair',metrics.writes===200);
        const identity=await page.evaluate(()=>window.p0Test.readCrashDiagnostics().current.documentId);
        await page.evaluate(()=>{const script=window.p0Test.crashDiagnosticsScript('minified-build');delete window.__FLOAT_CRASH_DIAG_INTERNAL_V1__; (0,eval)(script);});
        ok('production-minified bootstrap runs without module closure dependencies',await page.evaluate(previous=>window.p0Test.readCrashDiagnostics().current.buildId==='minified-build'&&window.p0Test.readCrashDiagnostics().current.documentId!==previous,identity));
        ok('no upload requests or browser page errors',errors.length===0&&network.every(r=>r.method==='GET'&&r.host==='float-crash-p0.invalid'));
        console.log(JSON.stringify({browserChecks:results.length,results,metrics,errors,note:'Desktop Chromium real localStorage + actual React UI + production-minified fixture, not iPhone durability/timing.'},null,2));
    }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
