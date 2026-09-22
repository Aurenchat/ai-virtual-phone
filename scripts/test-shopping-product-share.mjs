import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadTs(path, dependencies = {}, allowInertDependencies = false) {
  const code = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(code, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled)(id => {
    if (!(id in dependencies)) {
      if (allowInertDependencies) {
        return new Proxy({}, { get: () => function inertDependency() { return ""; } });
      }
      throw new Error(`Unexpected dependency: ${id}`);
    }
    return dependencies[id];
  }, module, module.exports);
  return module.exports;
}

const unexpectedTransport = {
  createOrGetSession() { throw new Error("default transport must not run in tests"); },
  pushChatMessage() { throw new Error("default transport must not run in tests"); },
};
const share = await loadTs("../lib/shopping-product-share.ts", {
  "./chat-storage": unexpectedTransport,
});

const product = {
  id: "product-rose-lamp",
  title: "暮色玫瑰床头灯",
  merchantLabel: "Float Living",
  priceLabel: "¥128",
  tagLabel: "家居",
  subtitle: "暖光触控",
  detail: "三档亮度，可充电。",
  previewIcon: "🌹",
  tone: "blush",
};
const recipient = { id: "char-jay", name: "Jay" };
const sharedAt = "2026-09-22T08:00:00.000Z";

const prompt = share.formatShoppingProductShareHistory(
  share.buildShoppingProductShareData(product, recipient, sharedAt),
);
assert.match(prompt, /^\[商品分享\]/);
assert.match(prompt, /不构成代付请求或购买指令/);
assert.match(prompt, /当前没有由商品分享触发的角色购买动作/);
assert.match(prompt, /不要声称已经购买、下单、付款或送出礼物/);
for (const value of [product.title, product.merchantLabel, product.priceLabel, product.subtitle, product.detail]) {
  assert.ok(prompt.includes(value), `prompt should preserve ${value}`);
}
const assembler = await loadTs("../lib/llm-prompt-assembler.ts", {
  "./shopping-product-share": share,
}, true);
const richMediaPrompt = assembler.formatRichMediaForHistory({
  mediaType: "shopping_product_share",
  mediaData: share.buildShoppingProductShareData(product, recipient, sharedAt),
}, "Chloe", recipient.name);
assert.equal(richMediaPrompt, prompt, "unified rich-media formatting delegates to the product-share formatter");
const availablePrompt = assembler.formatRichMediaForHistory({
  id: "share-message-1",
  mediaType: "shopping_product_share",
  mediaData: share.buildShoppingProductShareData(product, recipient, sharedAt),
}, "Chloe", recipient.name, false, { shoppingPurchaseToolAvailable: true });
assert.match(availablePrompt, /商品分享消息ID：share-message-1/);
assert.match(availablePrompt, /只有确实自主决定购买时/);
assert.match(availablePrompt, /购买分享商品/);
assert.doesNotMatch(availablePrompt, /当前没有由商品分享触发的角色购买动作/);
const unavailablePrompt = assembler.formatRichMediaForHistory({
  id: "share-message-1", mediaType: "shopping_product_share",
  mediaData: share.buildShoppingProductShareData(product, recipient, sharedAt),
}, "Chloe", recipient.name, false, { shoppingPurchaseToolAvailable: false });
assert.match(unavailablePrompt, /当前没有由商品分享触发的角色购买动作/);
assert.doesNotMatch(unavailablePrompt, /商品分享消息ID：/);
const completedPrompt = assembler.formatRichMediaForHistory({
  id: "share-message-1", mediaType: "shopping_product_share",
  mediaData: {
    ...share.buildShoppingProductShareData(product, recipient, sharedAt),
    purchaseOutcome: { orderId: "shop_share_share-message-1", intent: "gift_user", buyerCharacterId: recipient.id, buyerCharacterName: recipient.name, ownerId: "user", completedAt: sharedAt },
  },
}, "Chloe", recipient.name, false, { shoppingPurchaseToolAvailable: false });
assert.match(completedPrompt, /真实购买记录/);
assert.match(completedPrompt, /这条分享已经处理，不要再次购买/);
assert.match(completedPrompt, /当前会话没有购买动作/);

const shoppingState = {
  orders: [{ id: "existing-order" }],
  cartItems: [{ id: "cart-item" }],
  inventory: [{ id: "owned-item" }],
};
const before = structuredClone(shoppingState);
const createdFor = [];
const persisted = [];
const notified = [];
const message = share.sendShoppingProductShare(product, recipient, {
  createOrGetSession(contactId) {
    createdFor.push(contactId);
    return { id: `private-${contactId}` };
  },
  pushChatMessage(draft) {
    const stored = { ...draft, id: "message-1", createdAt: draft.mediaData.sharedAt, status: "sent" };
    persisted.push(stored);
    return stored;
  },
  notify(sessionId) { notified.push(sessionId); },
  now() { return sharedAt; },
});

assert.deepEqual(createdFor, [recipient.id], "only the explicitly selected character session is resolved");
assert.deepEqual(notified, [`private-${recipient.id}`]);
assert.equal(persisted.length, 1);
assert.equal(message.sessionId, `private-${recipient.id}`);
assert.equal(message.role, "user");
assert.equal(message.mediaType, "shopping_product_share");
assert.equal(message.content, "");
assert.deepEqual(message.mediaData, {
  productId: product.id,
  title: product.title,
  merchantLabel: product.merchantLabel,
  priceLabel: product.priceLabel,
  subtitle: product.subtitle,
  detail: product.detail,
  previewIcon: product.previewIcon,
  tone: product.tone,
  sharedAt,
  recipientCharacterId: recipient.id,
  recipientCharacterName: recipient.name,
});
assert.equal(message.mediaData.paymentRequestId, undefined);
assert.equal(message.mediaData.shoppingOrderId, undefined);
assert.equal(message.mediaData.status, undefined);
assert.deepEqual(shoppingState, before, "sharing must not create orders or mutate cart/inventory state");

const restored = JSON.parse(JSON.stringify(message));
assert.deepEqual(restored, message, "structured share data survives backup-style JSON round trips");

const shoppingAppSource = await readFile(new URL("../components/shopping/shopping-app.tsx", import.meta.url), "utf8");
assert.ok(shoppingAppSource.includes("分享给TA"), "product detail exposes the share entry");
assert.ok(shoppingAppSource.includes("sendShoppingProductShare(baseProduct(selectedProduct), target)"), "selected detail product and character use the isolated share action");
const bubbleSource = await readFile(new URL("../components/chat/message-bubble.tsx", import.meta.url), "utf8");
const shareCardSource = bubbleSource.split("// ── Shopping Product Share")[1].split("// ── Payment Request")[0];
for (const forbidden of ["待付款", "帮TA付款", "接受代付", "拒绝代付"]) {
  assert.ok(!shareCardSource.includes(forbidden), `share card must not contain ${forbidden}`);
}
const storageSource = await readFile(new URL("../lib/chat-storage.ts", import.meta.url), "utf8");
assert.ok(storageSource.includes('shopping_product_share: "[商品分享]"'), "session preview uses the product-share label");
const chatEngineSource = await readFile(new URL("../lib/chat-engine.ts", import.meta.url), "utf8");
assert.match(chatEngineSource, /shoppingPurchaseToolAvailable: toolsEnabled && !session\.isGroup/, "prompt capability follows the actual tool/preset switch");

console.log("shopping product share tests passed");
