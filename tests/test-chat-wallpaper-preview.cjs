'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib/chat-wallpaper-preview.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

function createHost({ withBitmap = true, cachedRows = null, failDecode = false } = {}) {
    const reads = new Map(), contents = new Map(), dimensions = new Map();
    const draws = [], revoked = [], createdUrls = [];
    const exports = {};
    const URL = {
        createObjectURL(blob) { const url = `blob:test/${createdUrls.length}`; createdUrls.push({ url, blob }); return url; },
        revokeObjectURL(url) { revoked.push(url); },
    };
    const createImageBitmap = async blob => {
        if (failDecode) throw new RangeError("Synthetic decode allocation failure");
        const [width, height] = dimensions.get(blob.size) || [2200, 2200];
        return { width, height, close() { /* tracked with no retained canvas */ } };
    };
    const document = { createElement(type) {
        assert.equal(type, 'canvas');
        const el = { width: 0, height: 0,
            getContext() { return { imageSmoothingEnabled: false, imageSmoothingQuality: 'low', drawImage(img, x, y, w, h) { draws.push({ x, y, w, h, originalWidth: img.width }); } }; },
            toBlob(callback, type) { callback(new Blob([`preview:${el.width}x${el.height}`], {type})); },
        };
        return el;
    } };
    // Cache-hit fake deliberately does not implement writes: if the hot path
    // accidentally reads/rebuilds the source the test detects that separately.
    const indexedDB = cachedRows ? { open() {
        const request = {};
        queueMicrotask(() => {
            request.result = { objectStoreNames: {contains: () => true}, close() {},
                transaction() {return {objectStore() {return {get(id) {
                    const req = {};
                    queueMicrotask(() => { req.result = cachedRows.get(id); req.onsuccess?.(); });
                    return req;
                }};}};},
            };
            request.onsuccess?.();
        });
        return request;
    }} : undefined;
    const stamps = new Map();
    const host = { exports, Blob, Uint8Array, atob, Map, Date, performance, setTimeout, URL, document, indexedDB,
        crypto: require('node:crypto').webcrypto,
        localStorage: {getItem: id => stamps.get(id) || 'test-stamp', setItem:(id,value)=>stamps.set(id,value)},
        ...(withBitmap ? {createImageBitmap} : {}),
        require(name) {
            assert.equal(name, '@/lib/chat-asset-storage');
            return {getChatImageFromIndexedDB: async id => { reads.set(id, (reads.get(id) || 0) + 1); return contents.get(id) || null; }};
        },
    };
    vm.runInNewContext(output, host, {filename:'chat-wallpaper-preview.js'});
    return { mod: exports, reads, contents, dimensions, draws, revoked, createdUrls };
}

