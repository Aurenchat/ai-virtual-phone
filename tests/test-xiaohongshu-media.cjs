'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

async function main() {
  const theme = read('lib/theme-storage.ts');
  const app = read('components/xiaohongshu/xiaohongshu-app.tsx');
  const engine = read('lib/xiaohongshu-engine.ts');
  const viewer = read('components/xiaohongshu/xhs-image-viewer.tsx');
  const lazy = read('components/xiaohongshu/xhs-lazy-image.tsx');
  const assets = read('lib/xiaohongshu-image-assets.ts');
  const modules = read('lib/data-management/modules.ts');
  const serializer = read('lib/data-management/serializers.ts');
  assert(modules.includes('dbName: "ai_phone_theme_db_v1"'), 'must be in backup module manifest');
  assert(serializer.includes('value instanceof Blob'), 'backup must serialize full Blob media');
  assert(theme.includes('xiaohongshuOriginalBlob?: Blob'), 'original Blob must live in existing backup-visible asset record');
  assert(theme.includes('attachXiaohongshuOriginalBlob'), 'attached original must be stored transactionally');
  assert(theme.includes('getXiaohongshuOriginalBlob'));
  assert(engine.includes('resolveXiaohongshuVisionImages(note, getXiaohongshuVisionDataUrl)'), 'nine-image input should use complete frame');
  assert(!app.includes('sourceY = Math.round'), 'old center crop must be removed');
  assert(app.includes('makeXiaohongshuThumbnail(file)'));
  assert(app.includes('saveXiaohongshuImagePair(file, preview.blob)'));
  assert(app.includes('for (const file of files.slice(0, allowed))'), 'sequential image encoding for iOS');
  assert(!app.includes('...state.notes.flatMap(note => (note.imageAssetIds'), 'eager load all saved notes must be removed');
  assert(app.includes('XhsLazyImage'), 'list should use lazy thumbnail component');
  assert(lazy.includes('IntersectionObserver') && lazy.includes('setSrc(null)'), 'offscreen thumbnails should release state');
  assert(viewer.includes('URL.revokeObjectURL'), 'viewer object URLs should be freed');
  assert(viewer.includes('readXiaohongshuFullImage(id)'), 'viewer reads only current image');
  assert(!viewer.includes('Promise.all'), 'viewer must not preload all full-resolution images');
  for (const [file, code] of [
    ['lib/xiaohongshu-image-assets.ts',assets],
    ['components/xiaohongshu/xhs-lazy-image.tsx',lazy],
    ['components/xiaohongshu/xhs-image-viewer.tsx',viewer],
  ]) {
    const result=ts.transpileModule(code,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
    const failures=(result.diagnostics||[]).filter(item=>item.category===ts.DiagnosticCategory.Error);
    assert.deepEqual(failures.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],`${file} must parse`);
  }

  // Execute real helper logic with mocked image/asset storage. Exercise non-cropped geometry,
  // original-byte attachment, fallback, missing assets and API resize separately.
  const originalById = new Map();
  const thumbnails = new Map();
  let nextId = 0;
  let savedBlob = null;
  let canvasOps = [];
  const revoked=[];
  class MockImage {
    naturalWidth=800; naturalHeight=2400;
    set src(value) { this.srcValue=value; queueMicrotask(()=>this.onload?.()); }
  }
  class MockFileReader {
    readAsDataURL(blob) { this.result=`data:image/jpeg;base64,${Buffer.from('size='+blob.size).toString('base64')}`;queueMicrotask(()=>this.onload?.()); }
  }
  const context={
    console, exports:{}, Blob, FileReader:MockFileReader, Image:MockImage,
    URL: {createObjectURL(){return 'blob:fake/'+(++nextId)},revokeObjectURL(url){revoked.push(url)}},
    document:{createElement(tag){assert.equal(tag,'canvas');return {
      width:0,height:0,
      getContext(){return {fillRect(){},drawImage(...args){canvasOps.push(args)}}},
      toBlob(callback){const blob=new Blob(['thumbnail'],{type:'image/jpeg'});savedBlob=blob;callback(blob)}
    }}},
    require(name){if(name==='./chat-asset-storage')return {
      async saveChatImageToIndexedDB(blob){const id='thumb-'+(thumbnails.size+1);thumbnails.set(id,`data:image/jpeg;base64,${Buffer.from('thumb').toString('base64')}`);return id},
      async getChatImageFromIndexedDB(id){return thumbnails.get(id)||null}
    };if(name==='./theme-storage')return {
      async attachXiaohongshuOriginalBlob(id,blob){originalById.set(id,blob)},
      async getXiaohongshuOriginalBlob(id){return originalById.get(id)||null},
      async deleteThemeAsset(id){thumbnails.delete(id)}
    };throw Error('unexpected require '+name)}
  };
  const js=ts.transpileModule(assets,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(js,context);
  const m=context.exports;
  const original=new Blob([Buffer.alloc(8192,0x44)],{type:'image/jpeg'});
  const resized=await m.makeXiaohongshuThumbnail(original);
  assert.equal(resized.width,320);assert.equal(resized.height,960);
  assert.equal(canvasOps.length,1);
  assert.equal(canvasOps[0].length,5,'drawImage must take full image, no x/y crop');
  assert.equal(canvasOps[0][3],320);assert.equal(canvasOps[0][4],960);
  const id=await m.saveXiaohongshuImagePair(original,resized.blob);
  assert.equal(id,'thumb-1'); assert.strictEqual(originalById.get(id),original,'full byte blob must be stored uncompressed');
  assert.strictEqual(await m.readXiaohongshuFullImage(id),original);
  assert.match(await m.getXiaohongshuVisionDataUrl(id),/^data:image\/jpeg;base64,/);
  assert.equal(canvasOps[1][3],533);assert.equal(canvasOps[1][4],1600,'model input should use separate complete-image budget');
  assert.equal(await m.getXiaohongshuVisionDataUrl('legacy'), null);
  assert.equal(m.xhsOriginalFileError(new Blob([new Uint8Array(21*1024*1024)],{type:'image/jpeg'})),'单张图片不能超过 20 MB。');
  assert.equal(m.xhsOriginalFileError(original),null);
  assert(revoked.length>=2,'blob preview resources should be released');
  console.log('PASS: no crop / uncompressed original / same-store contract / lazy thumbs / viewer lifecycle / legacy support / separate vision resize / syntax');
}
main().catch(e=>{console.error(e);process.exitCode=1});
