import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import ts from "typescript";

// Full production generation/vision/transport code, synthetic context stores and
// intercepted fetch only. This does not contact a provider or use a user profile.
const moduleNames = [
  "custom-app-host-api", "custom-app-tags", "chat-engine", "group-chat-engine",
  "chat-storage", "llm-prompt-assembler", "llm-provider-adapter", "llm-http",
  "api-helpers", "generation-parameters", "macro-engine", "character-time",
  "prompt-time", "prompt-sanitizer", "state-value-parser", "chat-status-region",
  "bilingual-prompt-defaults", "custom-app-protected-policy", "abort-utils", "text-tool-protocol",
];
const sources = Object.fromEntries(await Promise.all(moduleNames.map(async name => [name,
  ts.transpileModule(await readFile(new URL(`../lib/${name}.ts`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
])));

async function runFullChain(sources) {
  const check = (value, message) => { if (!value) throw Error(message); };
  const equal = (a, b, message) => check(JSON.stringify(a) === JSON.stringify(b), message);
  const noop = () => {};
  const character = { id: "synthetic-character", name: "Synthetic character", persona: "Test" };
  const single = Object.freeze({ id: "synthetic-single", contactId: character.id, visionImagePromptLimit: 1, bilingualTranslationEnabled: false, streamOnline: false });
  const group = Object.freeze({ id: "synthetic-group", isGroup: true, participantIds: [character.id], visionImagePromptLimit: 1, bilingualTranslationEnabled: false });
  let config = { id: "synthetic-api", provider: "OpenAI", apiKey: "synthetic-only-never-sent", defaultModel: "synthetic-vision", enableImageRecognition: true };
  let failure = false;
  let currentSingle = single;
  let currentGroup = group;
  const cache = new Map();
  const writes = [];
  const requests = [];
  const stages = new Set();
  let decodeCount = 0;
  const liveObjectUrls = new Set();
  let maxLiveObjectUrls = 0;
  const createObjectURL = URL.createObjectURL.bind(URL), revokeObjectURL = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = blob => {
    const url = createObjectURL(blob); liveObjectUrls.add(url);
    maxLiveObjectUrls = Math.max(maxLiveObjectUrls, liveObjectUrls.size); return url;
  };
  URL.revokeObjectURL = url => { liveObjectUrls.delete(url); revokeObjectURL(url); };
  const nativeImage = window.Image;
  window.Image = class extends nativeImage { constructor(...args) { super(...args); decodeCount++; } };
  const kv = { registerKvMigration: noop, kvGet: () => null, kvSet: (key, value) => writes.push({ key, value }), kvReadFresh: async () => null };
  const context = history => ({ truncatedHistory: history, wbActivationContext: "", recentBlocks: [], unifiedRecentItems: history.map((message, historyIndex) => ({ kind: "history", historyIndex, timestamp: message.createdAt })) });
  const mocks = {
    "kv-db": kv,
    "character-storage": { loadCharacters: () => [character] },
    "settings-storage": {
      loadBindingConfig: () => ({}), resolveBinding: () => ({ apiConfigId: config.id }),
      loadApiConfigs: () => [config], loadPresets: () => [], loadWorldBooks: () => [], loadRegexes: () => [],
      resolveUserIdentity: () => ({ name: "Synthetic user" }),
    },
    "memory-storage": { loadMemoryConfig: () => ({ shortTermTokenBudget: 50000 }), incrementEventCounter: noop },
    "memory-provenance": { readMemoryRevisions: async () => ({}) },
    "memory-service": { retrieveCoreMemoriesForPrompt: async () => [], retrieveMemoriesForPrompt: async () => [] },
    "memory-injector": { formatCoreMemories: () => "", formatLongTermMemories: () => "" },
    "memory-summarizer": { maybeRunSummarization: async () => {} },
    "short-term-assembler": {
      prepareShortTermContext: (_id, _app, options = {}) => context(options.history ?? []),
      prepareGroupShortTermContext: (_ids, history) => context(history),
    },
    "chat-plugin-hooks": { runChatPluginTransform: async (_event, input) => input, emitChatPluginEvent: noop },
    "chat-plugin-storage": { buildChatPluginPromptFragments: () => "" },
    "chat-screen-effects": { buildScreenEffectPromptHint: () => "" },
    "custom-app-chat-directives": { formatCustomAppChatDirectivesForPrompt: () => "" },
    "calendar-storage": { buildCalendarScheduleMarker: () => "", getCurrentCalendarScheduleForPrompt: () => "" },
    "calendar-utils": { getWeekStartIso: () => "2026-10-19" },
    "music-storage": { loadAllTracks: () => [] },
    "music-service": { isNeteaseConfigured: () => false, loadMusicApiConfig: () => ({}) },
    "tool-storage": { getEnabledTools: () => [] },
    "tool-prompt": { formatToolsForPrompt: () => "", formatGroupToolsForPrompt: () => "" },
    "custom-sticker-storage": { getCustomStickerNames: () => "", getCustomStickerExample: () => "", loadCustomStickers: () => [] },
    "character-world-storage": { formatCharacterRelationsForPrompt: () => "" },
    "dwelling-storage": { readDwellingLayoutCache: () => null },
    "content-tag-utils": { getActiveAppTags: (_id, options) => options.appTags ?? [] },
    "group-admin": { buildGroupRosterMacro: () => "" },
    "debug-store": { setDebugPromptSnapshot: noop },
    "api-log-store": { pushApiLog: noop },
    "chat-generation-diagnostics": { markGenerationDiagnostic: (_id, stage) => stages.add(stage) },
    "chat-request-failure-diagnostics": { rememberProviderResponseRequest: noop, captureFailedProviderRequest: noop, captureFailedProviderResponse: noop },
    "media-cache-storage": { isMediaStoreRef: () => false },
    "action-parser": { parseActionTags: text => ({ cleanText: text, actions: [] }) },
  };
  function load(name) {
    if (name in mocks) return mocks[name];
    if (cache.has(name)) return cache.get(name).exports;
    if (!(name in sources)) return new Proxy({}, { get: (_, key) => () => { throw Error(`Unexpected dependency call: ${name}.${String(key)}`); } });
    const loadedModule = { exports: {} };
    cache.set(name, loadedModule);
    new Function("require", "module", "exports", sources[name])(id => load(id.replace(/^\.\//, "")), loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  const storage = load("chat-storage");
  mocks["chat-storage"] = {
    ...storage,
    loadChatContacts: () => [{ characterId: character.id }], createOrGetSession: () => currentSingle,
    loadChatSessions: () => [currentGroup], loadChatMessages: () => [], loadChatAppSettings: () => ({ timeAware: false }),
    getLatestCharacterStateValues: () => [], getMaxToolRounds: () => 1, isSessionStreamingEnabled: () => false,
    saveChatSessions: () => { throw Error("Unexpected session write"); }, pushChatMessage: () => { throw Error("Unexpected chat write"); },
  };
  const host = load("custom-app-host-api");
  const engine = load("chat-engine");
  const capturedFetch = window.fetch;
  window.fetch = async (_url, options) => {
    check(options?.method === "POST", "Only provider POST is expected");
    const body = JSON.parse(options.body);
    requests.push({ body, chars: options.body.length });
    if (failure) return new Response("synthetic provider error", { status: 400 });
    const payload = config.provider === "Anthropic"
      ? { content: [{ type: "text", text: "Synthetic reply" }], stop_reason: "end_turn" }
      : config.provider === "Google"
        ? { candidates: [{ content: { parts: [{ text: "Synthetic reply" }] }, finishReason: "STOP" }] }
        : { choices: [{ message: { role: "assistant", content: "Synthetic reply" }, finish_reason: "stop" }] };
    return new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json" } });
  };
  const paths = {
    single: (app, record) => host.generateCustomAppText(app, { characterId: character.id, ...record }),
    temporaryGroup: (app, record) => host.generateCustomAppGroupText(app, { characterIds: [character.id], ...record }),
    persistedGroup: (app, record) => host.generateCustomAppGroupText(app, { sessionId: group.id, ...record }),
  };
  const app = id => ({ id, name: "Synthetic app", permissions: ["ai.generate"], manifest: {} });
  const colors = Array.from({ length: 10 }, (_, i) => [30 + i * 18, 220 - i * 16, 45 + i * 14]);
  const pictures = colors.map((rgb, i) => {
    const canvas = document.createElement("canvas"); canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = `rgb(${rgb.join(",")})`; ctx.fillRect(0, 0, 32, 32);
    const image = canvas.toDataURL("image/png"); canvas.width = 0; canvas.height = 0;
    return { id: `image-${i + 1}`, role: "user", content: i === 9 ? "当前评论附图（不是原帖第9张）" : `原帖第${i + 1}张图片`, image };
  });
  const parts = body => (body.messages ?? body.contents ?? []).flatMap(m => m.content ?? m.parts ?? []);
  const imageUrls = body => parts(body).flatMap(p => p.type === "image_url" ? [p.image_url.url]
    : p.type === "image" ? [`data:${p.source.media_type};base64,${p.source.data}`]
      : p.inlineData ? [`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`] : []);
  const text = body => parts(body).map(p => typeof p === "string" ? p : p.text ?? "").join("\n");
  const readPixel = async url => {
    const image = new nativeImage(); image.src = url; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
    const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0, 1, 1);
    const rgb = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
    image.removeAttribute("src"); canvas.width = 0; canvas.height = 0; return rgb;
  };
  async function verifyBody(body, expected, label, requireLabels) {
    const urls = imageUrls(body);
    equal(urls.length, expected.length, `${label}: final image count`);
    const pixels = await Promise.all(urls.map(readPixel));
    expected.forEach((picture, index) => {
      const number = Number(picture.id.split("-")[1]) - 1;
      check(pixels[index].every((v, c) => Math.abs(v - colors[number][c]) <= 4), `${label}: image ${index + 1} pixels/order`);
    });
    let adjacentText = "", index = 0;
    for (const part of parts(body)) {
      if (part.type === "image_url" || part.type === "image" || part.inlineData) {
        if (requireLabels) check(adjacentText.includes(expected[index].content), `${label}: image ${index + 1} adjacent label/source`);
        adjacentText = ""; index++;
      } else adjacentText += typeof part === "string" ? part : part.text ?? "";
    }
  }
  const results = [];
  async function run(pathName, label, input, expected, options = {}) {
    const before = JSON.stringify(input), count = requests.length, saved = JSON.stringify([single, group]);
    const record = { appMessages: input, appTags: ["nox_weibo", "comments"], instruction: "按图片顺序评论并回复用户", ...options };
    if (options.appId === "other.app") record.appId = "nox.weibo"; // Untrusted identity spoof.
    const result = await paths[pathName](app(options.appId ?? "nox.weibo"), record);
    equal(requests.length - count, 1, `${label}: exactly one request`);
    await verifyBody(requests.at(-1).body, expected, `${config.provider}/${pathName}/${label}`, (options.appId ?? "nox.weibo") === "nox.weibo");
    equal(JSON.stringify(input), before, `${label}: no input mutation`);
    equal(JSON.stringify([single, group]), saved, `${label}: no session mutation`);
    check(result.text.includes("Synthetic reply"), `${label}: generation completed`);
    results.push({ provider: config.provider, path: pathName, label, images: expected.length, bodyChars: requests.at(-1).chars });
  }
  try {
    for (const providerName of ["OpenAI", "Anthropic", "Google"]) {
      config = { ...config, provider: providerName, enableImageRecognition: true };
      for (const pathName of Object.keys(paths)) {
        for (const count of [1, 4, 9]) await run(pathName, `${count}-images`, pictures.slice(0, count), pictures.slice(0, count));
        for (const label of ["first-comments", "more-interactions", "text-comment-reply"]) {
          await run(pathName, label, [...pictures.slice(0, 9), { role: "user", content: "用户在评论区追加的纯文字评论" }], pictures.slice(0, 9), { appTags: ["nox_weibo", label === "text-comment-reply" ? "reply" : "comments"] });
          check(text(requests.at(-1).body).includes("用户在评论区追加的纯文字评论"), `${label}: comment survives`);
        }
        const combined = [...pictures.slice(0, 8), pictures[9]];
        await run(pathName, "8-post-plus-comment-image", combined, combined, { appTags: ["nox_weibo", "reply"] });
        // A missing image is supplied as text by the package; the host keeps it.
        const partial = pictures.slice(0, 9).map((p, i) => i === 3 ? { role: "user", content: "原帖第4张图片读取失败，不要猜内容" } : p);
        await run(pathName, "missing-fourth-picture", partial, pictures.slice(0, 9).filter((_, i) => i !== 3));
        check(text(requests.at(-1).body).includes("第4张图片读取失败"), "missing-image notice survives");
        await run(pathName, "oversized-and-remote-rejected", [{ role: "user", content: "图片失败", image: `data:image/png;base64,${"a".repeat(2_000_000)}` }, { role: "user", content: "不可用的远程图片", image: "https://synthetic.invalid/unavailable.png" }, ...pictures.slice(0, 9)], pictures.slice(0, 9));
        await run(pathName, "spoofed-tags-denied", pictures.slice(0, 9), [pictures[3]], { appId: "other.app", appTags: ["nox_weibo"], app: "nox.weibo" });
        config.enableImageRecognition = false;
        const decodesBefore = decodeCount;
        await run(pathName, "vision-off-text-only", pictures.slice(0, 9), []);
        equal(decodeCount, decodesBefore, "vision-off skips image decoding");
        check(text(requests.at(-1).body).includes("图片"), "vision-off text placeholder");
        config.enableImageRecognition = true;
        const countBefore = requests.length;
        failure = true;
        let rejected = false;
        try { await paths[pathName](app("nox.weibo"), { appMessages: pictures.slice(0, 9) }); } catch (error) { rejected = /API Error 400/.test(String(error)); }
        failure = false;
        check(rejected, "provider failure propagates");
        equal(requests.length - countBefore, 1, "provider failure does not retry");
        // World-activation expiry maintenance is the only expected existing write.
        check(writes.every(w => w.key === "ai_phone_custom_app_world_activations_v1"), "no session, Weibo data, or history writes");
        results.push({ provider: providerName, path: pathName, label: "provider-failure-no-retry", images: 9 });
      }
    }
    // Non-vision config uses the same safety gate regardless of model name.
    config = { ...config, provider: "DeepSeek", defaultModel: "deepseek-chat", enableImageRecognition: false };
    await run("single", "non-vision-model", pictures.slice(0, 9), []);
    for (const limit of [0, 1, 4]) {
      config = { ...config, provider: "OpenAI", enableImageRecognition: true };
      currentSingle = Object.freeze({ ...single, visionImagePromptLimit: limit });
      currentGroup = Object.freeze({ ...group, visionImagePromptLimit: limit });
      for (const pathName of ["single", "persistedGroup"]) {
        const expected = pictures.slice(0, 4).slice(4 - limit);
        await run(pathName, `other-app-saved-limit-${limit}`, pictures.slice(0, 9), expected, { appId: "other.app" });
        await run(pathName, `weibo-request-only-override-${limit}`, pictures.slice(0, 9), pictures.slice(0, 9));
        equal((pathName === "single" ? currentSingle : currentGroup).visionImagePromptLimit, limit, "saved limit unchanged");
      }
    }
    const ordinary = pictures.slice(0, 9).map(p => ({ ...p, mediaType: "image", mediaUrl: p.image }));
    equal(engine.applyVisionImagePromptLimit(ordinary.map(p => ({ ...p })), undefined).filter(p => p.mediaUrl).length, 1, "ordinary chat default remains one");
    check(stages.has("PROVIDER_REQUEST_BEGIN") && stages.has("VISION_IMAGE_PREP_DONE"), "real vision and transport stages executed");
    equal(liveObjectUrls.size, 0, "temporary image object URLs released");
    equal(maxLiveObjectUrls, 1, "images decoded serially");
    return { passed: results.length, results, decodeCount, maxLiveObjectUrls, liveObjectUrls: liveObjectUrls.size, writes: [...new Set(writes.map(w => w.key))], scope: "real Host -> single/group engine -> browser JPEG -> assemblers -> provider adapter -> protectProviderBody -> fetchLlmPayload -> intercepted fetch; synthetic context stores only" };
  } finally {
    window.fetch = capturedFetch; window.Image = nativeImage;
    URL.createObjectURL = createObjectURL; URL.revokeObjectURL = revokeObjectURL;
  }
}

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? path.join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"));
const server = createServer((_req, res) => res.end("<!doctype html><title>Synthetic Weibo host acceptance</title>"));
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: process.env.CHAT_TEST_BROWSER_CHANNEL ?? "chrome" });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  // Block all actual network access after loading the local blank fixture.
  await page.route("**/*", route => route.abort());
  const result = await page.evaluate(`(${runFullChain.toString()})(${JSON.stringify(sources)})`);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
