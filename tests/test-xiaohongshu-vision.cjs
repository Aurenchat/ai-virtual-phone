'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib/xiaohongshu-vision.ts'), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  reportDiagnostics: true,
});
assert.equal(js.diagnostics?.length || 0, 0, 'helper TypeScript transpilation');
const moduleExports = {};
vm.runInNewContext(js.outputText, { exports: moduleExports, console }, { filename: 'xiaohongshu-vision.js' });
const { getXiaohongshuNoteImageIds, resolveXiaohongshuVisionImages, makeXiaohongshuVisionMessage } = moduleExports;

function parts(message, type) {
  return Array.isArray(message.content) ? message.content.filter(part => part.type === type) : [];
}

(async () => {
  const empty = await resolveXiaohongshuVisionImages({}, async () => { throw Error('No reads expected'); });
  assert.equal(empty.total, 0);
  assert.equal(makeXiaohongshuVisionMessage('context', empty).content, 'context');

  // Historical single-image notes still work; no state migration.
  const legacy = await resolveXiaohongshuVisionImages({ imageAssetId: 'cover' }, async id => `data:image/jpeg;base64,${id}`);
  assert.deepEqual(Array.from(getXiaohongshuNoteImageIds({ imageAssetId: 'cover' })), ['cover']);
  assert.equal(legacy.images.length, 1);
  assert.equal(legacy.images[0].position, 1);
  assert.equal(parts(makeXiaohongshuVisionMessage('legacy', legacy), 'image_url').length, 1);

  const reads = [];
  const note = { imageAssetId: 'incorrect-cover', imageAssetIds: ['a', 'b', 'c'] };
  const batch = await resolveXiaohongshuVisionImages(note, async id => {
    reads.push(id);
    return `data:image/jpeg;base64,${id}`;
  });
  assert.deepEqual(reads, ['a', 'b', 'c'], 'use the ordered array instead of imageAssetId');
  const message = makeXiaohongshuVisionMessage('all photos', batch);
  assert.equal(parts(message, 'image_url').length, 3);
  assert.deepEqual(Array.from(parts(message, 'image_url'), p => p.image_url.url), [
    'data:image/jpeg;base64,a', 'data:image/jpeg;base64,b', 'data:image/jpeg;base64,c',
  ]);
  assert(parts(message, 'image_url').every(p => p.image_url.detail === 'low'));
  assert.deepEqual(Array.from(parts(message, 'text').slice(2), p => p.text), [
    '[笔记图片 1/3]', '[笔记图片 2/3]', '[笔记图片 3/3]',
  ]);

  // One missing picture must not silently relabel / hide other images.
  const broken = await resolveXiaohongshuVisionImages({ imageAssetIds: ['a', 'b', 'c'] }, async id => {
    if (id === 'b') throw Error('Broken IndexedDB record');
    return id === 'c' ? null : `data:image/png;base64,${id}`;
  });
  assert.deepEqual(Array.from(broken.unavailablePositions), [2, 3]);
  assert.equal(broken.images.length, 1);
  assert.match(parts(makeXiaohongshuVisionMessage('note', broken), 'text').at(-1).text, /2、3/);

  const partial = await resolveXiaohongshuVisionImages({ imageAssetIds: ['a', 'b', 'c'] }, async id => {
    if (id === 'b') throw Error('Broken IndexedDB record');
    return `data:image/png;base64,${id}`;
  });
  assert.deepEqual(Array.from(partial.images, image => image.position), [1, 3]);
  assert.deepEqual(Array.from(parts(makeXiaohongshuVisionMessage('note', partial), 'text')
    .filter(part => part.text.startsWith('[笔记图片')), part => part.text), ['[笔记图片 1/3]', '[笔记图片 3/3]']);

  const unavailable = await resolveXiaohongshuVisionImages({ imageAssetId: 'not-found' }, async () => null);
  assert.equal(typeof makeXiaohongshuVisionMessage('title', unavailable).content, 'string');
  assert.match(makeXiaohongshuVisionMessage('title', unavailable).content, /不要猜测/);

  const exactlyNine = await resolveXiaohongshuVisionImages(
    { imageAssetIds: Array.from({ length: 9 }, (_, i) => String(i + 1)) },
    async id => `data:image/jpeg;base64,${id}`,
  );
  assert.equal(exactlyNine.images.length, 9);
  assert.equal(exactlyNine.skippedByLimit, 0);
  assert.equal(parts(makeXiaohongshuVisionMessage('nine', exactlyNine), 'image_url').length, 9);

  // Explicitly bound the iOS WebKit request size; never claim the rest were seen.
  const manyIds = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const twelve = await resolveXiaohongshuVisionImages({ imageAssetIds: manyIds }, async id => id);
  assert.equal(twelve.total, 12);
  assert.equal(twelve.images.length, 9);
  assert.equal(twelve.skippedByLimit, 3);
  assert.match(parts(makeXiaohongshuVisionMessage('note', twelve), 'text').at(-1).text, /另外 3 张未送入模型/);

  // Disabled vision: the caller passes null; no artificial image parts.
  assert.equal(makeXiaohongshuVisionMessage('text only', null).content, 'text only');

  // Integration contract: all native note-reaction entrypoints use the batch helper.
  const engine = fs.readFileSync(path.join(root, 'lib/xiaohongshu-engine.ts'), 'utf8');
  assert(engine.includes('makeXiaohongshuVisionMessage as makeVisionMessage'));
  assert(!engine.includes('resolveNoteImageDataUrl('));
  assert((engine.match(/resolveNoteImageBatch\((?:note|firstNote)\)/g) || []).length >= 7);
  assert((engine.match(/if \(imageBatch\?\.total\)/g) || []).length >= 4);
  assert(engine.includes('sendWithOptionalVisionFallback'), 'retain provider fallback');
  await testNativeRoutes(engine);
  console.log('PASS: XHS 0/1/3/9 images; order; legacy; missing IDB; count labels; cap; native callsite integration');
})().catch(error => { console.error(error); process.exitCode = 1; });

