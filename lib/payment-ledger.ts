import { kvReadFresh } from "./kv-db";
import { mutateWallet, WALLET_STATE_KEY, WALLET_BALANCE_ACCOUNT_ID } from "./wallet-storage";
import type { WalletState, WalletTransaction } from "./wallet-types";
import { allocatePacketFen, toFen } from "./payment-money";
import { convertToCnyFen, normalizeCurrency, paymentMinor, validateCurrencyPacket, type PaymentCurrency } from "./payment-currency";
import { validateFxQuote, type PaymentFxQuote, type PaymentSettlement } from "./payment-fx";

export const LEGACY_REFUND_ERROR = "该旧交易缺少可验证的原始扣款记录，无法安全自动退款，请人工核对。";
export type PaymentKind = "transfer" | "red_packet";
export type PaymentAction = "send" | "collect" | "claim" | "return";
export type PaymentStatus = "pending" | "received" | "opened" | "declined";
export type PaymentInput = {
  id: string; sessionId: string; kind: PaymentKind; fromUser: boolean; amount: number;
  count?: number; label?: string; senderName?: string; recipientId?: string; recipientName?: string;
  status?: PaymentStatus; protocol?: 1; createdAt?: string;
  walletTransactionId?: string; walletRefundTransactionId?: string; walletDepositTransactionId?: string;
  claimedAmounts?: Record<string, number>;
  currency?: PaymentCurrency;
};
export type PaymentOperation = {
  key: string; paymentId: string; action: PaymentAction; actorId: string; deltaFen: number;
  amountFen: number; committedAt: string; transactionId?: string;
  settlement?: PaymentSettlement;
};
export type PaymentRecord = {
  id: string; sessionId: string; kind: PaymentKind; fromUser: boolean; totalFen: number; count: number;
  label: string; senderName?: string; recipientId?: string; recipientName?: string; createdAt: string;
  status: PaymentStatus; legacyTerminal: boolean; published?: boolean;
  claims: Array<{ actorId: string | null; name: string; fen: number; originalMinor?: number }>;
  operations: Record<string, PaymentOperation>;
  legacyDebitId?: string; legacyDepositId?: string; legacyRefundId?: string;
  currency?: PaymentCurrency; originalMinor?: number; fxQuote?: PaymentFxQuote;
  // Foreign claims retain original units separately; fen remains CNY only.
};
export type PaymentLedger = { version: 1; records: Record<string, PaymentRecord>; drafts: Record<string, string> };
const recordKey = (id: string) => JSON.stringify([id]);
export const operationKey = (id: string, action: PaymentAction, actor: string) => JSON.stringify([id, action, actor]);
const draftKey = (sessionId: string, kind: PaymentKind) => JSON.stringify([sessionId, kind]);
function ledger(state: WalletState): PaymentLedger {
  if (!state.paymentLedger) state.paymentLedger = { version: 1, records: {}, drafts: {} };
  if (state.paymentLedger.version !== 1) throw new Error("支付凭据版本不受支持，操作已停止");
  return state.paymentLedger;
}
function ensure(state: WalletState, input: PaymentInput): PaymentRecord {
  const store = ledger(state), key = recordKey(input.id);
  const currency = normalizeCurrency(input.currency);
  const minor = currency === "CNY" ? toFen(input.amount) : paymentMinor(input.amount, currency);
  const existing = store.records[key];
  if (existing) {
    if (existing.sessionId !== input.sessionId || existing.kind !== input.kind || existing.fromUser !== input.fromUser
      || (existing.originalMinor ?? existing.totalFen) !== minor || normalizeCurrency(existing.currency) !== currency
      || existing.count !== (input.count || 1)) throw new Error("支付信息与已保存凭据不一致");
    return existing;
  }
  if (!input.id || !input.sessionId) throw new Error("缺少稳定支付标识");
  const totalFen = currency === "CNY" ? minor : 0, count = input.kind === "red_packet" ? input.count || 1 : 1;
  if (minor <= 0) throw new Error("金额无效");
  const terminal = input.status && input.status !== "pending";
  // Any new-protocol message without its ledger may be a partial restore.
  // Never infer a missing monetary commit from the display state.
  if (input.protocol === 1) throw new Error("支付凭据缺失，请恢复包含钱包的完整备份后重试");
  if (!terminal && input.kind === "red_packet") validateCurrencyPacket(minor, count, currency);
  const claims = Object.entries(input.claimedAmounts || {}).map(([name, amount]) => ({ actorId: null, name, fen: toFen(amount) }));
  const record: PaymentRecord = {
    id: input.id, sessionId: input.sessionId, kind: input.kind, fromUser: input.fromUser, totalFen, count,
    label: input.label || "", senderName: input.senderName, recipientId: input.recipientId, recipientName: input.recipientName,
    createdAt: input.createdAt || new Date().toISOString(), status: input.status || "pending", legacyTerminal: Boolean(terminal),
    claims, operations: {}, legacyDebitId: input.walletTransactionId, legacyDepositId: input.walletDepositTransactionId,
    legacyRefundId: input.walletRefundTransactionId,
    currency, originalMinor: minor,
  };
  store.records[key] = record;
  return record;
}

