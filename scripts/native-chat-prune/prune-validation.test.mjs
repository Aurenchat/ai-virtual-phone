import assert from 'node:assert/strict';
import { test } from 'node:test';
import { webcrypto } from 'node:crypto';
import { fingerprintPruneMessages, equalPruneMessages, createPruneDiskChecker } from '../../lib/chat-prune-validation.ts';
Object.defineProperty(globalThis, 'crypto', { configurable:true, value: webcrypto });
const sample = () => Array.from({ length: 10050 }, (_, i) => ({
  id: 'message_' + i.toString().padStart(6, '0'),
  order: i,
  content: 'x'.repeat(i % 20 === 0 ? 3000 : 80),
  mediaData: i % 37 === 0 ? {type:'voice',url:'file:'+i,extra:{status:'sent'}} : undefined
}));
test('10,050 message digest is repeatable without giant history serialization', async () => {
  const records = sample();
  const fingerprint = await fingerprintPruneMessages(records);
  assert.equal(fingerprint, await fingerprintPruneMessages(structuredClone(records)));
  assert.equal(fingerprint.length, 64);
});
test('nested in-place edit invalidates snapshot', async () => {
  const records = sample();
  const fingerprint = await fingerprintPruneMessages(records);
  records[37].mediaData.extra.status = 'read';
  assert.notEqual(await fingerprintPruneMessages(records), fingerprint);
});
test('order and truncation affect digest', async () => {
  const records = sample().slice(0, 100);
  const fingerprint = await fingerprintPruneMessages(records);
  [records[0], records[1]] = [records[1], records[0]];
  assert.notEqual(await fingerprintPruneMessages(records), fingerprint);
  assert.notEqual(await fingerprintPruneMessages(records.slice(1)), fingerprint);
});
test('serial equality detects subtle media edits', () => {
  const before = sample().slice(0, 50);
  const after = structuredClone(before);
  assert.ok(equalPruneMessages(before,after));
  after[37].mediaData.url = 'other';
  assert.equal(equalPruneMessages(before,after), false);
});
test('cursor checker accepts arbitrary database index order', () => {
  const before = sample().slice(0,50);
  const checker = createPruneDiskChecker(before);
  for (const record of [...before].reverse()) checker.inspect(structuredClone(record));
  checker.complete();
});
test('cursor checker refuses stale resurrection after prune', () => {
  const before = sample().slice(-50);
  const checker = createPruneDiskChecker(before);
  for (const record of before) checker.inspect(record);
  assert.throws(() => checker.inspect({id:'deleted_000000',content:'revived'}));
});
test('cursor checker refuses missing persisted record', () => {
  const before = sample().slice(-50);
  const checker = createPruneDiskChecker(before);
  for (const record of before.slice(1)) checker.inspect(record);
  assert.throws(() => checker.complete());
});
test('cursor checker rejects mutated record and duplicate expected ids', () => {
  const before = sample().slice(0,2);
  assert.throws(() => createPruneDiskChecker([before[0],before[0]]));
  const checker = createPruneDiskChecker(before);
  assert.throws(() => checker.inspect({...before[0],content:'changed'}));
});
test('fails closed when WebCrypto missing', async () => {
  const keep = globalThis.crypto;
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:undefined});
  try { await assert.rejects(fingerprintPruneMessages([{id:'1'}]), /不支持/); }
  finally { Object.defineProperty(globalThis,'crypto',{configurable:true,value:keep}); }
});
