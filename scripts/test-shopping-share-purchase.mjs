import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import JSZip from "jszip";

async function loadTs(path, dependencies = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled)(id => {
    if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`);
    return dependencies[id];
  }, module, module.exports);
  return module.exports;
}

const shipping = await loadTs("../lib/shopping-payment-request.ts", {
  "./shopping-storage": { loadShoppingState() {}, saveShoppingState() {} },
});
const { purchaseSharedProduct } = await loadTs("../lib/shopping-share-purchase.ts", {
  "./chat-db": { chatDb: { messages: { put: async () => {} } } },
  "./chat-storage": { loadChatMessages() {}, loadChatSessions() {}, updateChatMessage() {} },
  "./character-storage": { loadCharacters() {} },
  "./native-gift-bridge": { confirmShoppingPurchaseOrder() {} },
  "./shopping-payment-request": shipping,
  "./shopping-storage": { loadShoppingState() {}, persistShoppingShareOrder() {} },
});
const pluginSource = await readFile(new URL("../plugins/float-possessions.js", import.meta.url), "utf8");
const { createPossessionsEngine, default: plugin } = await import("data:text/javascript;base64," + Buffer.from(pluginSource).toString("base64"));
assert.equal(plugin.manifest.id, "auren.float-possessions");
assert.equal(plugin.manifest.version, "1.0.2");

const tests = [];
async function test(name, run) { await run(); tests.push(name); }
async function rejects(run, pattern) { await assert.rejects(run, pattern); }
async function fixture() {
  const buyer = { id: "jay", name: "Jay Mercer" };
  const other = { id: "seb", name: "Sebastian" };
  const session = { id: "jay-chat", contactId: buyer.id, isGroup: false };
  const messages = [{
    id: "share-1", sessionId: session.id, role: "user", mediaType: "shopping_product_share", content: "",
    mediaData: { productId: "lamp-1", title: "Rose Lamp", merchantLabel: "Float Living", priceLabel: "¥128", subtitle: "Warm", detail: "Three levels", previewIcon: "🌹", tone: "blush", sharedAt: "2026-09-17T00:30:00.000Z", recipientCharacterId: buyer.id, recipientCharacterName: buyer.name },
  }];
  let wallet = { balance: 300, transactions: [] };
  let shopping = { orders: [], cartItems: [{ id: "existing-cart" }], settings: { deliveryMinMinutes: 60, deliveryMaxMinutes: 180 } };
  let ledger;
  let seq = 0, saved = 0, confirmed = 0, marked = 0;
  const locks = new Map();
  const ctx = {
    gifts: { changed() {} },
    system: { log() {}, storage: { async atomic(_key, update) { ledger = structuredClone(update(ledger ? structuredClone(ledger) : null)); return structuredClone(ledger); } } },
    data: {
      shopping: { get: () => shopping }, user: { name: () => "Chloe" },
      characters: { list: () => [buyer, other], get: id => [buyer, other].find(c => c.id === id) },
      sessions: { get: id => id === session.id ? session : null, list: () => [session] },
      messages: { list: id => messages.filter(m => m.sessionId === id), update() {} },
    },
  };
  const engine = createPossessionsEngine(ctx, { now: () => "2026-09-17T01:00:00.000Z", uuid: () => `item_${++seq}` });
  await engine.init();
  const deps = {
    loadMessages: id => messages.filter(m => m.sessionId === id),
    loadSessions: () => [session], loadCharacters: () => [buyer, other],
    loadShoppingState: () => shopping,
    async persistOrder(order, requireExisting) {
      const existing = shopping.orders.find(item => item.id === order.id || item.sourceShareMessageId === order.sourceShareMessageId);
      if (existing) {
        if (existing.purchaseIntent !== order.purchaseIntent || existing.buyerCharacterId !== order.buyerCharacterId || existing.ownerId !== order.ownerId) throw Error("该商品分享已经用于另一项购买决定");
        return { order: existing, created: false };
      }
      if (requireExisting) throw Error("该商品分享已处理，原订单不在当前购物记录中");
      saved++; shopping = { ...shopping, orders: [structuredClone(order), ...shopping.orders] };
      return { order, created: true };
    },
    async confirmOrder(orderId, ownerId) { confirmed++; return engine.confirmShoppingOrder(orderId, ownerId); },
    async markShare(id, mediaData) { marked++; const message = messages.find(m => m.id === id); if (!message) throw Error("missing"); message.mediaData = structuredClone(mediaData); },
    async withLock(key, run) {
      const prior = locks.get(key) || Promise.resolve();
      let release;
      const tail = new Promise(resolve => { release = resolve; });
      locks.set(key, prior.then(() => tail));
      await prior;
      try { return await run(); } finally { release(); }
    },
    now: () => new Date("2026-09-17T01:00:00.000Z"),
  };
  const input = { sourceShareMessageId: "share-1", intent: "self", sessionId: session.id, characterId: buyer.id };
  return { buyer, other, session, messages, deps, input, engine, get shopping() { return shopping; }, get ledger() { return ledger; }, get wallet() { return wallet; }, get saved() { return saved; }, get confirmed() { return confirmed; }, get marked() { return marked; } };
}

await test("normal reply does not purchase or change wallet/cart/possessions", async () => {
  const f = await fixture();
  assert.equal(f.shopping.orders.length, 0); assert.equal(f.wallet.balance, 300);
  assert.deepEqual(f.shopping.cartItems, [{ id: "existing-cart" }]); assert.deepEqual(f.engine.inventory("user"), []);
});
await test("self purchase persists one paid character order and one character possession", async () => {
  const f = await fixture(); const beforeWallet = structuredClone(f.wallet), beforeCart = structuredClone(f.shopping.cartItems);
  const result = await purchaseSharedProduct(f.input, f.deps);
  assert.equal(result.repeated, false); assert.equal(f.saved, 1); assert.equal(f.confirmed, 1); assert.equal(f.marked, 1);
  assert.equal(f.shopping.orders.length, 1); assert.equal(result.order.paymentStatus, "paid_by_character");
  assert.equal(result.order.buyerCharacterId, "jay"); assert.equal(result.order.ownerId, "jay");
  assert.deepEqual(f.wallet, beforeWallet); assert.deepEqual(f.shopping.cartItems, beforeCart);
  assert.equal(f.engine.inventory("jay").length, 1); assert.equal(f.engine.inventory("user").length, 0);
  assert.equal(Object.keys(f.ledger.items).length, 1);
});
await test("gift_user purchase creates one user possession with buyer provenance", async () => {
  const f = await fixture(); const result = await purchaseSharedProduct({ ...f.input, intent: "gift_user" }, f.deps);
  assert.equal(result.order.ownerId, "user"); assert.equal(result.order.buyerCharacterId, "jay");
  assert.equal(f.engine.inventory("user").length, 1); assert.equal(f.engine.inventory("jay").length, 0);
  assert.equal(Object.keys(f.ledger.items).length, 1); assert.equal(Object.values(f.ledger.items)[0].provenance.purchaseIntent, "gift_user");
  assert.equal(f.messages.filter(message => message.mediaType === "gift").length, 0, "no second gift ingestion path");
  assert.equal(f.wallet.balance, 300); assert.deepEqual(f.shopping.cartItems, [{ id: "existing-cart" }]);
});
await test("same action replay, regeneration and concurrent retry create one order/item", async () => {
  const f = await fixture(); const results = await Promise.all([purchaseSharedProduct(f.input, f.deps), purchaseSharedProduct(f.input, f.deps)]);
  assert.deepEqual(results.map(r => r.repeated), [false, true]);
  const replay = await purchaseSharedProduct(f.input, f.deps); assert.equal(replay.repeated, true);
  await rejects(() => purchaseSharedProduct({ ...f.input, intent: "gift_user" }, f.deps), /另一项购买决定/);
  assert.equal(f.shopping.orders.length, 1); assert.equal(Object.keys(f.ledger.items).length, 1); assert.equal(f.saved, 1);
});
await test("missing, cross-session, wrong-recipient and non-user shares are rejected", async () => {
  const f = await fixture();
  await rejects(() => purchaseSharedProduct({ ...f.input, sourceShareMessageId: "missing" }, f.deps), /不存在有效/);
  await rejects(() => purchaseSharedProduct({ ...f.input, sessionId: "other-chat" }, f.deps), /当前角色私聊/);
  f.deps.loadSessions = () => [f.session, { id: "jay-second", contactId: "jay", isGroup: false }];
  await rejects(() => purchaseSharedProduct({ ...f.input, sessionId: "jay-second" }, f.deps), /不存在有效/);
  f.messages[0].mediaData.recipientCharacterId = "seb";
  await rejects(() => purchaseSharedProduct(f.input, f.deps), /并非分享给当前角色/);
  f.messages[0].mediaData.recipientCharacterId = "jay"; f.messages[0].role = "assistant";
  await rejects(() => purchaseSharedProduct(f.input, f.deps), /不存在有效/);
  assert.equal(f.shopping.orders.length, 0); assert.equal(Object.keys(f.ledger.items).length, 0);
});
await test("malformed share snapshot is rejected without state change", async () => {
  const f = await fixture(); delete f.messages[0].mediaData.priceLabel;
  await rejects(() => purchaseSharedProduct(f.input, f.deps), /缺少必要/);
  assert.equal(f.shopping.orders.length, 0); assert.equal(Object.keys(f.ledger.items).length, 0);
});
await test("model price injection is ignored; canonical share snapshot wins", async () => {
  const f = await fixture(); const result = await purchaseSharedProduct({ ...f.input, priceLabel: "¥0", title: "Fake" }, f.deps);
  assert.equal(result.order.items[0].priceLabel, "¥128"); assert.equal(result.order.items[0].title, "Rose Lamp");
});
await test("ledger failure never reports success and retry resumes existing order", async () => {
  const f = await fixture(); const realConfirm = f.deps.confirmOrder; let fail = true;
  f.deps.confirmOrder = async (...args) => { if (fail) { fail = false; throw Error("ledger unavailable"); } return realConfirm(...args); };
  await rejects(() => purchaseSharedProduct(f.input, f.deps), /ledger unavailable/);
  assert.equal(f.shopping.orders.length, 1); assert.equal(f.marked, 0);
  const result = await purchaseSharedProduct(f.input, f.deps); assert.equal(result.repeated, true);
  assert.equal(f.shopping.orders.length, 1); assert.equal(Object.keys(f.ledger.items).length, 1); assert.equal(f.marked, 1);
});
await test("order persistence failure leaves no order, item or success marker", async () => {
  const f = await fixture();
  f.deps.persistOrder = async () => { throw Error("IDB write failed"); };
  await rejects(() => purchaseSharedProduct(f.input, f.deps), /IDB write failed/);
  assert.equal(f.shopping.orders.length, 0); assert.equal(Object.keys(f.ledger.items).length, 0); assert.equal(f.marked, 0);
});
await test("a second share of the same product is a separate purchase opportunity", async () => {
  const f = await fixture(); await purchaseSharedProduct(f.input, f.deps);
  f.messages.push({ ...structuredClone(f.messages[0]), id: "share-2", mediaData: { ...structuredClone(f.messages[0].mediaData), purchaseOutcome: undefined } });
  await purchaseSharedProduct({ ...f.input, sourceShareMessageId: "share-2" }, f.deps);
  assert.equal(f.shopping.orders.length, 2); assert.equal(Object.keys(f.ledger.items).length, 2);
});
await test("processed share whose order was removed cannot create a replacement", async () => {
  const f = await fixture(); await purchaseSharedProduct(f.input, f.deps); f.shopping.orders.splice(0);
  await rejects(() => purchaseSharedProduct(f.input, f.deps), /已处理/);
  assert.equal(Object.keys(f.ledger.items).length, 1);
});
await test("backup-style export/import keeps purchase fields and share outcome", async () => {
  const f = await fixture(); await purchaseSharedProduct({ ...f.input, intent: "gift_user" }, f.deps);
  const restored = JSON.parse(JSON.stringify({ order: f.shopping.orders[0], share: f.messages[0] }));
  assert.equal(restored.order.sourceShareMessageId, "share-1"); assert.equal(restored.order.ownerId, "user");
  assert.equal(restored.order.purchaseIntent, "gift_user"); assert.equal(restored.share.mediaData.purchaseOutcome.intent, "gift_user");
});
await test("backup envelope export and zip import preserve order and share records", async () => {
  const f = await fixture(); await purchaseSharedProduct({ ...f.input, intent: "gift_user" }, f.deps);
  const modules = [
    { id: "content", label: "Content", sources: [{ type: "kv", label: "shopping", keys: ["ai_phone_shopping_state_v1"] }] },
    { id: "chat", label: "Chat", sources: [{ type: "indexeddb", dbName: "AiPhoneChatDB", label: "messages" }] },
  ];
  const imported = [];
  const backup = await loadTs("../lib/data-management/backup.ts", {
    jszip: { default: JSZip }, "../download-utils": { downloadFile() {} }, "../sha256-stream": { sha256BlobHex() {} },
    "./modules": { DATA_MODULES: modules, CLOUD_CREDENTIAL_KV_KEYS: [] },
    "./idb": {
      async exportSource(source) {
        if (source.type === "kv") return { type: "kv", records: [{ key: "ai_phone_shopping_state_v1", value: JSON.stringify(f.shopping) }] };
        return { type: "indexeddb", dbName: "AiPhoneChatDB", stores: [{ name: "messages", records: f.messages.map(message => ({ key: message.id, value: structuredClone(message) })) }] };
      },
      async importSource(source) { imported.push(structuredClone(source)); return { added: 1, skipped: 0, overwritten: 0, errors: [] }; },
      async clearSource() {}, async inspectSource() {},
    },
    "./serializers": { createMediaCollector: () => ({ media: new Map() }), estimateValueBytes: value => JSON.stringify(value).length, utf8Bytes: value => Buffer.byteLength(value) },
  });
  const envelope = await backup.buildBackupEnvelope(["content", "chat"]);
  const zip = new JSZip(); zip.file("manifest.json", JSON.stringify(envelope.manifest));
  for (const module of envelope.modules) zip.file(`modules/${module.moduleId}/000.json`, JSON.stringify(module));
  const result = await backup.importBackupBlob(Buffer.from(await zip.generateAsync({ type: "uint8array" })), ["content", "chat"]);
  assert.deepEqual(result.errors, []);
  assert.equal(JSON.parse(imported.find(source => source.type === "kv").records[0].value).orders[0].sourceShareMessageId, "share-1");
  assert.equal(imported.find(source => source.type === "indexeddb").stores[0].records[0].value.mediaData.purchaseOutcome.intent, "gift_user");
});
await test("restored shopping state normalizes new order fields without changing legacy ownership", async () => {
  const f = await fixture(); await purchaseSharedProduct({ ...f.input, intent: "gift_user" }, f.deps);
  let raw = JSON.stringify({ ...f.shopping, orders: [f.shopping.orders[0], { ...f.shopping.orders[0], id: "old-order", sourceShareMessageId: undefined, purchaseSource: undefined, purchaseIntent: undefined, ownerId: undefined, buyerCharacterId: undefined, buyerCharacterName: undefined }] });
  const storage = await loadTs("../lib/shopping-storage.ts", {
    "./kv-db": {
      registerKvMigration() {}, kvGet: () => raw, kvSet() {},
      async kvUpdateAtomic(_key, update) { const next = update(raw); raw = next.value; return next.result; },
    },
    "./shopping-engine": { DEFAULT_SHOPPING_REFRESH_PROMPT: "refresh", DEFAULT_SHOPPING_SEARCH_PROMPT: "search", SHOPPING_RECOMMENDATION_CATEGORIES: [] },
  });
  const previousWindow = globalThis.window;
  globalThis.window = { dispatchEvent() {} };
  try {
    const restored = storage.loadShoppingState();
    assert.equal(restored.orders[0].buyerCharacterId, "jay"); assert.equal(restored.orders[0].purchaseIntent, "gift_user");
    assert.equal(restored.orders[0].sourceShareMessageId, "share-1"); assert.equal(restored.orders[0].ownerId, "user");
    assert.equal(restored.orders[1].ownerId, undefined);
    const same = await storage.persistShoppingShareOrder(restored.orders[0], true);
    assert.equal(same.created, false); assert.equal(JSON.parse(raw).orders.length, 2);
  } finally { globalThis.window = previousWindow; }
});
await test("gift-picker fallback excludes character self-purchases", async () => {
  const f = await fixture();
  await purchaseSharedProduct(f.input, f.deps);
  const characterOrder = structuredClone(f.shopping.orders[0]);
  characterOrder.shippingTimeline = [{ status: "delivered", timestamp: "2026-09-17T01:00:00.000Z", timeLabel: "01:00", label: "已到货" }];
  const giftUtils = await loadTs("../lib/shopping-gift-utils.ts", {
    "./chat-storage": { loadChatSessions: () => [], loadChatMessages: () => [] },
    "./shopping-storage": { loadShoppingState: () => ({ orders: [characterOrder] }) },
  });
  assert.deepEqual(giftUtils.loadDeliveredShoppingGifts({ nowMs: Date.parse("2026-09-17T02:00:00.000Z") }), []);
});

const backupModules = await readFile(new URL("../lib/data-management/modules.ts", import.meta.url), "utf8");
assert.match(backupModules, /ai_phone_shopping_state_v1/, "shopping orders remain in the backup module");

for (const name of tests) console.log("PASS", name);
console.log(`${tests.length} shopping share purchase checks passed.`);
