const assert = require('node:assert/strict');

module.exports = async function stickerScenarios({ page, check }) {
    await page.evaluate(() => window.lazyStickerTest.leave());
    await page.waitForFunction(() => !document.querySelector('.chat-room-wrapper'));
    await page.evaluate(() => window.lazyStickerTest.ready());
    await page.addStyleTag({ content: '.sticker-bounce { animation: none !important; }' });
    const stats = () => page.evaluate(() => window.lazyStickerTest.stats());
    const cache = () => page.evaluate(() => window.lazyStickerTest.cache.snapshot());
    const asset = async index => page.evaluate(i => window.lazyStickerTest.assets['lazy-A'][i].assetId, index);
    const settleReads = async () => page.waitForFunction(() => window.lazyStickerTest.cache.snapshot().inFlight === 0);
    const leave = async () => {
        await page.evaluate(() => window.lazyStickerTest.leave());
        await page.waitForFunction(() => !document.querySelector('.chat-sticker'));
        await settleReads();
    };
    const reset = async (defer = false) => { await leave(); await page.evaluate(d => window.lazyStickerTest.reset(d), defer); };
    const scene = async (stickers = [], group = false, olderSticker) => {
        await page.evaluate(({ stickers, group, olderSticker }) => window.lazyStickerTest.scene(stickers, group, olderSticker), { stickers, group, olderSticker });
        await page.waitForFunction(() => document.querySelectorAll('.chat-msg-wrapper[id^="message-"]').length === 50);
    };

    await reset(true); await scene([0]);
    await page.waitForFunction(() => window.lazyStickerTest.stats().active === 1);
    check(await page.locator('.chat-room-wrapper').getByText('Immediate text 48', { exact: true }).isVisible(), 'deferred sticker does not block 50 first-screen messages or visible text');
    check((await stats()).reads.length === 1, '30 assigned assets: only the rendered sticker starts resolving');
    const placeholder = page.locator('.chat-sticker-image[aria-busy=true]');
    check(await placeholder.count() === 1 && await page.locator('.chat-sticker-emoji').count() === 0, 'pending custom sticker never flashes same-name built-in emoji');
    const inner = await placeholder.locator('div').boundingBox();
    check(Math.abs(inner.width - 120) < 1 && Math.abs(inner.height - 120) < 1, 'pending local sticker has a fixed 120 by 120 transparent shell');
    await page.waitForTimeout(100); // Allow the room's initial scroll frame to settle.
    const before = await placeholder.boundingBox();
    await page.evaluate(() => window.lazyStickerTest.releaseAll());
    await page.waitForFunction(() => document.querySelector('.chat-sticker-image img')?.naturalWidth > 0);
    const after = await page.locator('.chat-sticker-image').boundingBox();
    check(['width', 'height', 'x', 'y'].every(k => Math.abs(before[k] - after[k]) < 1), 'resolved sticker replaces placeholder without changing its layout rectangle');

    await reset(true); await scene();
    await page.waitForTimeout(100);
    check((await stats()).reads.length === 0 && (await stats()).imageAssetReads.length === 0, 'text-only recent window reads none of 30 assigned sticker assets');

    await reset(true); await scene([1, 2], false, 3);
    await page.waitForFunction(() => window.lazyStickerTest.stats().active === 2);
    assert.deepEqual((await stats()).reads.sort(), [await asset(1), await asset(2)].sort());
    check(true, 'only visible A/B assets resolve; off-window history and other assigned stickers do not');
    await page.evaluate(() => window.lazyStickerTest.releaseAll()); await settleReads();
    assert.deepEqual([...new Set((await stats()).imageAssetReads)].sort(), [await asset(1), await asset(2)].sort());
    check(true, 'real single/bulk image asset APIs read only the visible A/B assets');

    await reset(true); await scene([], true);
    await page.waitForTimeout(100);
    check((await stats()).reads.length === 0 && (await stats()).imageAssetReads.length === 0, 'group text-only mount reads none of 90 member sticker assets');

    await reset(true); await scene([4, 4]);
    await page.waitForFunction(() => window.lazyStickerTest.stats().active === 1);
    check((await stats()).reads.length === 1 && await page.locator('.chat-sticker-image[aria-busy=true]').count() === 2, 'two rendered bubbles for one asset share one underlying resolve');
    await page.evaluate(() => window.lazyStickerTest.releaseAll()); await settleReads();
    await page.waitForFunction(() => [...document.querySelectorAll('.chat-sticker-image img')].filter(img => img.naturalWidth > 0).length === 2);
    check(true, 'deduplicated resolve fills both bubbles');

    await reset(true); await scene([5, 6, 7, 8, 9, 10]);
    await page.waitForFunction(() => window.lazyStickerTest.stats().active === 2);
    check((await stats()).reads.length === 2 && (await cache()).queued === 4, 'six different visible stickers start two reads and queue four');
    await page.evaluate(id => window.lazyStickerTest.release(id), await asset(5));
    await page.waitForFunction(() => window.lazyStickerTest.stats().reads.length === 3);
    check((await stats()).active === 2 && (await stats()).maxActive === 2, 'finishing one read starts exactly one queued asset');
    await page.evaluate(() => window.lazyStickerTest.releaseAll()); await settleReads();
    check((await stats()).reads.length === 6 && (await stats()).maxActive === 2, 'all six assets complete with at most two active resolves');

    // A started read may finish after unmount; the cancelled effect cannot update a replacement bubble.
    await reset(true); await scene([11]);
    await page.waitForFunction(() => window.lazyStickerTest.stats().active === 1);
    await page.evaluate(() => window.lazyStickerTest.leave());
    await page.waitForFunction(() => !document.querySelector('.chat-sticker'));
    await page.evaluate(() => window.lazyStickerTest.releaseAll()); await settleReads();
    check(await page.locator('.chat-sticker').count() === 0, 'in-flight asset completes safely after its bubble unmounts');

    await reset(true);
    await page.evaluate(() => {
        const t = window.lazyStickerTest;
        t.outcome(t.assets['lazy-A'][0].assetId, null);
        t.fail(t.assets['lazy-A'][1].assetId);
    });
    await scene([0, 1]);
    await page.waitForFunction(() => window.lazyStickerTest.stats().active === 2);
    check(await page.locator('.chat-sticker-image[aria-busy=true]').count() === 2, 'missing/rejecting local assets stay placeholders until resolution completes');
    await page.evaluate(() => window.lazyStickerTest.releaseAll()); await settleReads();
    await page.locator('.chat-sticker-emoji').waitFor(); await page.locator('.chat-sticker-fallback').waitFor();
    check(await page.locator('.chat-sticker-emoji').textContent() === '😊' && (await page.locator('.chat-sticker-fallback').textContent()).includes('lazy-A-sticker-1'), 'null/rejection enter built-in and label fallbacks without unhandled rejection');
    check((await cache()).inFlight === 0 && (await cache()).keys.length === 0, 'failed reads clear dedupe and concurrency slots without caching failures');
    await leave();
    await page.evaluate(() => { window.lazyStickerTest.reset(); window.lazyStickerTest.scene([1]); });
    await page.waitForFunction(() => document.querySelector('.chat-sticker-image img')?.naturalWidth > 0);
    check((await stats()).reads.length === 1, 'failed asset can retry successfully on a later mount');

    await reset();
    const lru = await page.evaluate(() => {
        const c = window.lazyStickerTest.cache;
        for (let i = 0; i < c.maxEntries; i++) c.set('entry-' + i, 'data:' + i);
        c.get('entry-0'); c.set('entry-32', 'data:32');
        const entries = c.snapshot();
        c.set('entry-0', 'updated');
        const updated = c.snapshot();
        const chars = updated.keys.reduce((sum, key) => sum + c.get(key).length, 0);
        c.reset(); c.set('big-old', 'x'.repeat(3 * 1024 * 1024)); c.set('big-new', 'y'.repeat(3 * 1024 * 1024));
        c.set('small', 'z'); const budget = c.snapshot();
        c.reset(); c.set('boundary', 'x'.repeat(c.maxChars)); const boundary = c.snapshot();
        c.set('boundary', 'x'.repeat(c.maxChars + 1)); const oversizedReplacement = c.snapshot();
        return { maxEntries: c.maxEntries, maxChars: c.maxChars, entries, updated, chars, budget, boundary, oversizedReplacement };
    });
    check(lru.maxEntries === 32 && lru.maxChars === 6 * 1024 * 1024, 'cache configured for 32 entries and 6 Mi data URL characters');
    check(lru.entries.keys.length === 32 && lru.entries.keys.includes('entry-0') && !lru.entries.keys.includes('entry-1'), 'cache get touches LRU: oldest entry evicted, recently accessed entry retained');
    check(lru.updated.chars === lru.chars && lru.updated.keys.at(-1) === 'entry-0', 'cache replacement updates character accounting and recency');
    check(lru.budget.chars <= lru.maxChars && !lru.budget.keys.includes('big-old') && lru.budget.keys.includes('big-new'), 'character budget evicts oldest even below entry limit');
    check(lru.boundary.chars === lru.maxChars && lru.oversizedReplacement.chars === 0 && lru.oversizedReplacement.keys.length === 0, 'exact-budget URL caches; oversized replacement is not retained');

    await reset();
    await page.evaluate(() => {
        const t = window.lazyStickerTest;
        const url = 'data:image/svg+xml,' + '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="blue"/><!--' + 'x'.repeat(t.cache.maxChars) + '--></svg>';
        t.outcome(t.assets['lazy-A'][12].assetId, url); t.scene([12]);
    });
    await page.waitForFunction(() => document.querySelector('.chat-sticker-image img')?.naturalWidth === 120);
    await settleReads();
    check((await cache()).keys.length === 0 && (await cache()).chars === 0, 'single oversized data URL displays normally but never enters module cache');

    await reset();
    await page.evaluate(() => window.lazyStickerTest.direct('微笑', 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"/>'));
    await page.locator('.chat-sticker-image img').waitFor();
    check((await stats()).reads.length === 0 && (await cache()).keys.length === 0, 'message stickerUrl takes priority and bypasses local asset resolver/cache');

    await reset();
    const externalUrl = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"/>';
    await page.evaluate(url => { window.lazyStickerTest.external(url); window.lazyStickerTest.direct('external-sticker'); }, externalUrl);
    await page.locator('.chat-sticker-image img').waitFor();
    check(await page.locator('.chat-sticker-image img').getAttribute('src') === externalUrl && (await stats()).reads.length === 0 && (await cache()).keys.length === 0, 'externalUrl renders directly and stays outside data URL LRU');

    await reset();
    await page.evaluate(() => window.lazyStickerTest.direct('lazy-A-sticker-13'));
    await page.waitForFunction(() => document.querySelector('.chat-sticker-image img')?.naturalWidth > 0); await settleReads();
    await page.evaluate(() => { window.lazyStickerTest.rename(13, 'renamed-sticker'); window.lazyStickerTest.direct('renamed-sticker'); });
    await page.locator('img[alt="renamed-sticker"]').waitFor();
    check((await stats()).reads.length === 1 && (await cache()).keys.length === 1, 'rename reuses assetId cache without creating a stale name entry');
    await page.evaluate(() => { window.lazyStickerTest.shareWithB(13); window.lazyStickerTest.direct('renamed-sticker', undefined, 'lazy-B'); });
    await page.locator('img[alt="renamed-sticker"]').waitFor();
    check((await stats()).reads.length === 1 && (await cache()).keys.length === 1, 'same asset referenced by another character reuses one cache entry');
    const replacement = await page.evaluate(() => window.lazyStickerTest.replaceAssignment(13));
    await page.evaluate(() => window.lazyStickerTest.direct('renamed-sticker'));
    await page.waitForFunction(() => window.lazyStickerTest.stats().reads.length === 2);
    await settleReads();
    check((await stats()).reads.at(-1) === replacement && (await cache()).keys.includes(replacement), 'changed pack assignment resolves new asset identity instead of reusing old name image');
};
