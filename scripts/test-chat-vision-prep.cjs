// Actual P2 builder/helpers versus deployed ca380fc, synthetic data only.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process'),os=require('node:os'),path=require('node:path'),ts=require('typescript');
const BASE='ca380fc810d2bdd2b5e2bf8d147419e6c59dfc02';
const source=(file,old=false)=>old?cp.execFileSync('git',['show',BASE+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const json=x=>JSON.parse(JSON.stringify(x));
let checks=0;
const check=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const names=['blobToDataUrl','loadImageFromBlob','canvasToBlob','dataUrlToBlob','readCompressedImageDataUrl','rasterizeImageBlobToJpegDataUrl','getImageRefMimeType','isGifMimeType','isLikelyGifImageRef','fetchRemoteImageBlob','resolveCompressedImageDataUrl','resolveVisionImageRefForApi','prepareVisionPromptImageMessage','isVisionPromptImageMessage','hasVisionPromptImageData','stripVisionPromptImageData','applyVisionImagePromptLimit'];
function visionCode(old){
 const ast=ts.createSourceFile('engine.ts',source('lib/chat-engine.ts',old),ts.ScriptTarget.Latest,true);
 const selected=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text));
 assert.equal(selected.length,names.length);
 const constants=ast.statements.filter(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>/^LLM_IMAGE_|^VISION_BASE64_/.test(d.name.getText(ast))));
 return compile([...constants,...selected].map(n=>n.getText(ast)).join('\n'));
}
const harness=source('scripts/test-chat-generation-stages.cjs').split('async function main()')[0].replace(/const BASELINE = '[^']+';/,"const BASELINE = '"+BASE+"';");
const shared=vm.createContext({require,console,setTimeout,clearTimeout,setImmediate,Buffer,process,DOMException,AbortController});
vm.runInContext(harness,shared);
function fixture(old){
 const f=shared.fixture(old);
 Object.assign(f.ctx,{Blob,URL,atob,Uint8Array,normalizeVisionImagePromptLimit:v=>Math.max(0,Math.floor(Number(v??5))),isMediaStoreRef:r=>r.startsWith('media-store://')});
 f.reads=[];
 f.ctx.loadMediaBlob=async r=>{f.reads.push(r);return r.endsWith('missing')?null:{blob:new Blob(['synthetic-pixels'],{type:r.endsWith('gif')?'image/gif':'image/png'}),mimeType:r.endsWith('gif')?'image/gif':'image/png'};};
 f.ctx.FileReader=class{readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:'+blob.type+';base64,'+Buffer.from(b).toString('base64');this.onload();});}};
 vm.runInContext(visionCode(old),f.ctx);
 f.prepared=[];const prep=f.ctx.prepareVisionPromptImageMessage;
 f.ctx.prepareVisionPromptImageMessage=m=>{f.prepared.push(m.id);return prep(m);};
 f.ctx.prepareShortTermContext=(_id,_app,o)=>({truncatedHistory:o.history,recentBlocks:[],unifiedRecentItems:[],wbActivationContext:''});
 const ast=ts.createSourceFile('assembler.ts',source('lib/llm-prompt-assembler.ts'),ts.ScriptTarget.Latest,true);
 Object.assign(f.ctx,{resolvePromptTimeAware:()=>false,formatCharacterRelationsForPrompt:()=>'',readDwellingLayoutCache:()=>null,paymentDirective:()=>'',formatGiftForPrompt:()=>''});
 vm.runInContext(compile(ast.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(ast)).join('\n')),f.ctx);
 f.config.enableImageRecognition=true;
 return f;
}
const msg=(id,type,url,role='user')=>({id,sessionId:'synthetic-session',role,content:'synthetic-'+id,status:'sent',createdAt:'2026-10-10T00:00:00.000Z',...(type?{mediaType:type}:{}),...(type==='sticker'?{mediaData:{label:id,stickerUrl:url}}:{mediaUrl:url}),...(type==='media_file'?{mediaData:{fileType:'image',fileName:id}}:{})});
const png='data:image/png;base64,cGl4ZWxz',gif='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
async function prompts(){
 const cases=[
 ['text-only-1528',Array.from({length:1528},(_,i)=>msg('t'+i)),5,0],
 ['single-inline',[msg('a','image',png)],5,1],
 ['ordered-multiple-limit',[msg('a','image',png),msg('b','image','https://synthetic.invalid/b.png'),msg('c','image','media-store://c')],2,2],
 ['user-assistant-stickers',[msg('u','sticker',png),msg('a','sticker',png,'assistant')],5,1],
 ['whitespace-sticker',[msg('u','sticker','   ')],5,1],
 ['GIF',[msg('g','image',gif),msg('r','image','https://synthetic.invalid/g.gif'),msg('s','image','media-store://gif')],5,3],
 ['missing-removed',[msg('m','image','media-store://missing'),msg('r','image',undefined)],5,1],
 ['file-image',[msg('f','media_file',png,'assistant')],5,1],
 ['cap-zero',[msg('u','sticker',png),msg('a','image',png),msg('f','media_file','media-store://f')],0,0]];
 for(const [name,history,limit,candidates] of cases){
  const now=fixture(false),old=fixture(true),before=JSON.stringify(history);
  for(const f of [now,old]){f.input=json(history);for(const m of f.input){if(m.mediaData)Object.freeze(m.mediaData);Object.freeze(m);}f.start('vision');f.ctx.fetch=async()=>({ok:false});f.result=await f.ctx.buildChatPromptMessages({...f.session,visionImagePromptLimit:limit},f.input,{diagnosticRunId:'vision'});}
  check(name+': full prompt/image order/reads equivalent',()=>{
   assert.deepEqual(json(now.result),json(old.result));assert.deepEqual(now.reads,old.reads);assert.equal(JSON.stringify(history),before);assert.deepEqual(json(now.input),json(history));assert.deepEqual(json(old.input),json(history));
   const expectedImages={'text-only-1528':0,'single-inline':1,'ordered-multiple-limit':2,'user-assistant-stickers':1,'whitespace-sticker':0,'GIF':0,'missing-removed':1,'file-image':1,'cap-zero':0};
   assert.equal(now.result.llmMessages.flatMap(m=>Array.isArray(m.content)?m.content:[]).filter(p=>p.type==='image_url').length,expectedImages[name]);
   assert.equal(now.prepared.length,candidates);assert.equal(old.prepared.length,history.length);
   const stages=now.diag.writes.filter(w=>w.key.endsWith('current_v1')).map(w=>JSON.parse(w.value).lastStage);
   assert.equal(stages.filter(s=>s==='VISION_IMAGE_PREP_BEGIN').length,candidates);assert.equal(stages.filter(s=>s==='VISION_IMAGE_PREP_DONE').length,candidates);assert.ok(stages.includes('VISION_PREP_DONE'));
   for(const {value} of now.diag.writes)assert.ok(!/synthetic-pixels|https:|data:image|PRIVATE_|synthetic-t\d/.test(value));
  });
 }
 for(const appId of ['chat','offline']){
  const a=fixture(false),b=fixture(true);a.start('mode');b.start('mode');
  for(const f of [a,b])f.result=await f.ctx.buildChatPromptMessages({...f.session,isGroup:true},[msg('u','image',png)],{appId,diagnosticRunId:'mode'});
  check('group flag/'+appId+' full prompt equivalent',()=>assert.deepEqual(json(a.result),json(b.result)));
 }
 const off=fixture(false),offOld=fixture(true);
 for(const f of [off,offOld]){f.config.enableImageRecognition=false;f.result=await f.ctx.buildChatPromptMessages(f.session,[msg('u','image',png)]);}
 check('vision disabled preserves full prompt and no preparation',()=>{assert.deepEqual(json(off.result),json(offOld.result));assert.equal(off.prepared.length,0);});
 const f=fixture(false);f.start('pending');let reject;f.ctx.loadMediaBlob=()=>new Promise((_r,j)=>{reject=j;});
 const p=f.ctx.buildChatPromptMessages(f.session,[msg('p','image','media-store://pending')],{diagnosticRunId:'pending'});
 for(let i=0;!reject&&i<20;i++)await new Promise(r=>setImmediate(r));
 check('pending image precise incomplete stage',()=>assert.equal(f.diag.api.readGenerationDiagnostics().current.lastStage,'VISION_IMAGE_PREP_BEGIN'));
 reject(Error('SyntheticReadFailure'));await assert.rejects(p,/SyntheticReadFailure/);
 check('rejection keeps existing propagation; no false DONE',()=>assert.equal(f.diag.api.readGenerationDiagnostics().current.lastStage,'VISION_IMAGE_PREP_BEGIN'));
 const disabled=fixture(false),normal=fixture(false);disabled.diag.disable();disabled.start('disabled');normal.start('normal');
 const history=[msg('u','image',png)];
 const a=await disabled.ctx.buildChatPromptMessages(disabled.session,json(history),{diagnosticRunId:'disabled'});
 const b=await normal.ctx.buildChatPromptMessages(normal.session,json(history),{diagnosticRunId:'normal'});
 check('storage failure does not change prompt',()=>assert.deepEqual(json(a),json(b)));
}
async function browserTests(){
 const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
 const server=require('node:http').createServer((_req,res)=>res.end('<!doctype html><title>Synthetic P2 fixture</title>'));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:process.env.CHAT_TEST_BROWSER_CHANNEL||'msedge'});
 try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto("http://127.0.0.1:"+server.address().port);
 const result=await page.evaluate(async ({old,current})=>{
  let writes=0,maxAtob=0;
  for(const m of ['put','add','delete','clear'])IDBObjectStore.prototype[m]=()=>{writes++;throw Error('Unexpected DB write');};
  const atobNative=window.atob;window.atob=s=>{maxAtob=Math.max(maxAtob,s.length);return atobNative(s);};
  const created=new Set(),create=URL.createObjectURL,revoke=URL.revokeObjectURL;
  URL.createObjectURL=b=>{const u=create.call(URL,b);created.add(u);return u;};URL.revokeObjectURL=u=>{created.delete(u);return revoke.call(URL,u);};
  const canvases=[],element=document.createElement.bind(document);
  document.createElement=(...args)=>{const el=element(...args);if(args[0]==='canvas')canvases.push(el);return el;};
  const api=code=>new Function('exports','isMediaStoreRef','loadMediaBlob',code+';return exports;')({},r=>r.startsWith('media-store://'),async r=>r.endsWith('missing')?null:{blob:window.fixtureBlob,mimeType:window.fixtureBlob.type});
  const before=api(old),after=api(current),c=element('canvas');c.width=1200;c.height=900;
  const ctx=c.getContext('2d');ctx.fillStyle='#6ac';ctx.fillRect(0,0,1200,900);ctx.fillStyle='#fff';ctx.fillRect(5,5,100,200);
  const inline=c.toDataURL('image/png'),blobs=[await new Promise(r=>c.toBlob(r,'image/png')),new Blob([Uint8Array.from(atobNative('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='),c=>c.charCodeAt(0))],{type:'image/gif'}),new Blob(['invalid-image'],{type:'image/png'})];
  const outputs=[];
  window.fetch=async()=>({ok:true,blob:async()=>blobs[1]});
  const decoderInputs=['data:image/png;base64,','data:image/png;base64,YQ==','data:image/png;base64,YWI=','data:image/png;base64,YWJj','data:image/png;base64,YQ','data:image/png;base64,Y WJj','data:image/png;base64,invalid!','data:image/png;base64,YQ==YWJj','data:image/png,abc%20def','data:image/png,%ZZ','data:image/png;base64,'+'YWJj'.repeat(65536)+'YQ=='];
  for(const url of decoderInputs){const a=before.dataUrlToBlob(url),b=after.dataUrlToBlob(url);if(Boolean(a)!==Boolean(b))throw Error('Decoder presence differs');if(a){if(a.type!==b.type||a.size!==b.size)throw Error('Decoder metadata differs');const x=new Uint8Array(await a.arrayBuffer()),y=new Uint8Array(await b.arrayBuffer());for(let i=0;i<x.length;i++)if(x[i]!==y[i])throw Error('Decoder byte differs');}}
  for(const blob of blobs){window.fixtureBlob=blob;for(const u of ['media-store://present','media-store://missing']){
   const a={role:'user',mediaType:'image',mediaUrl:u},b={...a};await before.prepareVisionPromptImageMessage(a);await after.prepareVisionPromptImageMessage(b);outputs.push({old:a,current:b});
  }}
  for(const u of [inline,'https://synthetic.invalid/a.png','https://synthetic.invalid/a.gif', 'data:image/png;base64,invalid!']){
   const a={role:'user',mediaType:'image',mediaUrl:u},b={...a};await before.prepareVisionPromptImageMessage(a);await after.prepareVisionPromptImageMessage(b);outputs.push({old:a,current:b});
  }
  const large='data:image/png;base64,'+'YWJj'.repeat(4*1024*1024),oldBlob=before.dataUrlToBlob(large);maxAtob=0;
  const newBlob=after.dataUrlToBlob(large),boundedAtob=maxAtob;
  // Hashing in tests only; production does not allocate full buffers for this validation.
  const hash=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).join(',');
  return {outputs,created:created.size,writes,boundedAtob,hashes:[await hash(oldBlob),await hash(newBlob)],releasedCanvases:canvases.filter(c=>c.width===0&&c.height===0).length};
 },{old:visionCode(true)+'\nexports.dataUrlToBlob=dataUrlToBlob;',current:visionCode(false)+'\nexports.dataUrlToBlob=dataUrlToBlob;'});
 check('browser actual decode/JPEG canvas/fallback output exact',()=>{for(const x of result.outputs)assert.deepEqual(x.current,x.old);assert.equal(result.created,0);assert.equal(result.writes,0);assert.deepEqual(errors,[]);});
 check('large inline decoded bytes unchanged',()=>assert.equal(result.hashes[0],result.hashes[1]));
 if(source('lib/chat-engine.ts').includes('VISION_BASE64_CHUNK_CHARS'))check('bounded atob and explicit canvas release',()=>{assert.ok(result.boundedAtob<=256*1024);assert.ok(result.releasedCanvases>0);});
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
(async()=>{await prompts();await browserTests();console.log(JSON.stringify({checks,baseline:BASE}));})().catch(e=>{console.error(e);process.exitCode=1;});
