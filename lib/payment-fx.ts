import { normalizeCurrency, type PaymentCurrency } from "./payment-currency";

export type PaymentFxQuote = { currency: PaymentCurrency; rateToCny: string; rateDate: string; fetchedAt: number; provider: "Frankfurter" };
export type PaymentSettlement = { currency: PaymentCurrency; originalMinor: number; rateToCny: string; settledCnyFen: number; settledAt: string; rateDate: string };
export const FX_CACHE_MS = 5 * 60_000;
export const FX_TIMEOUT_MS = 8_000;
export function validateFxQuote(quote: PaymentFxQuote | undefined, currency: PaymentCurrency, fresh = true): asserts quote is PaymentFxQuote {
  if (!quote || quote.currency !== currency || quote.provider !== "Frankfurter"
    || !/^\d+(?:\.\d{1,12})?$/.test(quote.rateToCny) || Number(quote.rateToCny) <= 0
    || !Number.isFinite(quote.fetchedAt) || !Number.isFinite(Date.parse(quote.rateDate))
    || (fresh && (Date.now() - quote.fetchedAt > FX_CACHE_MS || quote.fetchedAt > Date.now() + 60_000))) {
    throw new Error("暂时无法获取汇率，请稍后再试。");
  }
}
/** Only currency pair leaves the browser. No amount, identity, or payment is sent. */
export function createPaymentFxService(fetcher: typeof fetch = (...args) => fetch(...args), timeout = FX_TIMEOUT_MS) {
  const cache = new Map<PaymentCurrency, PaymentFxQuote>();
  const pending = new Map<PaymentCurrency, Promise<PaymentFxQuote>>();
  return async function quoteFor(value?: string): Promise<PaymentFxQuote | undefined> {
    const currency = normalizeCurrency(value);
    if (currency === "CNY") return undefined;
    const saved = cache.get(currency);
    if (saved && Date.now() - saved.fetchedAt < FX_CACHE_MS) return saved;
    if (pending.has(currency)) return pending.get(currency)!;
    const work = (async () => {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const response = await Promise.race([
          (async () => {
            const result = await fetcher(`https://api.frankfurter.dev/v2/rate/${currency}/CNY`, { signal: controller.signal, cache: "no-store", credentials: "omit" });
            if (!result.ok) throw new Error("provider error");
            return result.json();
          })(),
          new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, timeout); }),
        ]);
        const rate = response?.rate;
        const age = Date.now() - Date.parse(response?.date);
        if (response?.base !== currency || response?.quote !== "CNY" || typeof rate !== "number"
          || !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(age) || age < -86_400_000 || age > 10 * 86_400_000) throw new Error("malformed/stale rate");
        const quote: PaymentFxQuote = { currency, rateToCny: String(rate), rateDate: response.date, fetchedAt: Date.now(), provider: "Frankfurter" };
        validateFxQuote(quote, currency);
        cache.set(currency, quote);
        return quote;
      } catch { throw new Error("暂时无法获取汇率，请稍后再试。"); }
      finally { clearTimeout(timer); pending.delete(currency); }
    })();
    pending.set(currency, work);
    return work;
  };
}
export const getPaymentFxQuote = createPaymentFxService();
