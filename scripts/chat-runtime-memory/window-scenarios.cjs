const assert = require('node:assert/strict');

module.exports = async function ({ page, check }) {
    const state = () => page.evaluate(() => window.__windowState);
    const reads = () => page.evaluate(() => window.__windowReads.filter(r => r.sessionId === window.__windowState.sessionId));
    const leave = async () => { await page.evaluate(() => window.windowTest.leave()); await page.waitForFunction(() => !document.querySelector('.chat-room-wrapper')); };
    const open = async (count, mixed = false, group = false) => {
        const scene = await page.evaluate(({ count, mixed, group }) => window.windowTest.scene(count, mixed, group), { count, mixed, group });
        await page.waitForFunction(id => window.__windowState?.sessionId === id, scene.id);
        return scene;
    };
    const more = async size => {
        await page.getByText('查看更多消息', { exact: true }).click();
        await page.waitForFunction(size => window.__windowState.ids.length === size, size);
    };
    for (const count of [0, 1, 49, 50, 51, 80, 81, 110, 2000]) {
        const scene = await open(count);
        assert.deepEqual((await state()).ids, scene.ids.slice(-50));
        check((await state()).hasMore === (count > 50), `${count} history: exact recent window and hasMore`);
        const first = (await reads())[0];
        check(first.limit === 51 && first.returned === Math.min(51, count), `${count} history: initial request bounded to 51`);
        if (count > 50) {
            await more(Math.min(80, count));
            assert.deepEqual((await state()).ids, scene.ids.slice(-80));
            check((await state()).hasMore === (count > 80) && (await reads()).at(-1).limit === 81, `${count} history: +30 uses limit 81 and sentinel`);
        }
        if (count === 110) {
            await more(110);
            assert.deepEqual((await state()).ids, scene.ids);
            check(!(await state()).hasMore && (await reads()).at(-1).limit === 111, '50 -> 80 -> 110 uses bounded stored-row limits');
            assert.deepEqual(await page.evaluate(() => window.windowTest.persistedIds()), scene.ids);
            check(true, 'window reads leave persisted history unchanged');
        }
        await leave();
    }

    for (const group of [false, true]) {
        const scene = await open(110, true, group);
        check((await state()).ids.length === 50 && await page.locator('.chat-msg-wrapper[id^="message-"]').count() < 50, `${group ? 'group' : 'private'} mixed history: stored rows differ from visible bubbles`);
        check(!(await page.getByText('Hidden tool 60', { exact: true }).isVisible()), 'stored tool result remains hidden from the message projection');
        check(await page.locator('.chat-sys-msg').filter({ hasText: '语音通话 0:01' }).count() === 1 && await page.locator('.chat-vc-group-border').count() === 0, 'call group remains collapsed');
        await page.evaluate(() => { window.__windowActions.injectTransient(); window.__windowActions.transient(); });
        await page.getByText('Synthetic preview', { exact: true }).waitFor();
        await more(80);
        assert.deepEqual((await state()).ids, scene.ids.slice(-80));
        check((await reads()).at(-1).limit === 81, 'transient rows and response projections do not inflate stored-row request');
        const batch = await page.evaluate(() => window.windowTest.rows().filter(m => m.responseBatchId));
        check(batch.length === 4 && batch.every(m => m.responseBatchId === 'window-batch'), 'response batch identity remains intact');
        await leave(); await page.evaluate(() => window.windowTest.enter());
        await page.waitForFunction(id => document.querySelector('.chat-room-wrapper') && window.__windowState.sessionId === id && window.__windowState.ids.length === 50, scene.id);
        assert.deepEqual((await state()).ids, scene.ids.slice(-50));
        check(true, 'reenter restores latest 50 with mixed/group history');
        await leave();
    }

    const scene = await open(110);
    // Pin a real visible message and compare its offset after prepending history.
    const anchor = scene.ids[75];
    await page.locator(`[id="message-${anchor}"]`).evaluate(node => { const el = node.closest('.chat-scroll-anchored'); el.scrollTop = node.offsetTop; });
    const offset = () => page.locator(`[id="message-${anchor}"]`).evaluate(node => node.getBoundingClientRect().top - node.closest('.chat-scroll-anchored').getBoundingClientRect().top);
    const before = await offset();
    // Evaluate click avoids Playwright scrolling the top-of-history button first.
    await page.getByText('查看更多消息', { exact: true }).evaluate(button => button.click());
    await page.waitForFunction(() => window.__windowState.ids.length === 80);
    check(Math.abs((await offset()) - before) < 2, 'load-more preserves the existing message scroll anchor');

    await page.getByRole('button', { name: '更多', exact: true }).click();
    await page.getByText('查找聊天记录', { exact: true }).click();
    await page.getByPlaceholder('搜索聊天记录...').fill('Window row 2');
    await page.getByRole('button', { name: '搜索聊天记录', exact: true }).click();
    await page.getByText('Window row 2', { exact: true }).click();
    await page.waitForFunction(id => !!document.getElementById('message-' + id), scene.ids[2]);
    check((await reads()).some(r => r.limit === null && r.returned === 110), 'search/jump retains full-history query');
    check((await state()).ids.includes(scene.ids[2]), 'search jump expands the window to the stored target');

    await page.evaluate(() => window.__windowActions.quote(window.windowTest.rows()[2]));
    await page.locator('.chat-quote-bar').waitFor();
    check(await page.locator('.chat-quote-bar').textContent().then(t => t.includes('Window row 2')), 'quote points to the original stored message');
    await page.evaluate(() => window.__windowActions.edit(window.windowTest.rows()[2]));
    await page.locator('.chat-html-overlay textarea').fill('Edited stored window row');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.getByText('Edited stored window row', { exact: true }).first().waitFor();
    check(await page.evaluate(() => window.windowTest.rows()[2].content === 'Edited stored window row'), 'edit persists the original message ID');

    await page.evaluate(ids => window.__windowActions.select(ids), [scene.ids[4], scene.ids[6]]);
    await page.waitForTimeout(50);
    await page.evaluate(() => window.__windowActions.deleteSelected());
    await page.waitForFunction(() => window.windowTest.rows().length === 108);
    assert.deepEqual(await page.evaluate(() => window.windowTest.persistedIds()), scene.ids.filter((_, i) => i !== 4 && i !== 6));
    check(true, 'batch delete removes only selected stored IDs after search expansion');
    await leave();
};