(async () => {
    const h = createHost();
    assert.deepEqual(JSON.parse(JSON.stringify(h.mod.calculateWallpaperPreviewSize(2200, 2200))), {width:1536,height:1536});
    assert.deepEqual(JSON.parse(JSON.stringify(h.mod.calculateWallpaperPreviewSize(1000, 2000))), {width:768,height:1536});
    assert.deepEqual(JSON.parse(JSON.stringify(h.mod.calculateWallpaperPreviewSize(600, 900))), {width:600,height:900});
    assert.throws(() => h.mod.calculateWallpaperPreviewSize(-1, 10), /Invalid/);
    const pngChunk = (name, content) => {const n=Buffer.alloc(4);n.writeUInt32BE(content.length);return Buffer.concat([n,Buffer.from(name),content,Buffer.alloc(4)]);};
    const pngRaw = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',Buffer.alloc(13)),pngChunk('IDAT',Buffer.from('known-source-bytes')),pngChunk('IEND',Buffer.alloc(0))]);
    h.contents.set('a', `data:image/png;base64,${pngRaw.toString('base64')}`);
    h.dimensions.set(pngRaw.length, [2200, 1100]);
    const [a, b] = await Promise.all([h.mod.getOrCreateChatWallpaperPreview('a'), h.mod.getOrCreateChatWallpaperPreview('a')]);
    assert.equal(h.reads.get('a'),1, 'concurrent requests use only one source read');
    assert.equal(a.kind,'blob'); assert.strictEqual(a,b);
    assert.equal(a.blob.type,'image/png');
    assert.equal(h.draws[0].w,1536); assert.equal(h.draws[0].h,768);
    assert.equal(await a.blob.text(),'preview:1536x768');
    assert.equal(h.draws.length,1);
    h.contents.set('gif', 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=');
    const gif=await h.mod.getOrCreateChatWallpaperPreview('gif');
    assert.equal(gif.kind,'blob'); assert.equal(await gif.blob.text(),Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=','base64').toString()); assert.equal(h.draws.length,1,'GIF is never flattened');
    h.contents.set('svg', 'data:image/svg+xml;base64,'+Buffer.from('<svg/>').toString('base64'));
    assert.equal((await h.mod.getOrCreateChatWallpaperPreview('svg')).kind,'blob');
    h.contents.set('apng', 'data:image/png;base64,'+Buffer.from('PNG-preamble-acTL-animation').toString('base64'));
    assert.equal((await h.mod.getOrCreateChatWallpaperPreview('apng')).kind,'blob','APNG must retain animation');
    const animatedWebp = Buffer.alloc(64); animatedWebp.write('VP8X', 12); animatedWebp[20]=2;
    h.contents.set('animated-webp', 'data:image/webp;base64,'+animatedWebp.toString('base64'));
    assert.equal((await h.mod.getOrCreateChatWallpaperPreview('animated-webp')).kind,'blob','animated WebP must retain animation');
    const jpegRaw=Buffer.from([0xff,0xd8,0xff,0xda,0,2,1,2,3,0xff,0xd9]);h.contents.set('jpeg','data:image/jpeg;base64,'+jpegRaw.toString('base64'));
    h.dimensions.set(jpegRaw.length,[1000,900]);
    const small=await h.mod.getOrCreateChatWallpaperPreview('jpeg');
    assert.equal(small.kind,'blob');assert.equal(Buffer.from(await small.blob.arrayBuffer()).toString(),jpegRaw.toString(),'already small images keep original pixels/bytes');
    assert.equal(await h.mod.getOrCreateChatWallpaperPreview('missing'),null);
    assert.equal(h.createdUrls.length,0,'ImageBitmap path does not retain temporary object URLs');
    const saved = new Blob(['small-cached-pixels'], {type:'image/webp'});
    const h2=createHost({cachedRows:new Map([['already-prepared',{assetId:'already-prepared',version:1,blob:saved,createdAt:1,sourceStamp:'test-stamp',digest:require('node:crypto').createHash('sha256').update('small-cached-pixels').digest('hex')}]])});
    const hot=await h2.mod.getOrCreateChatWallpaperPreview('already-prepared');
    assert.equal(hot.kind,'blob'); assert.strictEqual(hot.blob,saved);
    assert.equal(h2.reads.get('already-prepared'),undefined,'cache hit must not read full-size source');
    // Animation control beyond the former 64 KiB prefix must not be flattened.
    const late = Buffer.concat([pngRaw.subarray(0,33),pngChunk('tEXt',Buffer.alloc(100000)),pngChunk('acTL',Buffer.alloc(8)),pngChunk('IDAT',Buffer.alloc(1)),pngChunk('IEND',Buffer.alloc(0))]);
    h.contents.set('late-apng','data:image/png;base64,'+late.toString('base64'));
    const drawCount=h.draws.length;const animation=await h.mod.getOrCreateChatWallpaperPreview('late-apng');
    assert.deepEqual(Buffer.from(await animation.blob.arrayBuffer()),late);assert.equal(h.draws.length,drawCount);
    // Embedded ICC profiles pass through intact rather than being stripped by canvas.
    const iccJpeg=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe2,0,16]),Buffer.from('ICC_PROFILE\0'),Buffer.from([1,1]),jpegRaw.subarray(2)]);
    const iccPng=Buffer.concat([pngRaw.subarray(0,33),pngChunk('iCCP',Buffer.from('profile')),pngRaw.subarray(33)]);
    const iccWebp=Buffer.alloc(22);iccWebp.write('RIFF');iccWebp.writeUInt32LE(14,4);iccWebp.write('WEBP',8);iccWebp.write('ICCP',12);iccWebp.writeUInt32LE(2,16);
    for(const [id,mime,raw] of [['icc-jpeg','image/jpeg',iccJpeg],['icc-png','image/png',iccPng],['icc-webp','image/webp',iccWebp]]) {
        h.contents.set(id,`data:${mime};base64,${raw.toString('base64')}`);
        const result=await h.mod.getOrCreateChatWallpaperPreview(id);
        assert.deepEqual(Buffer.from(await result.blob.arrayBuffer()),raw);assert.equal(h.draws.length,drawCount,'profile-tagged originals must not enter canvas');
    }
    const fail=createHost({failDecode:true});fail.contents.set('failed','data:image/jpeg;base64,'+jpegRaw.toString('base64'));
    assert.equal(await fail.mod.getOrCreateChatWallpaperPreview('failed'),null);
    assert.equal(await fail.mod.getOrCreateChatWallpaperPreview('failed'),null);assert.equal(fail.reads.get('failed'),1,'allocation failure must not repeatedly decode or reread originals');
    console.log('PASS: dimensions, aspect ratio, chunk decode, media compatibility, one-time preparation, missing source, and one consumer');
})().catch(e=>{console.error(e);process.exitCode=1});
