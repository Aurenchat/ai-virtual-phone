import path from "node:path";

function wav(seconds = 5) {
    const samples = 8000 * seconds;
    const buffer = Buffer.alloc(44 + samples * 2);
    buffer.write("RIFF"); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write("WAVEfmt ", 8);
    buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
    buffer.write("data", 36); buffer.writeUInt32LE(samples * 2, 40);
    return buffer;
}

function pdfPages(texts) {
    const font = 3 + texts.length * 2;
    const objects = ["<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Kids [${texts.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${texts.length} >>`];
    texts.forEach((text, i) => {
        const stream = text ? `BT /F1 18 Tf 40 720 Td (${text}) Tj ET` : "";
        objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${4 + i * 2} 0 R >>`, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    });
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    let pdf = "%PDF-1.4\n"; const offsets = [0];
    objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(offset => String(offset).padStart(10, "0") + " 00000 n \n").join("");
    return [...Buffer.from(pdf + `trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xref}\n%%EOF`)];
}

export async function runReadingTtsBrowser({ page, mobile, check, pdfFixture, testPdf, output }) {
    const requests = [], errors = [];
    let delay = 0, fail = false;
    page.on("pageerror", error => errors.push(error.message));
    const audio = wav();
    await page.route(/\/(audio\/speech|t2a_v2)$/, async route => {
        requests.push(JSON.parse(route.request().postData()));
        if (delay) await new Promise(resolve => setTimeout(resolve, delay));
        if (fail) return route.fulfill({ status: 503, body: "test offline" });
        await route.fulfill(route.request().url().endsWith("t2a_v2")
            ? { contentType: "application/json", body: JSON.stringify({ data: { audio: audio.toString("hex") } }) }
            : { contentType: "audio/wav", body: audio });
    });
    await page.evaluate(() => {
        const NativeAudio = window.Audio;
        window.Audio = function(...args) { const element = new NativeAudio(...args); window.readingTestAudio = element; return element; };
    });
    const controls = page.locator(".reading-tts-controls");
    const body = page.locator('[data-ui="body"]');
    const status = async value => {
        try { await page.waitForFunction(value => document.querySelector('.reading-tts-controls')?.getAttribute('data-status') === value, value); }
        catch (error) { console.error("TTS state at failure:", await controls.textContent()); throw error; }
    };
    const click = name => page.getByRole("button", { name, exact: true }).click();
    const mount = async options => {
        await page.evaluate(options => window.readingQuoteTest.mountTts(options), options);
        await controls.waitFor(); await page.waitForTimeout(300);
    };
    const highlight = () => page.locator('[data-ui="body"] [data-reading-tts-active="true"]').first();
    const endClip = async () => { await page.evaluate(() => { window.readingTestAudio.currentTime = window.readingTestAudio.duration; }); await page.waitForTimeout(130); };
    const selectParagraph = async (chapter, paragraph) => {
        const element = body.locator(`[data-reading-chapter="${chapter}"][data-reading-paragraph="${paragraph}"]`).first();
        await element.scrollIntoViewIfNeeded();
        await element.evaluate(el => {
            const range = document.createRange(); range.setStart(el.firstChild, 2); range.setEnd(el.firstChild, 10);
            window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
        });
        await page.locator('.reading-tts-start-here').waitFor();
    };
    await mount({ id: "tts-missing" }); await click("开始朗读"); await status("error");
    check((await controls.textContent()).includes("设置 → 绑定") && requests.length === 0, "TTS missing config shows actionable hint");
    await page.evaluate(() => window.readingQuoteTest.configureTts());
    await mount({ id: "tts-main", companion: false });
    const messagesBefore = await page.evaluate(() => JSON.stringify(window.readingQuoteTest.messages()));
    await body.locator('[data-reading-paragraph="8"]').first().evaluate(el => { const parent = el.closest('[data-ui="body"]'); parent.scrollTop += el.getBoundingClientRect().top - parent.getBoundingClientRect().top - 25; });
    await click("开始朗读"); await status("playing");
    check(requests[0].input?.startsWith("章节1段落9") || requests[0].input?.startsWith("章节1段落10"), "TTS starts near actual viewport instead of chapter beginning");
    check(requests[0].voice === "alloy", "reading app binding overrides global voice without companion");
    await page.waitForTimeout(250);
    const firstPosition = await highlight().getAttribute("data-reading-paragraph");
    await click("暂停朗读"); await status("paused");
    const pausedTime = await page.evaluate(() => window.readingTestAudio.currentTime);
    const count = requests.length; await page.waitForTimeout(160);
    check(await highlight().count() === 1 && await page.evaluate(time => window.readingTestAudio.paused && Math.abs(window.readingTestAudio.currentTime - time) < .05, pausedTime), "pause retains real media time and active highlight");
    await click("继续朗读"); await status("playing");
    check(requests.length === count && await page.evaluate(time => window.readingTestAudio.currentTime >= time, pausedTime), "resume reuses real audio without another API call");
    await endClip(); await status("playing");
    check(Number(await highlight().getAttribute("data-reading-paragraph")) === Number(firstPosition) + 1, "real audio ended automatically advances to next paragraph");
    check(requests.filter(item => item.input === requests[1].input).length === 1, "next paragraph consumes prefetched audio once");
    await body.dispatchEvent("wheel", { deltaY: 200 });
    await body.evaluate(el => { el.scrollTop = 0; }); await endClip(); await status("playing");
    check((await controls.textContent()).includes("恢复跟随") && await body.evaluate(el => el.scrollTop < 10), "manual scroll temporarily suspends automatic follow while audio continues");
    await page.locator('.reading-tts-location').click(); await page.waitForTimeout(550);
    check(await body.evaluate(el => el.scrollTop > 0), "current paragraph button restores follow");
    await click("停止朗读"); await status("idle");
    check(await body.locator('[data-reading-tts-active]').count() === 0 && await page.evaluate(() => window.readingTestAudio.paused), "stop removes highlight and stops audio");
    await selectParagraph(0, 3);
    check(await page.locator('.reading-quote-action').count() === 1, "selection offers quote and read-from-here separately");
    await click("从这里朗读"); await status("playing");
    check(await highlight().getAttribute("data-reading-paragraph") === "3", "selection action starts selected paragraph accurately");
    await click("暂停朗读");
    await selectParagraph(0, 3); await page.locator('.reading-quote-action').click();
    await page.locator('.reading-char-picker .chat-contact-item').first().click();
    await page.locator('.reading-chat-float-input input').fill("保留共读草稿");
    await click("关闭聊天悬浮窗");
    await selectParagraph(0, 4); await click("从这里朗读"); await status("playing");
    await click("打开聊天悬浮窗"); await page.locator('.reading-chat-float-trigger').click();
    check(await page.locator('.reading-chat-float-input input').inputValue() === "保留共读草稿" && await page.locator('.reading-quote-preview--draft').count() === 1, "read-from-here preserves existing quote and co-reading draft");
    await click("关闭聊天悬浮窗"); await click("上一段"); await status("playing");
    await click("暂停朗读"); await click("朗读音色与语速");
    await page.getByLabel("朗读音色", { exact: true }).selectOption("tts-minimax"); await page.waitForTimeout(100);
    await page.getByLabel("朗读语速", { exact: true }).selectOption("1.5");
    await page.getByLabel("朗读语气", { exact: true }).selectOption("calm"); await page.waitForTimeout(200);
    check(requests.at(-1).voice_setting?.speed === 1.5 && requests.at(-1).voice_setting?.emotion === "calm" && await controls.getAttribute('data-status') === "paused", "voice/emotion/speed invalidate audio and preserve pause state");
    check(await page.evaluate(() => window.readingQuoteTest.settings.loadVoiceConfigs().every(v => v.speechSpeed === undefined)), "runtime speed does not modify saved voice configuration");
    await click("继续朗读"); await status("playing");
    await click("下一段"); await status("playing"); check(await highlight().getAttribute("data-reading-paragraph") === "4", "next control interrupts and starts next paragraph");
    await click("上一段"); await status("playing"); check(await highlight().getAttribute("data-reading-paragraph") === "3", "previous control starts prior paragraph");
    await page.waitForTimeout(220);
    const progress = await page.evaluate(() => window.readingQuoteTest.reading.loadProgress("tts-main"));
    check(progress.paragraphIndex === 3, "paragraph position is saved in existing ReadingProgress");
    await page.evaluate(() => window.readingQuoteTest.hideTts(false)); await status("idle");
    check(await page.evaluate(() => window.readingTestAudio.paused), "returning to shelf stops retained reader playback");
    check(await page.evaluate(() => JSON.stringify(window.readingQuoteTest.messages())) === messagesBefore, "narration never creates character chat or memory messages");
    await mount({ id: "tts-page-follow", mode: "page" });
    await selectParagraph(0, 0); await click("从这里朗读"); await status("playing");
    const pageBefore = await page.locator('.reading-immersive-page').textContent();
    for (let i = 0; i < 10; i++) { await click("下一段"); await status("playing"); }
    await page.waitForTimeout(120);
    check(await page.locator('.reading-immersive-page').textContent() !== pageBefore && await highlight().getAttribute('data-reading-paragraph') === "10", "same-chapter narration automatically follows page pagination");
    const stageBox = await page.locator('.reading-page-stage').boundingBox();
    await page.mouse.click(stageBox.x + 5, stageBox.y + stageBox.height / 2); await page.waitForTimeout(250);
    check((await controls.textContent()).includes("恢复跟随") && await controls.getAttribute('data-status') === "playing", "manual page turn suspends follow without stopping narration");
    await page.locator('.reading-tts-location').click(); await page.waitForTimeout(150);
    check(await highlight().getAttribute('data-reading-paragraph') === "10", "restore-follow returns to active paragraph page");
    await mount({ id: "tts-pages", mode: "page", format: "epub", paragraphs: [["第一章末段。"], ["第二章第一段。", "第二章第二段。"]] });
    await click("开始朗读"); await status("playing"); await endClip(); await status("playing");
    check(await highlight().getAttribute("data-reading-chapter") === "1", "EPUB page mode follows automatic chapter transition");
    await click("上一段"); await status("playing");
    check(await highlight().getAttribute("data-reading-chapter") === "0", "previous crosses chapter and follows page view");
    await page.getByRole("button", { name: "下一章", exact: true }).dispatchEvent("click"); await status("playing");
    check(await highlight().getAttribute("data-reading-chapter") === "1", "manual chapter jump repositions active narration");
    await click("下一段"); await status("playing"); await endClip(); await status("ended");
    check(await body.locator('[data-reading-tts-active]').count() === 0, "end of book naturally clears active playback");
    delay = 600;
    await mount({ id: "tts-cancel" }); await click("开始朗读"); await page.waitForTimeout(50); await click("停止朗读"); await page.waitForTimeout(750);
    check(await controls.getAttribute('data-status') === "idle" && await page.evaluate(() => window.readingTestAudio.paused), "stopped in-flight HTTP request cannot resurrect playback");
    await click("开始朗读"); await page.waitForTimeout(50); await mount({ id: "tts-other-book" }); await page.waitForTimeout(650);
    check(await controls.getAttribute('data-status') === "idle", "book switch rejects old audio result");
    delay = 0; fail = true;
    await click("开始朗读"); await status("error");
    check((await controls.textContent()).includes("503"), "network/provider failure is contained in reader controls");
    fail = false; await click("重试"); await status("playing");
    check(await highlight().count() === 1, "explicit retry recovers reader playback");
    await page.evaluate(() => window.readingQuoteTest.unmountTts()); await page.waitForTimeout(100);
    check(await page.evaluate(() => window.readingTestAudio.paused), "unmount releases active audio element");
    if (testPdf) {
        await page.evaluate(bytes => window.readingQuoteTest.reading.saveRawFile("tts-pdf", new Uint8Array(bytes).buffer), pdfFixture());
        await mount({ id: "tts-pdf", format: "pdf", paragraphs: [[]] });
        await page.locator('.reading-pdf-text-layer span').first().waitFor();
        await page.locator('.reading-pdf-text-layer span').first().evaluate(el => {
            const range = document.createRange(); range.setStart(el.firstChild, 4); range.setEnd(el.firstChild, 12);
            window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
        });
        await click("从这里朗读"); await status("playing");
        check(requests.at(-1).input?.includes("line") && await body.locator('.reading-pdf-text-layer [data-reading-tts-active]').count() > 0, "PDF lazy text parsing supports native-selection start and text-block highlight");
        await click("暂停朗读");
        await page.locator('.reading-pdf-text-layer span').first().evaluate(el => {
            const range = document.createRange(); range.selectNodeContents(el);
            window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
        });
        await page.locator('.reading-quote-action').waitFor();
        check(await page.evaluate(() => window.getSelection().toString().includes("PDF")), "PDF active highlighting preserves native text selection");
        await click("停止朗读"); await page.evaluate(() => window.getSelection().removeAllRanges());
        await body.locator('div[data-page="2"]').evaluate(el => { const parent = el.closest('[data-ui="body"]'); parent.scrollTop += el.getBoundingClientRect().top - parent.getBoundingClientRect().top; });
        await click("开始朗读"); await page.waitForTimeout(300);
        const blankStatus = await controls.getAttribute('data-status');
        check(["error", "ended"].includes(blankStatus), "PDF blank page does not rewind and replay earlier text");
        await page.evaluate(bytes => window.readingQuoteTest.reading.saveRawFile("tts-pdf-chunks", new Uint8Array(bytes).buffer), pdfPages(["Text on page one.", "", "", "", "", "Text on page six.", ""]));
        await mount({ id: "tts-pdf-chunks", format: "pdf", paragraphs: [[], []] });
        await page.locator('.reading-pdf-text-layer span').first().waitFor();
        await click("开始朗读"); await status("playing"); await endClip(); await status("playing");
        await page.waitForTimeout(700);
        const pdfActive = body.locator('.reading-pdf-text-layer [data-reading-tts-active]').first();
        check(await pdfActive.getAttribute('data-reading-chapter') === "1" && await pdfActive.evaluate(el => el.closest('div[data-page]').dataset.page) === "6", "PDF prefetch crosses empty pages and five-page chapter chunks");
        check(await pdfActive.evaluate(el => { const rect = el.getBoundingClientRect(), body = el.closest('[data-ui="body"]').getBoundingClientRect(); return rect.top >= body.top && rect.top < body.bottom; }), "PDF follow scrolls to target text on next page");
        await click("上一段"); await status("playing"); await page.waitForTimeout(550);
        check(await highlight().getAttribute('data-reading-chapter') === "0", "PDF previous crosses back to prior parsed chunk");
        await page.evaluate(bytes => window.readingQuoteTest.reading.saveRawFile("tts-scan", new Uint8Array(bytes).buffer), pdfPages([""]));
        await mount({ id: "tts-scan", format: "pdf", paragraphs: [[]] });
        await page.locator('canvas[data-page="1"]').waitFor(); await click("开始朗读"); await status("error");
        check((await controls.textContent()).includes("OCR") && await page.locator('canvas[data-page="1"]').count() === 1, "scanned PDF shows no-text hint and remains readable");
    }
    await mount({ id: "tts-layout", companion: true });
    await click("开始朗读"); await status("playing"); await click("暂停朗读"); await click("朗读音色与语速");
    check(await controls.evaluate(el => el.scrollWidth <= el.clientWidth + 1), "compact controls fit viewport without horizontal overflow");
    await page.screenshot({ path: path.join(output, `tts-${mobile ? "mobile" : "desktop"}.png`) });
    check(errors.length === 0, `TTS ${mobile ? "mobile" : "desktop"} has no uncaught browser errors`);
}
