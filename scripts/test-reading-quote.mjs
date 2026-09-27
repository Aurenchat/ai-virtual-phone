import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/reading-quote.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loadedModule = { exports: {} };
new Function("module", "exports", compiled)(loadedModule, loadedModule.exports);
const { formatReadingQuoteContent, getReadingQuote } = loadedModule.exports;
const plain = { origin: "reading_discuss", content: "我想聊聊", mediaData: { readingBookTitle: "测试书" } };
assert.equal(formatReadingQuoteContent(plain), plain.content);
assert.equal(getReadingQuote(plain), undefined);
const quote = { text: "  半句话\n\n另一个段落。  ", bookTitle: "测试书", chapterIndex: 0, startParagraphIndex: 2, endParagraphIndex: 3 };
const message = { ...plain, mediaType: "reading_discuss", mediaData: { ...plain.mediaData, readingQuote: quote } };
const prompt = formatReadingQuoteContent(message);
assert.ok(prompt.includes(`[引用书中文字]\n${quote.text}\n[/引用书中文字]`));
assert.ok(prompt.includes(`[用户]\n${plain.content}\n[/用户]`));
assert.equal(message.content, plain.content);
assert.equal(formatReadingQuoteContent({ ...message, content: "编辑后" }).includes(`[用户]\n编辑后\n[/用户]`), true);
assert.equal(getReadingQuote({ ...message, origin: "chat", mediaType: "quote" }), undefined);
for (const readingQuote of [undefined, {}, { text: "  \n" }, { text: 123 }]) {
    assert.equal(formatReadingQuoteContent({ ...plain, mediaData: { readingQuote } }), plain.content);
}
const longQuote = { text: "长段落。".repeat(10000) };
assert.ok(formatReadingQuoteContent({ ...message, mediaData: { readingQuote: longQuote } }).includes(longQuote.text));
assert.equal(getReadingQuote(JSON.parse(JSON.stringify(message))).text, quote.text);
console.log("PASS reading quote: legacy/plain messages, structured prompt, edits, scope, invalid data, full long text, JSON roundtrip");
