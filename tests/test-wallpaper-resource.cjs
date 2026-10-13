'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function buildHost(options = {}) {
    const source = fs.readFileSync(require('path').join(__dirname, '../lib/chat-background-resource.ts'), 'utf8');
    const transpiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
    const contentById = new Map();
    const reads = new Map();
    const objects = new Map();
    const revoked = [];
    let nextId = 0, currentTime = 0;
    let timers = [], nextTimer = 0, yields = 0;
    const pendingReads = [];
    const clockSetTimeout = (fn, ms) => { if (ms === 0) { yields++; queueMicrotask(fn); return ++nextTimer; } const id = ++nextTimer; timers.push({ fn, time: currentTime + ms, id }); return id; };
    const clockClearTimeout = id => { timers = timers.filter(t=>t.id!==id); };
    const clockAdvance = duration => {
        const until = currentTime + duration;
        for (;;) {
            timers.sort((a,b)=>a.time-b.time);
            if (!timers.length || timers[0].time > until) break;
            const timer = timers.shift(); currentTime = timer.time; timer.fn();
        }
        currentTime = until;
    };
    const exports = {};
    const sandbox = {
        exports,
        require(name) {
            // Keep perf.1 fallback behavior under test; preview behavior has
            // its own focused test suite.
            if (name === '@/lib/chat-wallpaper-preview') {
                return { getChatWallpaperRevision:()=>"test",onChatWallpaperInvalidated:()=>()=>{},getOrCreateChatWallpaperPreview: async () => { throw new Error('Mock: no preview'); } };
            }
            assert.equal(name, '@/lib/chat-asset-storage');
            return { getChatImageFromIndexedDB: async id => {
                reads.set(id, (reads.get(id) ?? 0) + 1);
                if (id === 'reject') throw Error('Simulated IDB failure');
                if (options.deferReads) await new Promise(resolve => pendingReads.push(resolve));
                return contentById.get(id) ?? null;
            } };
        },
        Blob,
        Uint8Array,
        atob,
        Date: options.slowDecode ? { now: () => (currentTime += 9) } : Date,
        setTimeout: clockSetTimeout,
        clearTimeout: clockClearTimeout,
        URL: {
            createObjectURL(blob) { if (options.failCreate) throw Error('Synthetic URL failure'); const url = `blob:fake/${++nextId}`; objects.set(url, blob); return url; },
            revokeObjectURL(url) { assert(objects.has(url)); revoked.push(url); objects.delete(url); },
        },
    };
    vm.runInNewContext(transpiled.outputText, sandbox, { filename: 'chat-background-resource.js' });
    return { acquire: exports.acquireChatBackground, contentById, reads, objects, revoked, advance: clockAdvance, pendingReads, get yields() { return yields; } };
}

