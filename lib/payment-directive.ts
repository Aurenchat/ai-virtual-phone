import type { ChatMessage } from "./chat-storage";
import { normalizeCurrency } from "./payment-currency";

/** Preserve currency through LLM history; legacy CNY keeps its existing syntax. */
export function paymentDirective(msg: ChatMessage, isGroup = true): string {
  const data = msg.mediaData, currency = normalizeCurrency(data?.currency);
  const prefix = currency === "CNY" ? "" : `${currency}:`;
  if (msg.mediaType === "red_packet") {
    return `[红包:${prefix}${data?.amount ?? 0}:${isGroup && (data?.count || 1) > 1 ? `${data!.count}:` : ""}${data?.label || "恭喜发财"}]`;
  }
  return `[转账:${prefix}${data?.amount ?? 0}:${data?.label || "转账"}${isGroup && data?.senderName && data?.recipientName ? `:${data.senderName}:${data.recipientName}` : ""}]`;
}
