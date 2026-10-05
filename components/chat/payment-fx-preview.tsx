"use client";
import { useEffect, useState } from "react";
import { convertToCnyFen, formatPaymentAmount, normalizeCurrency, paymentMinor } from "@/lib/payment-currency";
import { getPaymentFxQuote, type PaymentFxQuote, type PaymentSettlement } from "@/lib/payment-fx";

export function usePaymentFx(currency?: string, frozen?: PaymentFxQuote, enabled = true) {
  const code = normalizeCurrency(currency);
  const [attempt, retry] = useState(0);
  const [state, setState] = useState<{ code: string; quote?: PaymentFxQuote; error?: string }>({ code });
  useEffect(() => {
    if (!enabled || code === "CNY" || frozen) return;
    let active = true;
    setState({ code });
    void getPaymentFxQuote(code).then(quote => { if (active) setState({ code, quote }); },
      error => { if (active) setState({ code, error: error.message }); });
    return () => { active = false; };
  }, [code, frozen, enabled, attempt]);
  const quote = frozen || (state.code === code ? state.quote : undefined);
  return { quote, ready: code === "CNY" || !!quote, error: state.code === code ? state.error : undefined, retry: () => retry(n => n + 1) };
}

export function PaymentFxLine({ amount, currency, quote, settlement, error, onRetry, terminal = false, packageRate = false }: {
  amount: number; currency?: string; quote?: PaymentFxQuote; settlement?: PaymentSettlement;
  error?: string; onRetry?: () => void; terminal?: boolean; packageRate?: boolean;
}) {
  const code = normalizeCurrency(currency);
  if (code === "CNY") return null;
  let preview: string | undefined;
  try { if (quote) preview = formatPaymentAmount(convertToCnyFen(paymentMinor(amount, code), code, quote.rateToCny) / 100); } catch { /* Invalid input stays unavailable. */ }
  return <div className="cash-fx-line" aria-live="polite">
    {settlement ? `结算为人民币 ${formatPaymentAmount(settlement.settledCnyFen / 100)}`
      : preview ? `${packageRate ? "整包锁定汇率约合人民币" : "按当前汇率约合人民币"} ${preview}`
        : terminal ? "未发生人民币结算" : error || "正在查询最新汇率…"}
    {error && !settlement && !terminal && <button type="button" onClick={onRetry}>重试</button>}
  </div>;
}
