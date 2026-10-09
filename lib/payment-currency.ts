import { toMinorUnits, validatePacket } from "./payment-money";

export const PAYMENT_CURRENCIES = {
  CNY: { name: "人民币", symbol: "¥", decimals: 2 },
  USD: { name: "美元", symbol: "$", decimals: 2 },
  EUR: { name: "欧元", symbol: "€", decimals: 2 },
  JPY: { name: "日元", symbol: "¥", decimals: 0 },
  KRW: { name: "韩元", symbol: "₩", decimals: 0 },
  GBP: { name: "英镑", symbol: "£", decimals: 2 },
  HKD: { name: "港币", symbol: "HK$", decimals: 2 },
  SGD: { name: "新加坡元", symbol: "S$", decimals: 2 },
  AUD: { name: "澳大利亚元", symbol: "A$", decimals: 2 },
  CAD: { name: "加拿大元", symbol: "C$", decimals: 2 },
  CHF: { name: "瑞士法郎", symbol: "CHF ", decimals: 2 },
  NZD: { name: "新西兰元", symbol: "NZ$", decimals: 2 },
  THB: { name: "泰铢", symbol: "฿", decimals: 2 },
} as const;
export type PaymentCurrency = keyof typeof PAYMENT_CURRENCIES;
const aliases: Record<string, PaymentCurrency> = {
  RMB: "CNY", 人民币: "CNY", 美元: "USD", "$": "USD", 欧元: "EUR", "€": "EUR",
  日元: "JPY", 韩元: "KRW", "₩": "KRW",
};
/** Missing legacy code is CNY; ambiguous ¥ and unknown codes are rejected. */
export function normalizeCurrency(value?: string): PaymentCurrency {
  if (!value?.trim()) return "CNY";
  const key = value.trim().toUpperCase();
  if (Object.prototype.hasOwnProperty.call(PAYMENT_CURRENCIES, key)) return key as PaymentCurrency;
  if (aliases[key]) return aliases[key];
  throw new Error(`不支持或不明确的交易币种，请使用 ${Object.keys(PAYMENT_CURRENCIES).join("、")}`);
}
export function paymentMinor(amount: number, currency?: string): number {
  const code = normalizeCurrency(currency), factor = 10 ** PAYMENT_CURRENCIES[code].decimals;
  const minor = toMinorUnits(amount, PAYMENT_CURRENCIES[code].decimals);
  if (minor / factor !== amount) throw new Error(`${code} 金额最多允许 ${PAYMENT_CURRENCIES[code].decimals} 位小数`);
  return minor;
}
export const fromPaymentMinor = (minor: number, currency?: string) => minor / 10 ** PAYMENT_CURRENCIES[normalizeCurrency(currency)].decimals;
export function validateCurrencyPacket(minor: number, count: number, currency?: string): void {
  try { validatePacket(minor, count); }
  catch {
    const code = normalizeCurrency(currency);
    if (code === "CNY") throw new Error("红包总金额不足，每人至少需要0.01元");
    throw new Error(`红包总金额不足，每人至少需要 ${formatPaymentAmount(fromPaymentMinor(1, code), code)} ${code}`);
  }
}
export function formatPaymentAmount(amount: number, currency?: string): string {
  const { symbol, decimals } = PAYMENT_CURRENCIES[normalizeCurrency(currency)];
  return symbol + new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number.isFinite(amount) ? amount : 0);
}
/** Exact decimal rational conversion; round once to CNY fen, half up. */
export function convertToCnyFen(minor: number, currency: PaymentCurrency, rate: string): number {
  if (!Number.isSafeInteger(minor) || minor < 0 || !/^\d+(?:\.\d{1,12})?$/.test(rate)) throw new Error("汇率或金额无效");
  const [whole, fraction = ""] = rate.split(".");
  const numerator = BigInt(whole + fraction);
  if (numerator <= 0n) throw new Error("汇率无效");
  const denominator = 10n ** BigInt(fraction.length + PAYMENT_CURRENCIES[currency].decimals);
  const fen = (BigInt(minor) * numerator * 100n + denominator / 2n) / denominator;
  if (fen > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("结算金额超出安全范围");
  return Number(fen);
}