/** Persisted draft identity survives reload. It is retired only after message publication. */
export async function reservePaymentDraft(sessionId: string, kind: PaymentKind): Promise<string> {
  return mutateWallet((state, save) => {
    const store = ledger(state), key = draftKey(sessionId, kind);
    const id = store.drafts[key] || (store.drafts[key] = `payment_${crypto.randomUUID()}`);
    save(state); return id;
  });
}

/** Preparation never moves funds. A later ChatDB state cannot override this durable pending state. */
export async function preparePayment(input: PaymentInput): Promise<PaymentRecord> {
  return mutateWallet((state, save) => { const record = ensure(state, input); save(state); return record; });
}

export async function executePayment(input: PaymentInput, action: PaymentAction, actor: { id: string; name: string; isUser: boolean }, quote?: PaymentFxQuote): Promise<PaymentRecord> {
  return mutateWallet((state, save) => {
    const record = ensure(state, input), key = operationKey(record.id, action, actor.id);
    if (!actor.id || actor.isUser !== (actor.id === "self")) throw new Error("操作人身份无效");
    if (record.operations[key]) return record;
    if (record.legacyTerminal) { save(state); return record; } // no synthetic debit/credit tombstone
    if (record.status !== "pending") throw new Error("该交易已完成，不能重复执行其它资金操作");
    if (record.kind === "transfer" && action !== "send") {
      if (record.recipientId && record.recipientId !== actor.id) throw new Error("不是指定收款人");
      if (!record.recipientId && record.recipientName && record.recipientName !== actor.name) throw new Error("不是指定收款人");
    }
    const currency = normalizeCurrency(record.currency), originalMinor = record.originalMinor ?? record.totalFen;
    let deltaFen = 0, amountFen = record.totalFen, actionMinor = originalMinor;
    const send = Object.values(record.operations).find(op => op.action === "send");
    // Fetch happens before the transaction. The first packet allocation locks one
    // package quote, including character claims; later participants reuse it.
    const needsFx = currency !== "CNY" && action !== "return"
      && (action === "send" || actor.isUser || record.kind === "red_packet");
    if (needsFx && !record.fxQuote) {
      validateFxQuote(quote, currency);
      record.fxQuote = { ...quote };
      record.totalFen = convertToCnyFen(originalMinor, currency, quote.rateToCny);
    }
    if (record.fxQuote) {
      validateFxQuote(record.fxQuote, currency, false);
      amountFen = convertToCnyFen(originalMinor, currency, record.fxQuote.rateToCny);
    }
    if (action === "send") {
      if (!record.fromUser || !actor.isUser) throw new Error("无效的付款操作");
      deltaFen = -record.totalFen;
    } else if (action === "return") {
      if (record.claims.length || Object.values(record.operations).some(op => op.action === "collect" || op.action === "claim")) throw new Error("交易已被领取，不能退回");
      if (record.fromUser) {
        if (actor.isUser) throw new Error("不能自行退回已发出的款项");
        if (record.legacyRefundId) throw new Error("该交易已有退款凭据");
        if (send) deltaFen = -send.deltaFen;
        else {
          const debit = state.transactions.find(tx => tx.id === record.legacyDebitId);
          // Old history has no debit/refund link. An otherwise matching refund
          // receipt is ambiguous; unrelated refunds are not a reason to reject.
          if (!debit || debit.kind !== "payment" || debit.cardId !== WALLET_BALANCE_ACCOUNT_ID
            || toFen(debit.amount) !== -record.totalFen
            || state.transactions.some(tx => tx.category === "聊天退款" && tx.createdAt >= debit.createdAt
              && toFen(tx.amount) === record.totalFen
              && tx.detail === `${record.kind === "red_packet" ? "红包退回" : "转账退回"}：${record.label || "聊天款项"}`)
            || Object.values(ledger(state).records).some(r => r.id !== record.id && r.legacyDebitId === debit.id)) {
            throw new Error(LEGACY_REFUND_ERROR);
          }
          deltaFen = record.totalFen;
        }
        if (deltaFen < 0 || deltaFen > record.totalFen) throw new Error("退款金额无效");
      }
      record.status = "declined";
    } else {
      if (record.kind === "transfer" && record.recipientId && record.recipientId !== actor.id) throw new Error("不是指定收款人");
      if (record.kind === "transfer" && !record.recipientId && record.recipientName && record.recipientName !== actor.name) throw new Error("不是指定收款人");
      if (record.fromUser && actor.isUser) throw new Error("不能领取自己发出的款项");
      if (record.kind === "red_packet") {
        if (action !== "claim") throw new Error("红包操作无效");
        if (record.claims.some(c => c.actorId === actor.id || c.actorId === null && c.name === actor.name) || actor.isUser && record.legacyDepositId) { save(state); return record; }
        const previousMinor = record.claims.reduce((sum, c) => sum + (c.originalMinor ?? c.fen), 0);
        actionMinor = allocatePacketFen(originalMinor, record.claims.map(c => c.originalMinor ?? c.fen), record.count);
        // Cumulative rounding distributes fractional fen without losing or creating
        // a fen over the whole package. Every share keeps its original units.
        amountFen = record.fxQuote
          ? convertToCnyFen(previousMinor + actionMinor, currency, record.fxQuote.rateToCny)
            - convertToCnyFen(previousMinor, currency, record.fxQuote.rateToCny)
          : actionMinor;
        record.claims.push({ actorId: actor.id, name: actor.name, fen: amountFen, originalMinor: actionMinor });
        if (record.claims.length === record.count) record.status = "opened";
      } else {
        if (action !== "collect") throw new Error("转账操作无效");
        record.status = "received";
      }
      if (actor.isUser && !record.fromUser && !record.legacyDepositId) deltaFen = amountFen;
    }
    const balanceFen = toFen(state.balance), nextFen = balanceFen + deltaFen;
    if (!Number.isSafeInteger(nextFen) || nextFen < 0) throw new Error("余额不足或金额超出安全范围");
    if (toFen(nextFen / 100) !== nextFen || toFen(deltaFen / 100) !== deltaFen) throw new Error("金额超出可精确保存范围");
    const committedAt = new Date().toISOString();
    const operation: PaymentOperation = { key, paymentId: record.id, action, actorId: actor.id, deltaFen, amountFen, committedAt };
    if (currency !== "CNY" && record.fxQuote && (action === "send" || action === "return" && record.fromUser || actor.isUser)) {
      operation.settlement = { currency, originalMinor: actionMinor, rateToCny: record.fxQuote.rateToCny,
        settledCnyFen: Math.abs(deltaFen), settledAt: committedAt, rateDate: record.fxQuote.rateDate };
    }
    if (deltaFen !== 0) {
      const title = action === "send" ? (record.kind === "red_packet" ? "发红包" : "发转账")
        : action === "return" ? (record.kind === "red_packet" ? "红包退回" : "转账退回")
          : record.kind === "red_packet" ? "领取红包" : "收款";
      const transaction: WalletTransaction = {
        id: `payment:${key}`, cardId: WALLET_BALANCE_ACCOUNT_ID, accountType: "balance", title,
        amount: deltaFen / 100, kind: action === "send" ? "payment" : "transfer_in",
        category: action === "return" ? "聊天退款" : record.kind === "red_packet" ? "红包" : "转账",
        createdAt: committedAt, detail: `${title}：${record.label || "聊天款项"}`, balanceAfter: nextFen / 100,
      };
      operation.transactionId = transaction.id;
      state.balance = nextFen / 100;
      state.transactions = [transaction, ...state.transactions].slice(0, 300);
    }
    record.operations[key] = operation;
    save(state); return record;
  });
}

export async function readPaymentRecords(): Promise<PaymentRecord[]> {
  const raw = await kvReadFresh(WALLET_STATE_KEY);
  if (!raw) return [];
  const state = JSON.parse(raw) as WalletState;
  if (!state.paymentLedger) return [];
  if (state.paymentLedger.version !== 1) throw new Error("支付凭据版本不受支持");
  return Object.values(state.paymentLedger.records);
}

export async function markPaymentPublished(id: string): Promise<void> {
  await mutateWallet((state, save) => {
    const store = ledger(state), record = store.records[recordKey(id)];
    if (!record) throw new Error("支付凭据缺失");
    record.published = true;
    const key = draftKey(record.sessionId, record.kind);
    if (store.drafts[key] === id) delete store.drafts[key];
    save(state);
  });
}
