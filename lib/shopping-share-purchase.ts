import { chatDb } from "./chat-db";
import { loadChatMessages, loadChatSessions, updateChatMessage, type ChatMessage, type ChatSession } from "./chat-storage";
import { loadCharacters } from "./character-storage";
import { confirmShoppingPurchaseOrder } from "./native-gift-bridge";
import { buildShoppingShippingTimeline } from "./shopping-payment-request";
import { loadShoppingState, persistShoppingShareOrder } from "./shopping-storage";
import type { ShoppingOrder, ShoppingState } from "./shopping-types";
import type { ShoppingProductShareData } from "./shopping-product-share";

export type ShoppingSharePurchaseIntent = "self" | "gift_user";
export type ShoppingSharePurchaseResult = {
  order: ShoppingOrder;
  repeated: boolean;
};

export type ShoppingSharePurchaseDependencies = {
  loadMessages(sessionId: string): ChatMessage[];
  loadSessions(): ChatSession[];
  loadCharacters(): Array<{ id: string; name: string }>;
  loadShoppingState(): ShoppingState;
  persistOrder(order: ShoppingOrder, requireExisting: boolean): Promise<{ order: ShoppingOrder; created: boolean }>;
  confirmOrder(orderId: string, ownerId: string): Promise<{ itemId: string; ownerId: string }>;
  markShare(messageId: string, data: ChatMessage["mediaData"]): Promise<void>;
  withLock<T>(key: string, run: () => Promise<T>): Promise<T>;
  now(): Date;
};

const defaultDependencies: ShoppingSharePurchaseDependencies = {
  loadMessages: loadChatMessages,
  loadSessions: loadChatSessions,
  loadCharacters: () => loadCharacters(),
  loadShoppingState,
  persistOrder: persistShoppingShareOrder,
  confirmOrder: confirmShoppingPurchaseOrder,
  async markShare(messageId, data) {
    const updated = updateChatMessage(messageId, { mediaData: data });
    if (!updated) throw new Error("原商品分享消息已不存在");
    await chatDb.messages.put(updated);
  },
  async withLock(key, run) {
    if (typeof navigator === "undefined" || !navigator.locks?.request) {
      throw new Error("当前环境无法安全保证购物动作不重复，请稍后重试");
    }
    return navigator.locks.request(`float:shopping-share:${key}`, { mode: "exclusive" }, run);
  },
  now: () => new Date(),
};

function requireSnapshot(message: ChatMessage): ShoppingProductShareData {
  const data = message.mediaData;
  const fields = ["productId", "title", "merchantLabel", "priceLabel", "subtitle", "detail", "previewIcon", "sharedAt", "recipientCharacterId", "recipientCharacterName"] as const;
  if (!data || fields.some(key => typeof data[key] !== "string" || !data[key]?.trim())) {
    throw new Error("原商品分享缺少必要的商品资料");
  }
  if (!(["ivory", "mist", "blush", "graphite"] as const).includes(data.tone as "ivory")) {
    throw new Error("原商品分享商品样式无效");
  }
  return data as ShoppingProductShareData;
}

function makeOrder(
  share: ShoppingProductShareData,
  messageId: string,
  buyer: { id: string; name: string },
  intent: ShoppingSharePurchaseIntent,
  state: ShoppingState,
  now: Date,
): ShoppingOrder {
  const id = `shop_share_${messageId}`;
  const ownerId = intent === "self" ? buyer.id : "user";
  return {
    id,
    statusLabel: "待发货",
    timeLabel: now.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
    totalLabel: share.priceLabel,
    merchantLabel: share.merchantLabel,
    summary: share.title,
    note: intent === "self" ? `${buyer.name}为自己购买。` : `${buyer.name}购买并送给你。`,
    items: [{
      id: share.productId,
      title: share.title,
      merchantLabel: share.merchantLabel,
      priceLabel: share.priceLabel,
      quantityLabel: "1 件",
      subtitle: share.subtitle,
      detail: share.detail,
      previewIcon: share.previewIcon,
      tone: share.tone,
    }],
    shippingTimeline: buildShoppingShippingTimeline(id, now, state.settings),
    paymentStatus: "paid_by_character",
    paidAt: now.toISOString(),
    characterPaidAt: now.toISOString(),
    paymentCardLabel: `${buyer.name}支付`,
    buyerCharacterId: buyer.id,
    buyerCharacterName: buyer.name,
    ownerId,
    purchaseSource: "product_share",
    sourceShareMessageId: messageId,
    purchaseIntent: intent,
  };
}

/** The order is durable and the possessions provider has attested its unique owner before success. */
export async function purchaseSharedProduct(
  input: { sourceShareMessageId: string; intent: ShoppingSharePurchaseIntent; sessionId: string; characterId: string },
  deps: ShoppingSharePurchaseDependencies = defaultDependencies,
): Promise<ShoppingSharePurchaseResult> {
  if (!input.sourceShareMessageId || !["self", "gift_user"].includes(input.intent)) throw new Error("购买动作参数无效");
  return deps.withLock(input.sourceShareMessageId, async () => {
    const session = deps.loadSessions().find(item => item.id === input.sessionId);
    if (!session || session.isGroup || session.contactId !== input.characterId) throw new Error("购买动作仅允许在当前角色私聊执行");
    const buyer = deps.loadCharacters().find(item => item.id === input.characterId);
    if (!buyer) throw new Error("购买角色不存在");
    const message = deps.loadMessages(input.sessionId).find(item => item.id === input.sourceShareMessageId);
    if (!message || message.sessionId !== input.sessionId || message.role !== "user" || message.isRetracted || message.mediaType !== "shopping_product_share") {
      throw new Error("当前私聊中不存在有效的用户商品分享");
    }
    const share = requireSnapshot(message);
    if (share.recipientCharacterId !== buyer.id) throw new Error("该商品并非分享给当前角色");
    const candidate = makeOrder(share, message.id, buyer, input.intent, deps.loadShoppingState(), deps.now());
    const { order, created } = await deps.persistOrder(candidate, Boolean(message.mediaData?.purchaseOutcome));
    const confirmed = await deps.confirmOrder(order.id, order.ownerId ?? "user");
    if (confirmed.ownerId !== order.ownerId || !confirmed.itemId) throw new Error("物品持有插件未确认正确归属");
    if (!message.mediaData?.purchaseOutcome) {
      try {
        await deps.markShare(message.id, {
          ...message.mediaData,
          purchaseOutcome: {
            orderId: order.id,
            intent: order.purchaseIntent!,
            buyerCharacterId: buyer.id,
            buyerCharacterName: buyer.name,
            ownerId: order.ownerId!,
            completedAt: deps.now().toISOString(),
          },
        });
      } catch (error) {
        // The durable order and attested ledger are the success boundary. A missing
        // chat marker can be recovered on replay from the stable order reference.
        console.warn("[ShoppingSharePurchase] share result marker could not be saved", error);
      }
    }
    return { order, repeated: !created };
  });
}
