// Disposable Chromium context and localhost IndexedDB only; never uses user archives.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const ts = require('typescript');

async function main() {
  const repo = path.resolve(__dirname, '..');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'float-xhs-hd-browser-'));
  const runtime = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || runtime);
  const appSource = await fs.readFile(path.join(repo, 'components/xiaohongshu/xiaohongshu-app.tsx'), 'utf8');
  const ast = ts.createSourceFile('app.tsx', appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = name => {
    let found;
    function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node; ts.forEachChild(node, visit); }
    visit(ast); assert(found, name); return found.getText(ast);
  };
  const loader = path.join(repo, 'scripts/anonymous-xhs-phase0/ts-loader.cjs');
  // Probe only the read boundary; run the actual storage, image conversion and UI code.
  await fs.writeFile(path.join(temp, 'assets-loader.cjs'), `
const transpile=require(${JSON.stringify(loader)});
module.exports=function(source){
 source=source.replace('export async function readXiaohongshuFullImage(', 'async function actualFullImage(');
 source+='\\nexport async function readXiaohongshuFullImage(id: string) { const w=window as any; w.hdReads.push(id); if(w.deferHD) await new Promise<void>(r=>w.pendingHD.push(r)); return actualFullImage(id); }';
 return transpile.call(this,source);
};`);
  await fs.writeFile(path.join(temp, 'entry.tsx'), `
import React, {useState,useRef} from ${JSON.stringify(require.resolve('react'))};
import {createRoot} from ${JSON.stringify(require.resolve('react-dom/client'))};
import {flushSync} from ${JSON.stringify(require.resolve('react-dom'))};
import * as assets from ${JSON.stringify(path.join(repo,'lib/xiaohongshu-image-assets'))};
import * as theme from ${JSON.stringify(path.join(repo,'lib/theme-storage'))};
import {getChatImageFromIndexedDB} from ${JSON.stringify(path.join(repo,'lib/chat-asset-storage'))};
import * as backup from ${JSON.stringify(path.join(repo,'lib/data-management/backup'))};
import * as serial from ${JSON.stringify(path.join(repo,'lib/data-management/serializers'))};
import {importSource} from ${JSON.stringify(path.join(repo,'lib/data-management/idb'))};
import {resolveXiaohongshuVisionImages,makeXiaohongshuVisionMessage,getXiaohongshuNoteImageIds} from ${JSON.stringify(path.join(repo,'lib/xiaohongshu-vision'))};
import {XhsLazyImage} from ${JSON.stringify(path.join(repo,'components/xiaohongshu/xhs-lazy-image'))};
import {XiaohongshuImageViewer} from ${JSON.stringify(path.join(repo,'components/xiaohongshu/xhs-image-viewer'))};
const w=window as any, root=createRoot(document.getElementById('app')!);
w.hdReads=[]; w.pendingHD=[]; w.assetReads=[];
const get=IDBObjectStore.prototype.get;
IDBObjectStore.prototype.get=function(...args:any[]){if(this.name==='assets')w.assetReads.push(args[0]); return (get as any).apply(this,args)};
const makeXiaohongshuThumbnail=assets.makeXiaohongshuThumbnail,xhsOriginalFileError=assets.xhsOriginalFileError,deleteThemeAsset=theme.deleteThemeAsset;
async function saveXiaohongshuImagePair(original:Blob,thumbnail:Blob){if(w.deferSave)await new Promise<void>(r=>w.pendingSave=r);return assets.saveXiaohongshuImagePair(original,thumbnail);}
// Extract the exact draft handlers: React setters/storage/network are explicit test boundaries.
const stagedXhsImages={current:new Set<string>()},imageUploadInProgress={current:false},imageUploadEpoch={current:0};
let draft:any={title:'fixture',body:'fixture',image:{}},state:any={notes:[],profile:{},settings:{}},busy='idle',tagInput='';
const notices:any[]=[];
function setDraft(update:any){draft=typeof update==='function'?update(draft):update;}
function setState(value:any){state=value;}
function setBusy(value:any){busy=value;}
function setImageUploading(_value:any){}
function setComposeOpen(_value:any){}
function setTagInput(_value:any){}
function clearErrorState(){}
function handleGenerationError(error:any){notices.push(String(error));}
function onNotice(value:any){notices.push(value);}
function loadXiaohongshuState(){return state;}
function saveXiaohongshuState(value:any){return value;}
function createUserXiaohongshuNote(input:any){return {id:'published-fixture',imageAssetIds:(input.images||[input.image]).map((i:any)=>i.assetId).filter(Boolean)};}
async function generateXiaohongshuNpcReactionForUserPost(){throw new Error('stop after test publication');}
${fn('processImageFile')}
${fn('discardStagedXhsImage')}
${fn('clearDraftXhsImages')}
${fn('handleImageChange')}
${fn('handlePublish')}
const XHS_MAX_IMAGE_HEIGHT_RATIO=4/3,DEFAULT_XHS_IMAGE_FRAME_STYLE={aspectRatio:'3 / 4'};
${fn('getImageFrameStyle')}
${fn('NoteDetailSlider')}
function Frame({ids,index}:any){const [open,setOpen]=useState(true);return open?<XiaohongshuImageViewer imageIds={ids} initialIndex={index} onClose={()=>setOpen(false)}/>:null;}
function LazyList({ids}:any){return <div>{ids.map((id:string,i:number)=><div key={i} style={{height:300}}><XhsLazyImage assetId={id} width={240} height={280}/></div>)}</div>;}
w.test={
 assets,theme,backup,serial,importSource,ids:[] as string[],originals:[] as Blob[],previews:[] as any[],notices,
 async create(width:number,height:number,transparent=false){
  const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d')!;
  if(!transparent){ctx.fillStyle='#00aa00';ctx.fillRect(0,0,width,height);}
  ctx.fillStyle='#ff0000';ctx.fillRect(0,0,width,Math.max(1,height/12));
  ctx.fillStyle='#0000ff';ctx.fillRect(0,height-Math.max(1,height/12),width,Math.max(1,height/12));
  const original=await new Promise<Blob>(r=>c.toBlob(b=>r(b!),'image/png'));c.width=c.height=0;
  const preview=await assets.makeXiaohongshuThumbnail(original);
  const id=await assets.saveXiaohongshuImagePair(original,preview.blob);
  this.ids.push(id);this.originals.push(original);this.previews.push(preview);return id;
 },
 async sample(url:string){
  const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=1;c.height=2;const ctx=c.getContext('2d')!;
  ctx.drawImage(img,0,0,img.naturalWidth,Math.max(1,img.naturalHeight/20),0,0,1,1);
  ctx.drawImage(img,0,img.naturalHeight-Math.max(1,img.naturalHeight/20),img.naturalWidth,Math.max(1,img.naturalHeight/20),0,1,1,1);
  const result={width:img.naturalWidth,height:img.naturalHeight,colors:[...ctx.getImageData(0,0,1,2).data]};
  img.src='';c.width=c.height=0;return result;
 },
 viewer(ids:string[]=this.ids,index=0){flushSync(()=>root.render(<Frame key={Math.random()} ids={ids} index={index}/>));},
 lazy(ids:string[]){flushSync(()=>root.render(<LazyList ids={ids}/>));},
 slider(ids:string[]){flushSync(()=>root.render(<NoteDetailSlider note={{imageWidth:300,imageHeight:600} as any} imageIds={ids} imageMap={{}} onOpenImage={i=>w.openedSlides.push(i)}/>));},
 unmount(){flushSync(()=>root.render(null));},
 releaseHD(){w.deferHD=false;w.pendingHD.splice(0).forEach((r:any)=>r());},
 async vision(){const batch=await resolveXiaohongshuVisionImages({imageAssetIds:this.ids.slice(0,9)},assets.getXiaohongshuVisionDataUrl);return makeXiaohongshuVisionMessage('No description of contents',batch);},
 async draftUpload(files:File[]){await handleImageChange({target:{files,value:''}} as any);return draft;},
 clearDraft(){clearDraftXhsImages();},
 draftState(){return {draft,staged:[...stagedXhsImages.current],state,busy};},
 publish(){return handlePublish();},
 protect(id:string){stagedXhsImages.current.add(id);state.notes.push({id:'old',imageAssetIds:[id]});discardStagedXhsImage({assetId:id});},
 resetDraft(){draft={title:'fixture',body:'fixture',image:{}};state={notes:[],profile:{},settings:{}};busy='idle';}
};
`);
  const wp = require('next/dist/compiled/webpack/webpack'); wp.init();
  await new Promise((resolve,reject)=>wp.webpack({
    mode:'development',target:'web',devtool:false,context:repo,
    entry:path.join(temp,'entry.tsx'),output:{path:temp,filename:'fixture.js'},
    resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':repo},modules:[path.join(repo,'node_modules')],fallback:{fs:false,path:false,crypto:false}},
    module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,oneOf:[
      {test:/[\\/]xiaohongshu-image-assets\.ts$/,use:path.join(temp,'assets-loader.cjs')},
      {use:loader},
    ]}]},
    plugins:[new wp.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})],
  },(error,stats)=>error||stats.hasErrors()?reject(error||Error(stats.toString({all:false,errors:true}))):resolve()));
  const css=await fs.readFile(path.join(repo,'styles/xiaohongshu.css'),'utf8');
  const server=http.createServer(async(req,res)=>{
    try {
      const pathname=new URL(req.url,'http://localhost').pathname;
      if(pathname==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(path.join(temp,'fixture.js')));}
      else if(pathname==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);}
      else if(/^\/rescue\/[\w-]+\.js$/.test(pathname)){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(path.join(repo,'public/float-rescue',path.basename(pathname))));}
      else {res.setHeader('Content-Type','text/html');res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="app"></div><script>
window.process={env:{NODE_ENV:'development'}};window.activeUrls=new Set();window.openedSlides=[];window.failures=[];
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=b=>{const u=create(b);activeUrls.add(u);return u};URL.revokeObjectURL=u=>{activeUrls.delete(u);return revoke(u)};
addEventListener('unhandledrejection',e=>failures.push(String(e.reason)));
</script><script src="/fixture.js"></script>`);}
    } catch(e){res.statusCode=500;res.end(String(e));}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
  let checks=0;
  const check=(label,value)=>{assert(value,label);checks++;console.log('PASS '+label);};
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url='http://127.0.0.1:'+server.address().port;await page.goto(url);await page.waitForFunction(()=>window.test);
    const composition=await page.evaluate(async()=>{
      const t=window.test;const sizes=[[900,1600],[800,1200],[900,1200],[1600,900],[400,8000]];
      const results=[];
      for(const [width,height] of sizes){
        const id=await t.create(width,height);const original=await t.theme.getXiaohongshuOriginalBlob(id);
        const preview=await t.sample(await getPreview(id));const vision=await t.sample(await t.assets.getXiaohongshuVisionDataUrl(id));
        const same=await original.arrayBuffer(),expected=await t.originals.at(-1).arrayBuffer();
        results.push({originalEqual:[...new Uint8Array(same)].join() === [...new Uint8Array(expected)].join(),preview,vision});
      }
      async function getPreview(id){return t.theme.getThemeAssetDataUrl(id);}
      await t.create(120,240,true);
      for(let i=t.ids.length;i<9;i++)await t.create(240,320);
      const message=await t.vision();
      return {results,message,active:activeUrls.size};
    });
    check('5 image ratios retain exact original bytes',composition.results.every(r=>r.originalEqual));
    check('thumbnail and AI see red top and blue bottom without crop',composition.results.every(r=>[r.preview,r.vision].every(p=>p.colors[0]>200&&p.colors[2]<60&&p.colors[6]>200&&p.colors[4]<60)));
    check('thumbnail <=960 and vision <=1600; encoding URLs released',composition.results.every(r=>Math.max(r.preview.width,r.preview.height)<=960&&Math.max(r.vision.width,r.vision.height)<=1600)&&composition.active===0);
    const parts=composition.message.content;
    check('9 compressed image blocks in original order with labels',parts.filter(p=>p.type==='image_url').length===9&&parts.filter(p=>p.type==='text'&&p.text.startsWith('[笔记图片')).every((p,i)=>p.text===`[笔记图片 ${i+1}/9]`));
    check('9-image binary budget <=4.5MiB',parts.filter(p=>p.type==='image_url').reduce((sum,p)=>sum+Buffer.from(p.image_url.url.split(',')[1],'base64').length,0)<=9*512*1024);
    const special=await page.evaluate(async()=>{
      const t=window.test,c=document.createElement('canvas');c.width=c.height=1600;const ctx=c.getContext('2d'),pixels=ctx.createImageData(1600,1600);
      let seed=123456;for(let i=0;i<pixels.data.length;i+=4){for(let j=0;j<3;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels.data[i+j]=seed>>>24;}pixels.data[i+3]=255;}
      ctx.putImageData(pixels,0,0);const initial=await new Promise(r=>c.toBlob(r,'image/jpeg',0.82)),original=await new Promise(r=>c.toBlob(r,'image/png'));
      const preview=await t.assets.makeXiaohongshuThumbnail(original),id=await t.assets.saveXiaohongshuImagePair(original,preview.blob),vision=await t.assets.getXiaohongshuVisionDataUrl(id);
      const compressed=atob(vision.split(',')[1]).length,sample=await t.sample(vision);await t.theme.deleteThemeAsset(id);
      const full=await t.assets.readXiaohongshuFullImage(t.ids[5]),u=URL.createObjectURL(full),img=new Image();img.src=u;await img.decode();
      c.width=c.height=1;ctx.drawImage(img,img.naturalWidth/2,img.naturalHeight/2,1,1,0,0,1,1);const alpha=ctx.getImageData(0,0,1,1).data[3];img.src='';URL.revokeObjectURL(u);
      const thumb=await t.sample(await t.theme.getThemeAssetDataUrl(t.ids[5]));
      return {initial:initial.size,compressed,size:Math.max(sample.width,sample.height),alpha,urls:activeUrls.size,thumb};
    });
    check('noisy full image actually exercises byte cap with <=1600px output',special.initial>512*1024&&special.compressed<=512*1024&&special.size<=1600);
    check('transparent PNG keeps original alpha and releases decode URL',special.alpha===0&&special.urls===0);
    await page.evaluate(()=>{hdReads.length=0;test.viewer(test.ids.slice(0,3),1);});
    await page.waitForFunction(()=>document.querySelector('.xhs-full-image-stage img')?.complete);
    check('viewer starts clicked second image; only one HD read/URL',await page.evaluate(()=>hdReads.length===1&&hdReads[0]===test.ids[1]&&activeUrls.size===1));
    check('full image fits viewport with complete aspect ratio',await page.evaluate(()=>{const i=document.querySelector('.xhs-full-image-stage img'),r=i.getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0&&r.width<=innerWidth&&Math.abs(r.width/r.height-i.naturalWidth/i.naturalHeight)<0.01;}));
    await page.getByLabel('下一张',{exact:true}).click();await page.waitForFunction(()=>hdReads.length===2&&document.querySelector('.xhs-full-image-stage img')?.complete);
    check('switch revokes old HD URL, leaves only current one',await page.evaluate(()=>activeUrls.size===1));
    await page.locator('.xhs-full-image-stage').dblclick({position:{x:190,y:300}});
    check('double click zooms',await page.locator('.xhs-full-image-stage img').evaluate(i=>i.style.transform.includes('scale(2)')));
    await page.mouse.move(190,400);await page.mouse.down();await page.mouse.move(230,440);await page.mouse.up();
    check('zoomed image drags',await page.locator('.xhs-full-image-stage img').evaluate(i=>!i.style.transform.includes('translate(0px, 0px)')));
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.xhs-full-image-viewer'));
    check('Escape releases all URLs and scroll lock',await page.evaluate(()=>activeUrls.size===0&&document.body.style.overflow===''));
    await page.evaluate(()=>test.viewer(test.ids.slice(0,3),0));await page.waitForFunction(()=>activeUrls.size===1);await page.goBack();
    await page.waitForFunction(()=>!document.querySelector('.xhs-full-image-viewer'));check('browser back closes viewer without losing detail',await page.evaluate(()=>activeUrls.size===0));
    await page.evaluate(()=>{hdReads.length=0;test.viewer(test.ids.slice(0,3),0);});await page.waitForFunction(()=>activeUrls.size===1);
    const cdp=await context.newCDPSession(page);
    const touch=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y}))});
    const tap=async()=>{await touch('touchStart',[[1,180,350]]);await touch('touchEnd',[]);};
    await tap();await tap();
    check('real Chromium touch double tap zooms',await page.locator('.xhs-full-image-stage img').evaluate(i=>i.style.transform.includes('scale(2)')));
    await tap();await tap();
    await touch('touchStart',[[1,130,350],[2,230,350]]);await touch('touchMove',[[1,80,350],[2,280,350]]);await touch('touchEnd',[]);
    check('two touch pointers pinch zoom without changing image',await page.locator('.xhs-full-image-stage img').evaluate(i=>i.style.transform.includes('scale(2)'))&&await page.evaluate(()=>hdReads.length===1));
    await touch('touchStart',[[1,180,350]]);await touch('touchMove',[[1,220,390]]);await touch('touchEnd',[]);
    check('touch drag moves zoomed image',await page.locator('.xhs-full-image-stage img').evaluate(i=>!i.style.transform.includes('translate(0px, 0px)')));
    await page.getByLabel('缩小',{exact:true}).click();await page.getByLabel('缩小',{exact:true}).click();
    await touch('touchStart',[[1,280,350]]);await touch('touchMove',[[1,100,350]]);await touch('touchCancel',[]);
    check('touch cancellation does not switch images',await page.evaluate(()=>hdReads.length===1));
    await touch('touchStart',[[1,280,350]]);await touch('touchMove',[[1,100,350]]);await touch('touchEnd',[]);
    await page.waitForFunction(()=>hdReads.length===2&&activeUrls.size===1&&document.querySelector('.xhs-full-image-stage img')?.complete);
    check('touch swipe switches to next image with one active URL',await page.evaluate(()=>hdReads[1]===test.ids[1]&&activeUrls.size===1));
    await page.getByLabel('关闭图片',{exact:true}).click();await page.waitForFunction(()=>activeUrls.size===0);
    await cdp.detach();
    await page.evaluate(()=>{hdReads.length=0;test.viewer(test.ids.slice(0,9),8);});await page.waitForFunction(()=>activeUrls.size===1);
    for(let i=7;i>=0;i--){await page.getByLabel('上一张',{exact:true}).click();await page.waitForFunction(n=>hdReads.length===n&&activeUrls.size===1,9-i);}
    check('nine-image viewer traverses original order while keeping one HD URL',await page.evaluate(()=>hdReads.length===9&&hdReads.every((id,i)=>id===test.ids[8-i])&&activeUrls.size===1));
    await page.getByLabel('关闭图片',{exact:true}).click();await page.waitForFunction(()=>activeUrls.size===0);
    const legacyId=await page.evaluate(async()=>{
      const t=window.test,id=await t.create(240,320),record=(await t.theme.readThemeAssetRecords([id]))[0];
      await new Promise((resolve,reject)=>{const q=indexedDB.open('ai_phone_theme_db_v1');q.onsuccess=()=>{const db=q.result,tx=db.transaction('assets','readwrite');delete record.xiaohongshuOriginalBlob;tx.objectStore('assets').put(record);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
      t.viewer([id]);return id;
    });
    await page.waitForFunction(()=>document.querySelector('.xhs-full-image-stage img')?.complete);
    check('legacy single image opens using thumbnail with no HD URL',await page.evaluate(()=>activeUrls.size===0&&document.querySelector('.xhs-full-image-stage img').src.startsWith('data:')));
    await page.getByLabel('关闭图片',{exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.xhs-full-image-viewer'));
    await page.evaluate(legacyId=>test.viewer(['missing-fixture',legacyId],0),legacyId);await page.getByText('图片已丢失或未恢复',{exact:true}).waitFor();
    await page.getByLabel('下一张',{exact:true}).click();await page.waitForFunction(()=>document.querySelector('.xhs-full-image-stage img')?.complete);
    check('missing image does not prevent switching to a good legacy image',await page.evaluate(()=>activeUrls.size===0));
    await page.getByLabel('关闭图片',{exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.xhs-full-image-viewer'));
    await page.evaluate(async()=>{await test.theme.attachXiaohongshuOriginalBlob(test.ids[0],new Blob(['bad decode'],{type:'image/heic'}));test.viewer([test.ids[0]]);});
    await page.getByText('原图格式无法解码，已显示缩略图',{exact:true}).waitFor();
    check('unsupported restored original falls back with feedback and releases URL',await page.evaluate(()=>activeUrls.size===0&&document.querySelector('.xhs-full-image-stage img')?.src.startsWith('data:')));
    await page.evaluate(async()=>{await test.theme.attachXiaohongshuOriginalBlob(test.ids[0],test.originals[0]);});
    await page.getByLabel('关闭图片',{exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.xhs-full-image-viewer'));
    await page.evaluate(()=>{deferHD=true;hdReads.length=0;test.viewer(test.ids.slice(0,3),0);});await page.waitForFunction(()=>pendingHD.length>0);
    await page.evaluate(()=>{test.unmount();test.releaseHD();});await page.waitForTimeout(100);
    check('late HD read after unmount creates no URL',await page.evaluate(()=>activeUrls.size===0));
    await page.evaluate(()=>{assetReads.length=0;hdReads.length=0;test.lazy(Array.from({length:100},(_,i)=>test.ids[i%9]));});
    await page.waitForTimeout(250);
    check('100 cards load only visible/prefetched thumbnails and zero HD',await page.evaluate(()=>assetReads.length<10&&hdReads.length===0));
    for(const y of [2000,7000,20000,0]){await page.evaluate(y=>window.scrollTo(0,y),y);await page.waitForTimeout(120);}
    check('scrolling keeps only nearby image src values',await page.evaluate(()=>document.querySelectorAll('#app img[src]').length<10&&hdReads.length===0));
    await page.evaluate(()=>{test.unmount();window.scrollTo(0,0);test.slider(test.ids.slice(0,3));});
    await page.waitForTimeout(250);await page.locator('.xhs-note-slider-item').first().click();
    check('detail tap opens correct image index',await page.evaluate(()=>openedSlides[0]===0));
    await page.evaluate(()=>{const e=document.querySelector('.xhs-note-slider-item');e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:250,clientY:250}));e.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:100,clientY:250}));e.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
    check('detail drag is not mistaken for open',await page.evaluate(()=>openedSlides.length===1));
    await page.evaluate(()=>test.unmount());
    const backupResult=await page.evaluate(async()=>{
      const t=window.test;
      const original=await t.theme.getXiaohongshuOriginalBlob(t.ids[0]);const before=await original.arrayBuffer();
      const local=await t.backup.createBackupBlob(['desktop'],{excludeMedia:false});
      await t.theme.deleteThemeAsset(t.ids[0]);
      const imported=await t.backup.importBackupBlob(local.blob,['desktop'],{overwrite:true});
      const restored=await t.theme.getXiaohongshuOriginalBlob(t.ids[0]);
      const rescue=await import('/rescue/serializer.js'),collector=rescue.createCollector(()=>{});
      const record=(await t.theme.readThemeAssetRecords([t.ids[0]]))[0];
      const serialized=await rescue.serializeValue(record,collector,()=>{});
      await t.theme.deleteThemeAsset(t.ids[0]);
      const source={type:'indexeddb',dbName:'ai_phone_theme_db_v1',version:2,stores:[{name:'assets',keyPath:'id',autoIncrement:false,indexes:[],records:[{key:record.id,value:serialized}]}]};
      const rescueImported=await t.importSource(source,true,async ref=>collector.media.get(ref)||null);
      const rescueOriginal=await t.theme.getXiaohongshuOriginalBlob(t.ids[0]);
      const compare=async b=>b&&[...new Uint8Array(await b.arrayBuffer())].join()===[...new Uint8Array(before)].join();
      const excluded=await t.serial.serializeValue(record,undefined,{excludeMedia:true});
      return {errors:imported.errors,rescueErrors:rescueImported.errors,localEqual:await compare(restored),rescueEqual:await compare(rescueOriginal),excludedBytes:excluded.xiaohongshuOriginalBlob.dataUrl};
    });
    check('real local ZIP export/import restores byte-identical HD original',backupResult.localEqual&&backupResult.errors.length===0);
    check('real Rescue serializer and importer restore byte-identical HD original',backupResult.rescueEqual&&backupResult.rescueErrors.length===0);
    check('backup without media intentionally excludes HD bytes',backupResult.excludedBytes==='');
    await page.reload();await page.waitForFunction(()=>window.test);
    check('HD record survives page reload',await page.evaluate(async()=>{const r=await test.theme.readThemeAssetRecords(await new Promise(resolve=>{const q=indexedDB.open('ai_phone_theme_db_v1');q.onsuccess=()=>{const db=q.result,tx=db.transaction('assets'),r=tx.objectStore('assets').getAllKeys();r.onsuccess=()=>resolve(r.result);tx.oncomplete=()=>db.close();};}));return r.some(x=>x.xiaohongshuOriginalBlob?.size>0);}));
    const draftResult=await page.evaluate(async()=>{
      const t=window.test;t.resetDraft();const c=document.createElement('canvas');c.width=c.height=50;const b=await new Promise(r=>c.toBlob(r));
      const f=new File([b],'draft.png',{type:'image/png'});
      await t.draftUpload([f,f,f]);const first=t.draftState().draft.images.map(i=>i.assetId);t.clearDraft();await new Promise(r=>setTimeout(r,60));
      const removed=await Promise.all(first.map(id=>t.theme.getThemeAssetDataUrl(id)));
      await t.draftUpload([f]);const published=t.draftState().draft.images[0].assetId;await t.publish();t.clearDraft();await new Promise(r=>setTimeout(r,60));
      const protectedRecord=await t.theme.getXiaohongshuOriginalBlob(published);t.protect(published);await new Promise(r=>setTimeout(r,30));
      return {removed:removed.every(x=>x===null),publishedKept:protectedRecord?.size>0&&!!await t.theme.getXiaohongshuOriginalBlob(published),staged:t.draftState().staged.length};
    });
    check('clear draft deletes only its unpublished assets',draftResult.removed);
    check('published and externally referenced photos survive cleanup',draftResult.publishedKept&&draftResult.staged===0);
    const cancelled=await page.evaluate(async()=>{
      const t=window.test;t.resetDraft();const c=document.createElement('canvas');c.width=c.height=10;const b=await new Promise(r=>c.toBlob(r));
      window.deferSave=true;const uploading=t.draftUpload([new File([b],'cancel.png',{type:'image/png'})]);
      while(!window.pendingSave)await new Promise(r=>setTimeout(r,5));
      t.clearDraft();window.deferSave=false;window.pendingSave();await uploading;await new Promise(r=>setTimeout(r,60));
      return t.draftState().staged.length===0&&!t.draftState().draft.images?.length;
    });
    check('clear during upload discards late results without repopulating draft',cancelled);
    const quota=await page.evaluate(async()=>{
      const t=window.test;t.resetDraft();const c=document.createElement('canvas');c.width=c.height=10;const b=await new Promise(r=>c.toBlob(r));
      const count=()=>new Promise(resolve=>{const q=indexedDB.open('ai_phone_theme_db_v1');q.onsuccess=()=>{const db=q.result,tx=db.transaction('assets'),r=tx.objectStore('assets').count();r.onsuccess=()=>resolve(r.result);tx.oncomplete=()=>db.close();};});
      const before=await count();
      const put=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(value,...args){if(value?.xiaohongshuOriginalBlob)throw new DOMException('synthetic quota','QuotaExceededError');return put.call(this,value,...args);};
      let rejected=false;try{await t.assets.saveXiaohongshuImagePair(b,b);}catch(e){rejected=e.name==='QuotaExceededError';}finally{IDBObjectStore.prototype.put=put;}
      let unsupported=false;try{await t.assets.makeXiaohongshuThumbnail(new Blob(['not HEIC'],{type:'image/heic'}));}catch(e){unsupported=/解码/.test(e.message);}
      return {rejected,unsupported,active:activeUrls.size,recordsEqual:await count()===before};
    });
    check('quota rejects without orphan assets and unsupported HEIC gives explicit decode feedback',quota.rejected&&quota.unsupported&&quota.active===0&&quota.recordsEqual);
    check('no browser exceptions or unhandled rejections',errors.length===0&&await page.evaluate(()=>failures.length===0));
    console.log(`PASS: ${checks} Chromium media/gesture/resource/storage/backup checks`);
    await context.close();
  } finally {await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