// Execute the real native entrypoints, with storage and network boundaries mocked.
// This validates payloads and retry counts; it does not claim live model recognition.
function loadTs(relative, mocks, cache = new Map()) {
  if (Object.hasOwn(mocks, relative)) return mocks[relative];
  if (cache.has(relative)) return cache.get(relative);
  const filename = path.join(root, 'lib', `${relative.replace(/^\.\//, '')}.ts`);
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  assert.equal(result.diagnostics?.length || 0, 0, filename);
  const exports = {};
  cache.set(relative, exports);
  vm.runInNewContext(result.outputText, {
    exports, console: { ...console, warn() {} }, Error,
    require: id => {
      assert(id.startsWith('./'), `Unexpected module ${id}`);
      return loadTs(id, mocks, cache);
    },
  }, { filename });
  return exports;
}

const plain = value => JSON.parse(JSON.stringify(value));
function visionParts(messages) {
  return messages.flatMap(message => Array.isArray(message.content)
    ? message.content.filter(part => part.type === 'image_url'
      || (part.type === 'text' && /^\[(笔记图片|图片识别说明|图片读取状态)/.test(part.text)))
    : []);
}

async function testNativeRoutes(engineSource) {
  const api = { id: 'fixture-api', provider: 'OpenAI', baseUrl: 'https://fixture.invalid/v1',
    defaultModel: 'vision-fixture', apiKey: 'fixture-only', enableImageRecognition: true };
  const settings = { npcUserPostReactionPrompt: 'fixture', npcCommentReplyPrompt: 'fixture',
    npcMoreCommentsPrompt: 'fixture', bilingualTranslationEnabled: false };
  const character = { id: 'character', name: 'Fixture character' };
  const state = { profile: { nickname: 'Fixture user' }, socialGraph: { followers: [] } };
  const reads = [], sends = [];
  let loader = async id => `data:image/png;base64,${Buffer.from(id).toString('base64')}`;
  let response = async () => '#角色回复\n[内容]fixture reply\n[评论]fixture reply\n[评论1作者]Fixture NPC\n[评论1内容]fixture reply';
  const provider = loadTs('./llm-provider-adapter', {
    './api-log-store': { pushApiLog() { throw Error('Unexpected log write'); } },
    './custom-app-protected-policy': { protectProviderBody: body => body },
  });
  let previewInput;
  const previewMessages = (config, preset, messages) => {
    previewInput = plain(messages);
    return provider.buildProviderDebugMessages(config, preset, messages)
      .map(message => ({ role: message.role, content: message.content, _debugMeta: { marker: message.marker } }));
  };
  const engine = loadTs('./xiaohongshu-engine', {
    './xiaohongshu-vision': moduleExports,
    './xiaohongshu-image-assets': { getXiaohongshuVisionDataUrl: async id => { reads.push(id); return loader(id); } },
    './chat-engine': { ChatEngineError: Error, previewMessagesForApi: previewMessages,
      sendLLMRequest: async (config, preset, messages) => {
        sends.push({ messages: plain(messages), body: plain(provider.buildProviderRequest(
          config, preset, provider.toLlmRequestMessages(messages)).body) });
        return response(messages);
      } },
    './character-storage': { loadCharacters: () => [character] },
    './xiaohongshu-character-profile': { resolveCharacterXiaohongshuDisplayName: c => c.name },
    './llm-prompt-assembler': { assemblePromptPayload: input => [{ role: 'user', content:
      input.xiaohongshuUserPostContext || input.xiaohongshuCommentContext
      || input.xiaohongshuMentionContext || input.xiaohongshuFeedContext }] },
    './bilingual-prompt-defaults': { resolveBilingualPrompt: () => '' },
    './memory-injector': { formatCoreMemories: () => '', formatLongTermMemories: () => '' },
    './memory-storage': { loadMemoryConfig: () => ({}) },
    './memory-service': { retrieveCoreMemoriesForPrompt: async () => [], retrieveMemoriesForPrompt: async () => [] },
    './short-term-assembler': { prepareShortTermContext: () => ({ wbActivationContext: '' }) },
    './settings-storage': { loadApiConfigs: () => [api], loadBindingConfig: () => ({ globalDefaults: { apiConfigId: api.id } }),
      loadPresets: () => [], loadWorldBooks: () => [], loadRegexes: () => [],
      resolveBinding: () => ({ apiConfigId: api.id }), resolveUserIdentity: () => ({ name: 'Fixture user' }) },
    './xiaohongshu-storage': { loadXiaohongshuState: () => state, makeXiaohongshuNpcId: name => `npc-${name}`,
      makeXiaohongshuComment: input => ({ ...input, id: 'fixture-comment' }) },
  });
  const comment = { id: 'user-comment', authorType: 'user', authorName: 'Fixture user', text: '@Fixture character hello' };
  const makeNote = ids => ({ id: 'note', type: 'post', source: 'user', authorName: 'Fixture user',
    title: 'Untitled photos', body: 'No description of photo contents.', imageAssetIds: ids,
    tags: [], comments: [comment], likeCount: 0, saveCount: 0, commentCount: 1 });
  const routes = [
    ['npc reaction', note => engine.generateXiaohongshuNpcReactionForUserPost(note, settings)],
    ['npc reply', note => engine.generateXiaohongshuNpcReplyToUserComment(note, comment, settings)],
    ['npc more', note => engine.generateXiaohongshuNpcMoreComments(note, settings)],
    ['character reaction', note => engine.generateXiaohongshuCharacterReactionToUserPost(character.id, note, settings)],
    ['character reply', note => engine.generateXiaohongshuCharacterReplyToUserComment(character.id, note, comment, undefined, settings)],
    ['character mention', note => engine.generateXiaohongshuCharacterMentionReply(character.id, note, comment, undefined, settings)],
  ];
  const reset = () => { reads.length = sends.length = 0; };
  for (const [name, run] of routes) {
    for (const count of [1, 3, 9]) {
      reset();
      const ids = Array.from({ length: count }, (_, i) => `photo-${i + 1}`);
      const note = makeNote(ids), before = JSON.stringify(note);
      await run(note);
      assert.deepEqual(reads, ids, `${name}: ordered reads`);
      assert.equal(sends.length, 1, `${name}: only one request`);
      const images = visionParts(sends[0].messages).filter(p => p.type === 'image_url');
      assert.deepEqual(images.map(p => Buffer.from(p.image_url.url.split(',')[1], 'base64').toString()), ids);
      assert.deepEqual(visionParts(sends[0].messages).filter(p => p.type === 'text' && p.text.startsWith('[笔记图片'))
        .map(p => p.text), ids.map((_, i) => `[笔记图片 ${i + 1}/${count}]`));
      assert.equal(JSON.stringify(note), before, `${name}: note is unchanged`);
    }
    reset(); api.enableImageRecognition = false;
    await run(makeNote(['first', 'second', 'third']));
    assert.deepEqual(reads, [], `${name}: disabled makes no IDB reads`);
    assert.equal(sends.length, 1); assert.equal(visionParts(sends[0].messages).length, 0);
    api.enableImageRecognition = true;

    reset();
    const legacy = makeNote(undefined); legacy.imageAssetId = 'old-cover';
    await run(legacy);
    assert.deepEqual(reads, ['old-cover']);
    assert.equal(visionParts(sends[0].messages).filter(p => p.type === 'image_url').length, 1);

    reset(); loader = async id => { if (id === 'second') throw Error('Missing asset'); return `data:image/png;base64,${Buffer.from(id).toString('base64')}`; };
    await run(makeNote(['first', 'second', 'third']));
    assert.deepEqual(reads, ['first', 'second', 'third']);
    assert.deepEqual(visionParts(sends[0].messages).filter(p => p.type === 'text' && p.text.startsWith('[笔记图片'))
      .map(p => p.text), ['[笔记图片 1/3]', '[笔记图片 3/3]']);
    assert.equal(sends.length, 1);
    reset(); loader = async () => null;
    await run(makeNote(['first', 'second', 'third']));
    assert.equal(sends.length, 1);
    assert.equal(visionParts(sends[0].messages).filter(p => p.type === 'image_url').length, 0);
    assert.match(JSON.stringify(sends[0].messages), /不要猜测/);
    loader = async id => `data:image/png;base64,${Buffer.from(id).toString('base64')}`;
  }
  // Provider normalization and prompt preview preserve every label and image.
  const modes = ['reaction', 'comment', 'mention'];
  for (const providerName of ['OpenAI', 'Anthropic', 'Google']) {
    api.provider = providerName; api.baseUrl = undefined;
    for (let index = 0; index < modes.length; index++) {
      reset(); const note = makeNote(['first', 'second', 'third']);
      await routes[index + 3][1](note);
      const sentVision = visionParts(sends[0].messages);
      const wire = sends[0].body;
      reset();
      const preview = await engine.previewXiaohongshuPromptPayload(character.id, modes[index], [note], settings);
      assert.equal(sends.length, 0, 'preview does not send a request');
      assert.deepEqual(reads, ['first', 'second', 'third']);
      assert.deepEqual(visionParts(previewInput), sentVision, `${providerName}/${modes[index]}: preview input matches send`);
      // The existing debug panel intentionally renders actual image blocks as [图片].
      const previewText = preview.messages.map(m => m.content).join('\n');
      assert.deepEqual(Array.from(previewText.matchAll(/\[笔记图片 \d\/3\]\n\[图片\]/g), m => m[0]),
        [1, 2, 3].map(i => `[笔记图片 ${i}/3]\n[图片]`), 'debug preview preserves image positions');
      const blocks = providerName === 'Google' ? wire.contents.flatMap(m => m.parts)
        : wire.messages.flatMap(m => Array.isArray(m.content) ? m.content : []);
      const wireImages = blocks.filter(p => p.type === 'image_url' || p.type === 'image' || p.inlineData);
      assert.equal(wireImages.length, 3, `${providerName}: all images reach wire payload`);
      assert.deepEqual(wireImages.map(p => p.image_url?.url?.split(',')[1] || p.source?.data || p.inlineData?.data),
        ['first', 'second', 'third'].map(id => Buffer.from(id).toString('base64')));
    }
  }
  api.provider = 'OpenAI'; api.baseUrl = 'https://fixture.invalid/v1';
  reset();
  await engine.generateXiaohongshuCharacterActivity(character.id, [makeNote(['first', 'second'])], settings);
  assert.equal(reads.length, 0); assert.equal(sends.length, 1); assert.equal(visionParts(sends[0].messages).length, 0);
  reset();
  await engine.previewXiaohongshuPromptPayload(character.id, 'activity', [makeNote(['first', 'second'])], settings);
  assert.equal(reads.length, 0); assert.equal(sends.length, 0);

  // A rejected visual attempt permits one text retry. Later routes skip reads/probes.
  const success = response;
  response = async messages => { if (visionParts(messages).some(p => p.type === 'image_url'))
    throw Error('API Error 400: model does not support images'); return success(); };
  reset(); await routes[0][1](makeNote(['first', 'second', 'third']));
  assert.equal(sends.length, 2); assert.equal(reads.length, 3);
  const fallback = JSON.stringify(sends[1].messages);
  assert(!fallback.includes('image_url')); assert(!fallback.includes('[笔记图片'));
  assert(!fallback.includes('[图片识别说明]')); assert.match(fallback, /不要猜测/);
  for (const [name, run] of routes) {
    reset(); await run(makeNote(['first', 'second', 'third']));
    assert.equal(reads.length, 0, `${name}: known text-only API skips IDB`);
    assert.equal(sends.length, 1, `${name}: known text-only API skips failed probe`);
  }
  for (const mode of modes) {
    reset(); const preview = await engine.previewXiaohongshuPromptPayload(character.id, mode, [makeNote(['first'])], settings);
    assert.equal(reads.length, 0); assert.equal(sends.length, 0); assert.equal(visionParts(preview.messages).length, 0);
  }
  api.defaultModel = 'new-vision-model'; response = success;
  reset(); await routes[0][1](makeNote(['first', 'second']));
  assert.equal(reads.length, 2); assert.equal(sends.length, 1, 'new model restores vision');

  // Generic failures do not trigger a second generation or poison capability memory.
  response = async () => { throw Error('API Error 401: authentication failed'); };
  reset(); await assert.rejects(routes[0][1](makeNote(['first'])), /401/);
  assert.equal(sends.length, 1);
  for (const error of ['API Error 413: image request_too_large', 'API Error 415: unsupported media type: image/png']) {
    response = async messages => { if (visionParts(messages).some(p => p.type === 'image_url'))
      throw Error(error); return success(); };
    for (let attempt = 0; attempt < 2; attempt++) {
      reset(); await routes[0][1](makeNote(['first']));
      assert.equal(reads.length, 1); assert.equal(sends.length, 2, 'image format/size failure is not cached as no vision');
    }
  }
  response = async () => { throw Error('API Error 400: model does not support images'); };
  api.defaultModel = 'fails-text-too';
  reset(); await assert.rejects(routes[0][1](makeNote(['first'])), /support images/);
  assert.equal(sends.length, 2, 'text fallback is never retried again');
  // No new persistence or activity-feed changes are hidden in the patched engine.
  assert(!/saveXiaohongshu|localStorage\.setItem|indexedDB\.open/.test(engineSource));
  console.log('PASS: 6 native routes x 1/3/9; disabled/legacy/missing; 3 providers x 3 previews; text-only cache; retry bounds; activity exclusion; immutable notes');
}
