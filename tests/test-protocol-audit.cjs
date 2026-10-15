const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../lib/chat-protocol-audit.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true });
assert.equal(output.diagnostics.length, 0, 'typescript syntax diagnostics');
const sandbox = { exports: {}, module: { exports: {} }, require() { throw Error('Unexpected runtime import'); }, Date, Set, Map, Object, String };
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(output.outputText, sandbox);
const { analyzeChatProtocol, formatChatProtocolAudit } = sandbox.module.exports;
const history = (items) => items.map((m, i) => ({ id: `history_${i}`, sessionId: 'session_1', createdAt: new Date(1760310000000 + 1000 * i).toISOString(), status: 'sent', content: '', ...m }));
const make = (kind, body, raw=[], msgs=[]) => analyzeChatProtocol({
  request: { providerKind: kind, body },
  assembledMessages: raw,
  history: history(msgs),
  recentRuns: [],
});
const openai = make('openai-compatible', { messages: [
  {role:'user', content:'test private'},
  {role:'assistant', content:null, tool_calls:[{id:'call_1', type:'function', function:{name:'example',arguments:'{}'}}]},
  {role:'tool', content:'test result', tool_call_id:'call_1'},
  {role:'assistant', content:'answer'}
] }, [
  {role:'user', content:'private prompt'},
  {role:'assistant', content:'', toolCalls:[{id:'call_1',name:'example',args:{secret:'hush'}}]},
  {role:'tool', content:'secret result',toolCallId:'call_1',name:'example'},
]);
assert.equal(openai.totalFindings, 0);
assert.equal(openai.wireFunctionCalls, 1);
assert.equal(openai.wireFunctionResponses, 1);
assert(!formatChatProtocolAudit(openai).includes('test private'));
assert(!formatChatProtocolAudit(openai).includes('hush'));
const missing = make('openai-compatible', {messages:[{role:'user',content:'x'},{role:'assistant',tool_calls:[{id:'x'}]}]}, [
  {role:'assistant', content:'', toolCalls:[{id:'x',name:'f',args:{}}]}
]);
assert(missing.findings.some(f=>f.code==='MISSING_RESULT'));
assert(missing.findings.some(f=>f.code==='OPENAI_UNANSWERED_CALLS'));
const gemini = make('gemini', {contents:[
  {role:'user',parts:[{text:'very secret'}]},
  {role:'model',parts:[{functionCall:{name:'f',args:{}}}]},
  {role:'tool',parts:[{functionResponse:{name:'f',response:{result:'secret result'}}}]},
]});
assert(gemini.findings.some(f=>f.code==='GEMINI_TOOL_ROLE'));
const repla = make('openai-compatible', {messages:[]}, [], [
 {role:'user',content:'message'},
 {role:'assistant',content:'reply one',responseBatchId:'batch_A'},
 {role:'assistant',content:'reply two',responseBatchId:'batch_A'},
]);
assert.equal(repla.recentReplyBursts.at(-1).uniqueReplyBatches, 1);
assert(!repla.findings.some(f=>f.code==='MULTIPLE_BATCHES_SINCE_USER'));
const replb = make('openai-compatible', {messages:[]}, [], [
 {role:'user',content:'message'},
 {role:'assistant',content:'reply one',responseBatchId:'batch_A'},
 {role:'assistant',content:'reply two',responseBatchId:'batch_B'},
]);
assert(replb.findings.some(f=>f.code==='MULTIPLE_BATCHES_SINCE_USER'));
const followup = make('openai-compatible', {messages:[]}, [], [
 {role:'user',content:'message'},
 {role:'assistant',content:'reply one',responseBatchId:'batch_A'},
 {role:'assistant',content:'reply two',responseBatchId:'batch_B', followUpIndex:1},
]);
assert(!followup.findings.some(f=>f.code==='MULTIPLE_BATCHES_SINCE_USER'));
const rawBroken = make('openai-compatible',{messages:[]},[
 {role:'user',content:'x'},
 {role:'assistant',content:'',toolCalls:[{id:'x',name:'f',args:{}}]},
 {role:'user',content:'interloper'},
 {role:'tool',content:'result',toolCallId:'x',name:'f'},
]);
assert(rawBroken.findings.some(f=>f.code==='BROKEN_ADJACENCY'));
console.log('PASS 7 protocol audit scenarios; no content leakage');
