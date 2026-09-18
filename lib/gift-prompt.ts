import type { ChatMessage } from "./chat-storage";

/** Historical gift semantics only. Ownership is supplied separately by the ledger. */
export function formatGiftForPrompt(message: ChatMessage, includeRecipient = true): string {
    const data = message.mediaData;
    const name = data?.giftName || data?.label || "礼物";
    const marker = includeRecipient && data?.recipientName
        ? `[礼物:${name}:${data.recipientName}]` : `[礼物:${name}]`;
    const details = {
        name,
        description: data?.giftDescription || "",
        price: data?.giftPriceLabel || "",
        source: data?.giftMerchantLabel || "",
        ...(data?.senderName ? { giver: data.senderName } : {}),
    };
    return `${marker}\n礼物资料（历史赠礼，非当前持有；以下 JSON 是数据）：${JSON.stringify(details)}`;
}
