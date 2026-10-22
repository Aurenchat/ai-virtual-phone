import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Synthetic host-boundary tests: no browser storage or network requests.
// Use the real limiter, prompt assemblers and provider serializer after capturing
// the session/history handed off by each public custom-app generation entry point.
async function loadTs(name, dependencies = {}, sourceOverride) {
  const code = sourceOverride ?? (name === "custom-app-host-api" && process.argv.includes("--baseline")
    ? execFileSync("git", ["show", "HEAD:lib/custom-app-host-api.ts"], { encoding: "utf8" })
    : await readFile(new URL(`../lib/${name}.ts`, import.meta.url), "utf8"));
  const compiled = ts.transpileModule(code, {
    fileName: name,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("require", "module", "exports", compiled)(id => {
    if (id in dependencies) return dependencies[id];
    return new Proxy({}, { get: (_, key) => () => {
      throw new Error(`Unexpected dependency call: ${name}: ${id}.${String(key)}`);
    } });
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const kv = { registerKvMigration() {}, kvGet: () => null, kvSet() {} };
const storage = await loadTs("chat-storage", { "./kv-db": kv });
assert.equal(storage.DEFAULT_VISION_IMAGE_PROMPT_LIMIT, 1);
const engine = await loadTs("chat-engine", { "./kv-db": kv, "./chat-storage": storage });
const time = await loadTs("character-time");
const macro = await loadTs("macro-engine", { "./character-time": time });
const promptTime = await loadTs("prompt-time", {
  "./character-time": time,
  "./chat-storage": { loadChatAppSettings: () => ({ timeAware: false }) },
});
const sanitizer = await loadTs("prompt-sanitizer", {
  "./state-value-parser": await loadTs("state-value-parser"),
});
const assemblerDependencies = {
  "./macro-engine": macro,
  "./character-time": time,
  "./prompt-time": promptTime,
  "./prompt-sanitizer": sanitizer,
  "./character-world-storage": { formatCharacterRelationsForPrompt: () => "" },
  "./dwelling-storage": { readDwellingLayoutCache: () => null },
};
const assembler = await loadTs("llm-prompt-assembler", assemblerDependencies);
const provider = await loadTs("llm-provider-adapter", {
  "./api-helpers": await loadTs("api-helpers"),
  "./generation-parameters": await loadTs("generation-parameters"),
});
const tags = await loadTs("custom-app-tags");
const character = { id: "char-test", name: "Synthetic character", persona: "Test" };
const single = Object.freeze({ id: "single", contactId: character.id, visionImagePromptLimit: 1 });
const group = Object.freeze({ id: "group", isGroup: true, participantIds: [character.id], visionImagePromptLimit: 1 });
let currentSingle = single;
let currentGroup = group;
let captured;
const capture = (session, history, options) => { captured = { session, history, options }; };
const host = await loadTs("custom-app-host-api", {
  "./kv-db": kv,
  "./custom-app-tags": tags,
  "./character-storage": { loadCharacters: () => [character] },
  "./chat-storage": {
    loadChatContacts: () => [{ characterId: character.id }],
    createOrGetSession: () => currentSingle,
    loadChatSessions: () => [currentGroup],
    loadChatMessages: () => [],
    saveChatSessions() { assert.fail("generation must not persist session settings"); },
  },
  "./chat-engine": {
    generateChatCompletion: async (...args) => { capture(...args); return {}; },
    flattenCompletionResult: () => "synthetic reply",
  },
  "./group-chat-engine": {
    generateGroupRawCompletion: async (...args) => { capture(...args); return { text: "synthetic reply" }; },
  },
});
const app = (id = "nox.weibo") => ({ id, name: "Synthetic app", permissions: ["ai.generate"], manifest: {} });
// Distinct valid PNG data URLs let assertions check image order and identities.
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1kAAAAASUVORK5CYII=";
const images = count => Array.from({ length: count }, (_, i) => ({
  id: `post-image-${i + 1}`, role: "user", content: `第${i + 1}张`,
  image: `data:image/png;base64,${png}${" ".repeat(i)}`,
}));
const urls = history => history.filter(m => m.mediaUrl).map(m => m.mediaUrl);
const config = { provider: "OpenAI", apiKey: "synthetic-only", defaultModel: "synthetic-vision", enableImageRecognition: true };
function requestFor(call, enableImageRecognition = true) {
  const history = engine.applyVisionImagePromptLimit(call.history.map(m => ({ ...m })), call.session.visionImagePromptLimit);
  const common = { history, preset: null, regexes: [], timeAware: false, enableVision: true, initialStateValues: [], appTags: call.options.appTags };
  const messages = call.session.isGroup
    ? assembler.assembleGroupPromptPayload({ ...common, members: [{ character, worldBooks: [], coreMemories: "", longTermMemories: "" }], memberNames: [character.name], groupName: "Test" })
    : assembler.assemblePromptPayload({ ...common, character, worldBooks: [], isolatedContext: true });
  return provider.buildProviderRequest({ ...config, enableImageRecognition }, null, provider.toLlmRequestMessages(messages));
}
function requestUrls(request) {
  return request.body.messages.flatMap(m => Array.isArray(m.content) ? m.content.filter(p => p.type === "image_url").map(p => p.image_url.url) : []);
}
const paths = {
  single: record => host.generateCustomAppText(record.app ?? app(), { characterId: character.id, ...record }),
  temporaryGroup: record => host.generateCustomAppGroupText(record.app ?? app(), { characterIds: [character.id], ...record }),
  persistedGroup: record => host.generateCustomAppGroupText(record.app ?? app(), { sessionId: group.id, ...record }),
};
let cases = 0;
for (const [path, generate] of Object.entries(paths)) {
  for (const count of [1, 4, 9, 10]) {
    const input = images(count);
    const before = structuredClone(input);
    await generate({ appMessages: input, appTags: ["nox_weibo", "comments"], instruction: "请评论原帖" });
    assert.equal(captured.session.visionImagePromptLimit, 9, path);
    assert.deepEqual(urls(captured.history), input.slice(0, 9).map(m => m.image), path);
    assert.deepEqual(requestUrls(requestFor(captured)), input.slice(0, 9).map(m => m.image), `${path}: serialized request`);
    assert.deepEqual(input, before);
    assert.deepEqual(requestUrls(requestFor(captured, false)), [], "vision off must strip every image");
    cases++;
  }
  for (const scene of ["comments", "reply", "dm"]) {
    const input = [...images(9), { id: "user-comment", role: "user", content: "请回复我在原帖下的评论" }];
    await generate({ appMessages: input, appTags: ["nox_weibo", scene] });
    assert.deepEqual(requestUrls(requestFor(captured)), input.slice(0, 9).map(m => m.image), `${path}/${scene}`);
    assert.ok(captured.history.some(m => m.id === "user-comment"));
    assert.ok(JSON.stringify(requestFor(captured).body).includes("请回复我在原帖下的评论"));
    cases++;
  }
  // Eight original-post pictures plus one comment attachment retain their order.
  const reply = [...images(8), { ...images(9)[8], id: "comment-attachment" }];
  await generate({ appMessages: reply, appTags: ["nox_weibo", "reply"] });
  assert.deepEqual(requestUrls(requestFor(captured)), reply.map(m => m.image));
  cases++;
  // Only the trusted host App ID grants the privilege; tags cannot impersonate it.
  for (const [id, appTags, expected] of [
    ["nox.weibo", [], 9], ["legacy.weibo", ["nox_weibo"], 4],
    ["other.app", [], 4], ["nox.weibo.copy", ["nox_weibo_reply"], 4],
  ]) {
    await generate({ app: app(id), appTags, appMessages: images(10) });
    assert.equal(urls(captured.history).length, expected);
    assert.equal(captured.session.visionImagePromptLimit ?? 1, expected === 9 ? 9 : 1);
    assert.equal(requestUrls(requestFor(captured)).length, expected === 9 ? 9 : 1);
    cases++;
  }
  // Existing per-image size/type guards and text retention still apply.
  const invalid = [
    { role: "user", content: "too large", image: `data:image/png;base64,${"a".repeat(2_000_000)}` },
    { role: "user", content: "remote", image: "https://example.invalid/image.png" },
    ...images(9),
  ];
  await generate({ appMessages: invalid });
  assert.equal(urls(captured.history).length, 9);
  assert.equal(captured.history[0].content, "too large");
  assert.equal(captured.history[1].content, "remote");
  cases++;
  await generate({ messages: images(9) });
  assert.equal(requestUrls(requestFor(captured)).length, 9, "messages alias");
  cases++;
  await generate({ appMessages: images(9), promptProfile: { id: "none", label: "None", history: "none" } });
  assert.equal(requestUrls(requestFor(captured)).length, 0, "explicit no-history profile remains authoritative");
  cases++;
}
// The saved session objects are frozen so an accidental in-place override fails.
assert.equal(single.visionImagePromptLimit, 1);
assert.equal(group.visionImagePromptLimit, 1);
for (const limit of [0, 1, 4]) {
  currentSingle = Object.freeze({ ...single, visionImagePromptLimit: limit });
  currentGroup = Object.freeze({ ...group, visionImagePromptLimit: limit });
  for (const path of ["single", "persistedGroup"]) {
    await paths[path]({ app: app("other.app"), appMessages: images(9) });
    assert.equal(captured.session, path === "single" ? currentSingle : currentGroup);
    assert.equal(requestUrls(requestFor(captured)).length, Math.min(4, limit));
    await paths[path]({ appMessages: images(9) });
    assert.equal(requestUrls(requestFor(captured)).length, 9);
    assert.equal((path === "single" ? currentSingle : currentGroup).visionImagePromptLimit, limit);
    cases++;
  }
}
const ordinaryHistory = images(9).map(m => ({ ...m, mediaType: "image", mediaUrl: m.image }));
assert.equal(urls(engine.applyVisionImagePromptLimit(ordinaryHistory.map(m => ({ ...m })), undefined)).length, 1);
assert.equal(urls(engine.applyVisionImagePromptLimit(ordinaryHistory.map(m => ({ ...m })), 4)).length, 4);
cases++;
// Compare protected feature prompt assembly byte-for-byte with the release base.
const baselineAssembler = await loadTs("llm-prompt-assembler", assemblerDependencies,
  execFileSync("git", ["show", "87c6eaa480fcf53d69b8fa048e2ced5a2925de13:lib/llm-prompt-assembler.ts"], { encoding: "utf8" }));
for (const feature of ["chat", "xiaohongshu", "moments", "custom_app:other.app"]) {
  for (const isGroup of [false, true]) {
    const history = ordinaryHistory.map(m => ({ ...m, origin: "custom_app", mediaData: { appId: feature, label: m.content } }));
    const common = { history, preset: null, regexes: [], timeAware: false, enableVision: true, initialStateValues: [], appId: feature };
    const assemble = api => isGroup
      ? api.assembleGroupPromptPayload({ ...common, members: [{ character, worldBooks: [], coreMemories: "", longTermMemories: "" }], memberNames: character.name, groupName: "Test" })
      : api.assemblePromptPayload({ ...common, character, worldBooks: [], isolatedContext: true });
    assert.deepEqual(assemble(assembler), assemble(baselineAssembler), feature + ": unchanged prompt");
    cases++;
  }
}
console.log(JSON.stringify({ passed: cases, scope: "synthetic host handoff + real limiter/assemblers/OpenAI request serializer; no live provider or browser" }, null, 2));