const unhandled = [];
process.on('unhandledRejection', error => unhandled.push(error));
(async () => {
    const host = buildHost();
    const data = Buffer.from('preserve-original-bytes-0123456789');
    const jpegUrl = `data:image/jpeg;base64,${data.toString('base64')}`;
    host.contentById.set('chat_bg_A', jpegUrl);
    host.contentById.set('chat_bg_B', `data:image/png;base64,${Buffer.from('other-wallpaper').toString('base64')}`);
    host.contentById.set('bad_encoding', 'data:image/jpeg,legacy_percent_escape');
    host.contentById.set('huge', `data:image/png;base64,${Buffer.alloc(512 * 1024, 42).toString('base64')}`);

    // Concurrent calls share one IDB read and a single original-byte Blob URL.
    const [a,b] = await Promise.all([host.acquire('chat_bg_A'), host.acquire('chat_bg_A')]);
    assert(a.url.startsWith('blob:'));
    assert.equal(a.url, b.url);
    assert.equal(host.reads.get('chat_bg_A'), 1);
    const blob = host.objects.get(a.url);
    assert.equal(blob.type, 'image/jpeg');
    assert.deepEqual(Buffer.from(await blob.arrayBuffer()), data);
    a.release(); a.release(); // Release must be idempotent.
    host.advance(9000);
    assert(host.objects.has(b.url), 'must not revoke still-in-use background');
    b.release();
    // Quick return uses same object URL with no read, and cancels pending release.
    host.advance(6000);
    const quickReturn = await host.acquire('chat_bg_A');
    assert.equal(quickReturn.url, a.url);
    assert.equal(host.reads.get('chat_bg_A'), 1);
    quickReturn.release();
    host.advance(8000);
    assert(host.revoked.includes(a.url));
    const afterExpiry = await host.acquire('chat_bg_A');
    assert.notEqual(afterExpiry.url, a.url); assert.equal(host.reads.get('chat_bg_A'), 2);
    afterExpiry.release(); host.advance(8000);

    // Large base64 is decoded in bounded chunks with exact byte identity.
    const big = await host.acquire('huge');
    assert.equal(host.objects.get(big.url).size, 512*1024);
    assert.equal(Buffer.from(await host.objects.get(big.url).arrayBuffer()).subarray(-64).toString('hex'), Buffer.alloc(64,42).toString('hex'));
    big.release();
    // Switching to another wallpaper evicts previous idle entry immediately.
    const second = await host.acquire('chat_bg_B');
    assert(host.revoked.includes(big.url));
    second.release();

    // Distinct in-flight assets must not evict URLs before their leases arrive.
    const concurrent = buildHost();
    concurrent.contentById.set('a', jpegUrl); concurrent.contentById.set('b', jpegUrl);
    const pair = await Promise.all([concurrent.acquire('a'), concurrent.acquire('b')]);
    assert(pair.every(lease => concurrent.objects.has(lease.url)), 'pending consumers retain valid URLs');
    pair.forEach(lease => lease.release()); concurrent.advance(8000);
    assert.equal(concurrent.objects.size, 0);

    // Releasing one of multiple users cannot revoke a CSS resource held by another.
    const owners = buildHost(); owners.contentById.set('shared', jpegUrl);
    const held = await owners.acquire('shared'), peer = await owners.acquire('shared');
    held.release(); owners.advance(8000);
    assert(owners.objects.has(peer.url)); peer.release(); owners.advance(7999);
    assert(owners.objects.has(peer.url)); owners.advance(1); assert.equal(owners.objects.size, 0);

    // Cancellation consumers still receive and immediately release their late lease.
    const deferred = buildHost({deferReads: true}); deferred.contentById.set('late', jpegUrl);
    const requests = [deferred.acquire('late'), deferred.acquire('late')];
    for (let i = 0; i < 10 && deferred.pendingReads.length === 0; i++) await Promise.resolve();
    assert.equal(deferred.pendingReads.length, 1);
    deferred.pendingReads.shift()(); const late = await Promise.all(requests);
    late.forEach(lease => lease.release()); deferred.advance(8000);
    assert.equal(deferred.objects.size, 0);

    // Forced slow conversion yields while preserving all chunks, not only the tail.
    const slow = buildHost({slowDecode: true});
    const original = Buffer.alloc(1024 * 1024); for (let i = 0; i < original.length; i++) original[i] = i % 251;
    slow.contentById.set('slow', 'data:image/png;base64,' + original.toString('base64'));
    const converted = await slow.acquire('slow');
    assert(slow.yields > 0); assert.deepEqual(Buffer.from(await slow.objects.get(converted.url).arrayBuffer()), original);
    converted.release(); slow.advance(8000); assert.equal(slow.objects.size, 0);

    // Object URL failures preserve the authoritative original and are retryable.
    const failed = buildHost({failCreate: true}); failed.contentById.set('fail', jpegUrl);
    const fallback = await failed.acquire('fail'); assert.equal(fallback.url, jpegUrl); fallback.release();
    assert.equal(failed.objects.size, 0); await failed.acquire('fail'); assert.equal(failed.reads.get('fail'), 2);

    // No background, remote source, inline source and malformed data preserve original behavior.
    assert.equal(await host.acquire(''), null);
    const remote = await host.acquire('https://example.com/background.jpg');
    assert.equal(remote.url, 'https://example.com/background.jpg');remote.release();
    const direct = await host.acquire(jpegUrl);
    assert.equal(direct.url, jpegUrl);direct.release();
    host.contentById.set('invalid_base64', 'data:image/png;base64,invalid%%%');
    const invalid = await host.acquire('invalid_base64');
    assert.equal(invalid.url, 'data:image/png;base64,invalid%%%'); invalid.release();
    const legacy = await host.acquire('bad_encoding');
    assert.equal(legacy.url, 'data:image/jpeg,legacy_percent_escape'); legacy.release();
    assert.equal(await host.acquire('missing'), null);
    await assert.rejects(host.acquire('reject'), /Simulated IDB failure/);
    await assert.rejects(host.acquire('reject'), /Simulated IDB failure/);
    assert.equal(host.reads.get('reject'), 2, 'failed IDB read should be retryable');
    host.advance(10000);
    assert.equal(host.objects.size, 0, 'no retained object URLs after idle expiry');

    // Check the actual component rather than requiring an uncommitted patch artifact.
    const room = fs.readFileSync(require('path').join(__dirname, '../components/chat/chat-room.tsx'), 'utf8');
    assert(room.includes('backgroundPosition: \"center\"'));
    assert(room.includes('backgroundSize: \"cover\"'));
    assert(room.includes('chat-background-resource'));
    // Internal cleanup must handle rejected reads without a detached rejection.
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
    console.log('PASS: blob byte identity / MIME / shared read / refcounts / bounded reuse / revoke / fallback / missing IDB / retry / original CSS');
})().catch(error => { console.error(error); process.exitCode = 1; });
