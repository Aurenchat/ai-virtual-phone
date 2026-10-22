const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const cp = require('child_process');
const modules = [process.env.FLOAT_TYPESCRIPT_PATH, path.resolve(process.cwd(), 'node_modules/typescript')];
try { modules.push(path.join(cp.execFileSync('npm', ['root', '-g'], {encoding:'utf8'}).trim(), 'typescript')); } catch {}
const tsPath = modules.find(p => p && fs.existsSync(p));
if (!tsPath) { console.error('TypeScript is required; run npm install in the Float worktree first.'); process.exit(2); }
const ts = require(tsPath);
const source = fs.readFileSync(path.join(__dirname, '../../lib/chat-quote.ts'), 'utf8');
const result = ts.transpileModule(source, { fileName: 'chat-quote.ts', compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
const errors = result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
assert.equal(errors.length, 0, errors.map(d => d.messageText).join('\n'));
const out = {};
vm.runInNewContext(result.outputText, {exports:out, require: name => { if (name.includes('bilingual-text')) return { splitBilingualText: text => {const pos = text.indexOf('|'); return pos >= 0 && /[\u3400-\u9fff]/.test(text.slice(pos + 1)) ? {original: text.slice(0,pos).trim(), translated: text.slice(pos+1).trim()} : null; }}; throw new Error(name); }});
const {createChatQuote, resolveLegacyChatQuote, readChatQuote, formatChatQuoteForPrompt} = out;
let passed=0;
function test(name, fn) {fn();passed++;console.log('PASS',name)}
const mk = (id, role, content='', mediaType, mediaData, mediaUrl) => ({id, sessionId:'s',role,content,mediaType,mediaData,mediaUrl});
test('complete bilingual original preview', () => {const q=createChatQuote(mk('1','assistant','Hello, Schatz. | 你好，宝贝'));assert.equal(q.preview,'Hello, Schatz.');assert.equal(q.sourceRole,'assistant');});
test('long text unlimited visual preview', () => {const text='abc'.repeat(800);const q=createChatQuote(mk('2','user',text));assert.equal(q.preview.length,text.length);assert.ok(q.summary.length<2100);});
test('image stored by reference', () => {const q=createChatQuote(mk('3','user','', 'image', {label:'一杯咖啡'}, 'media-store://photo-1'));assert.equal(q.imageRef,'media-store://photo-1');assert.match(q.summary,/咖啡/);});
test('image base64 not duplicated', () => {const q=createChatQuote(mk('3','user','', 'image', {},'data:image/png;base64,'+'a'.repeat(12000)));assert.equal(q.imageRef,undefined);});
test('image index opt in', () => {const q=createChatQuote(mk('4','user','','image',{label:'多图'}),{imageIndex:5,imageId:'asset5',imageRef:'media-store://5'});assert.equal(q.imageIndex,5);assert.equal(q.imageId,'asset5');});
test('voice original transcript and duration', () => {const q=createChatQuote(mk('5','assistant','','audio',{label:'Where are u? | 你在哪？',voiceDuration:13}));assert.match(q.summary,/Where are u\?/);assert.doesNotMatch(q.summary,/你在哪/);assert.equal(q.duration,13);});
test('music artist and cached cover', () => {const q=createChatQuote(mk('6','assistant','','music_share',{musicTitle:'Banana Pancakes',musicArtist:'Jack Johnson',musicCoverUrl:'https://example.com/a.jpg'}));assert.match(q.summary,/Jack Johnson/);assert.equal(q.coverUrl,'https://example.com/a.jpg');});
test('payments summarized without payload', () => {const q=createChatQuote(mk('7','assistant','','transfer',{currency:'USD',amount:500,status:'pending'}));assert.match(q.summary,/500/);assert.equal(q.kind,'payment');});
test('location summarized', () => {const q=createChatQuote(mk('8','user','','location',{label:'Casablanca'}));assert.match(q.summary,/Casablanca/);});
test('unknown plugin safe fallback', () => {const q=createChatQuote(mk('9','assistant','','plugin:demo',{appCardTitle:'demo'}));assert.equal(q.kind,'card');assert.match(q.summary,/demo/);});
test('recognize unique source', () => {const q=resolveLegacyChatQuote('Where are u?', [mk('x','assistant','Where are u?'),mk('y','assistant','Nope')]);assert.equal(q.sourceMessageId,'x');});
test('ambiguous matching does not invent ID', () => {const q=resolveLegacyChatQuote('Hello my old', [mk('a','assistant','Hello my old friend'),mk('b','assistant','Hello my old friend')]);assert.equal(q,null);});
test('legacy text readable', () => {const q=readChatQuote({...mk('z','user','reply','quote',{quotePreview:'old'}),status:'sent'});assert.equal(q.preview,'old');});
test('modern quotation prompt includes source and reply', () => {const snap=createChatQuote(mk('abc','assistant','','music_share',{musicTitle:'Sunflower'}));const r=formatChatQuoteForPrompt(mk('next','user','好听','quote',{quoteV1:snap}));assert.match(r,/id=abc/);assert.match(r,/Sunflower/);assert.match(r,/好听/);});
test('missing source stays safely understandable', () => {const r=formatChatQuoteForPrompt(mk('m','assistant','reply','quote',{}));assert.match(r,/引用消息：内容不可用/);});
test('ordinary text containing metadata label is preserved', () => {assert.equal(createChatQuote(mk('plain','user','metadata: normal prose')).preview,'metadata: normal prose');});
test('public unknown card JSON and base64 labels are omitted', () => {for(const label of ['{"internal":"secret"}','data:image/png;base64,'+'a'.repeat(1000)]){const q=createChatQuote(mk('card','user','','unknown_plugin',{label}));assert.equal(q.preview,'[消息卡片]');assert.doesNotMatch(JSON.stringify(q),/secret|base64/);}});
console.log(`${passed} quote behavior tests passed`);
