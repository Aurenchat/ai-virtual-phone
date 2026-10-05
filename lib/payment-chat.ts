import { chatDb } from "./chat-db";
import { persistPaymentMediaData, pushChatMessage, type ChatMessage } from "./chat-storage";
import { executePayment, preparePayment, readPaymentRecords, markPaymentPublished, type PaymentRecord, type PaymentInput, type PaymentAction } from "./payment-ledger";
import { fromPaymentMinor, normalizeCurrency } from "./payment-currency";
import { getPaymentFxQuote, type PaymentFxQuote } from "./payment-fx";

export function paymentInput(msg: ChatMessage): PaymentInput {
  if (msg.mediaType !== "transfer" && msg.mediaType !== "red_packet") throw new Error("不是支付消息");
  const data = msg.mediaData || {};
  return {
    id: data.paymentId || msg.id, sessionId: msg.sessionId, kind: msg.mediaType, fromUser: msg.role === "user",
    amount: data.amount || 0, currency: normalizeCurrency(data.currency), count: data.count || 1, label: data.label, senderName: data.senderName || msg.senderName,
    recipientId: data.recipientId, recipientName: data.recipientName, createdAt: msg.createdAt,
    status: data.status as PaymentInput["status"], protocol: data.paymentProtocol,
    claimedAmounts: data.claimedAmounts, walletTransactionId: data.walletTransactionId,
    walletDepositTransactionId: data.walletDepositTransactionId, walletRefundTransactionId: data.walletRefundTransactionId,
  };
}

export function paymentProjection(record: PaymentRecord): ChatMessage["mediaData"] {
  const operations = Object.values(record.operations);
  return {
    paymentId: record.id, paymentProtocol: 1, paymentRevision: operations.length,
    amount: fromPaymentMinor(record.originalMinor ?? record.totalFen, record.currency), currency: normalizeCurrency(record.currency), count: record.count,
    paymentFxQuote: record.fxQuote, paymentSettlement: operations.filter(op => op.settlement).at(-1)?.settlement,
    label: record.label, senderName: record.senderName, recipientId: record.recipientId, recipientName: record.recipientName,
    status: record.status,
    claimedBy: record.claims.map(c => c.name), claimedAmounts: Object.fromEntries(record.claims.map(c => [c.name, fromPaymentMinor(c.originalMinor ?? c.fen, record.currency)])),
    walletTransactionId: operations.find(op => op.action === "send")?.transactionId || record.legacyDebitId,
    walletRefundTransactionId: operations.find(op => op.action === "return")?.transactionId || record.legacyRefundId,
    walletDepositTransactionId: operations.find(op => (op.action === "claim" || op.action === "collect") && op.deltaFen > 0)?.transactionId || record.legacyDepositId,
  };
}

async function project(msg: ChatMessage, record: PaymentRecord): Promise<ChatMessage> {
  const data = { ...msg.mediaData, ...paymentProjection(record) };
  const saved = await persistPaymentMediaData(msg.id, data);
  return { ...msg, mediaData: saved };
}

export async function settleChatPayment(msg: ChatMessage, action: PaymentAction, actor: { id: string; name: string; isUser: boolean }, previewQuote?: PaymentFxQuote): Promise<ChatMessage> {
  const input = paymentInput(msg);
  const record = await preparePayment(input);
  const needsFx = action !== "return" && record.status === "pending" && !record.legacyTerminal
    && !record.fxQuote && (actor.isUser || record.kind === "red_packet");
  const quote = needsFx ? previewQuote || await getPaymentFxQuote(input.currency) : undefined;
  const committed = await executePayment(input, action, actor, quote);
  // Failure here is recoverable: the next call returns the same wallet operation.
  return project(msg, committed);
}

export async function reconcilePaymentMessage(msg: ChatMessage): Promise<ChatMessage> {
  const record = (await readPaymentRecords()).find(r => r.id === (msg.mediaData?.paymentId || msg.id));
  return record ? project(msg, record) : msg;
}

async function publish(record: PaymentRecord): Promise<ChatMessage> {
  const existing = await chatDb.messages.get(record.id);
  const msg = existing || pushChatMessage({ id: record.id, sessionId: record.sessionId, role: "user", content: "",
    createdAt: record.createdAt, mediaType: record.kind, mediaData: paymentProjection(record) }, { deferPaymentWrite: true });
  await chatDb.transaction("rw", chatDb.messages, async () => {
    if (!await chatDb.messages.get(record.id)) await chatDb.messages.put(msg);
  });
  const projected = await project(msg, record);
  await markPaymentPublished(record.id);
  return projected;
}

export async function sendChatPayment(input: PaymentInput, userName: string, previewQuote?: PaymentFxQuote): Promise<ChatMessage> {
  const existing = (await readPaymentRecords()).find(r => r.id === input.id);
  const quote = existing?.fxQuote || previewQuote || await getPaymentFxQuote(input.currency);
  const committed = await executePayment(input, "send", { id: "self", name: userName, isUser: true }, quote);
  return publish(committed);
}

/** Chat entry recovery, only unpublished outgoing payments in this session. No history rewrite. */
export async function recoverPaymentPublications(sessionId: string): Promise<ChatMessage[]> {
  const records = (await readPaymentRecords()).filter(r => r.sessionId === sessionId && r.fromUser && !r.published
    && Object.values(r.operations).some(op => op.action === "send"));
  const messages: ChatMessage[] = [];
  for (const record of records) messages.push(await publish(record));
  return messages;
}
