import type { ChatMessage } from "./chat-storage";
import { formatPaymentAmount, normalizeCurrency } from "./payment-currency";

export type PaymentDisplayState = "pending" | "completed" | "returned";
const statusGlyphs: Record<PaymentDisplayState, string> = { pending: "◷", completed: "✓", returned: "×" };
export const paymentStatusGlyph = (state: PaymentDisplayState): string => statusGlyphs[state];

/** Presentation state comes from transaction semantics, never translated labels. */
export function paymentDisplayState(kind: "transfer" | "red_packet", data: ChatMessage["mediaData"], claimant?: string): PaymentDisplayState {
  if (data?.status === "declined") return "returned";
  const completed = kind === "transfer" ? data?.status === "received"
    : data?.status === "opened" || (data?.claimedBy?.length || 0) >= (data?.count || 1)
      || !!claimant && !!data?.claimedBy?.includes(claimant);
  return completed ? "completed" : "pending";
}

/** Only a successful updated projection supplies original-currency receipt amounts.
 * Missing claimant shares must not be replaced with the packet's total. */
export function paymentReceiveSuffix(data: ChatMessage["mediaData"], action: "claim" | "collect", claimant: string): string {
  const amount = action === "claim" ? data?.claimedAmounts?.[claimant] : data?.amount;
  if (amount == null || !Number.isFinite(amount)) return "";
  return `，金额:${formatPaymentAmount(amount, data?.currency)} ${normalizeCurrency(data?.currency)}`;
}
