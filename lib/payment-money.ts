/** Decimal boundary, half away from zero. Calculations use integer minor units. */
export function toMinorUnits(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) throw new Error("金额无效");
  const negative = value < 0;
  const [mantissa, exponent = "0"] = Math.abs(value).toString().toLowerCase().split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  const digits = BigInt(whole + fraction);
  const shift = decimals + Number(exponent) - fraction.length;
  let fen: bigint;
  if (shift >= 0) fen = digits * 10n ** BigInt(shift);
  else {
    const divisor = 10n ** BigInt(-shift);
    fen = (digits + divisor / 2n) / divisor; // half away from zero
  }
  if (fen > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("金额超出安全范围");
  return Number(fen) * (negative ? -1 : 1);
}

export const toFen = (value: number): number => toMinorUnits(value, 2);

export function validatePacket(totalFen: number, count: number): void {
  if (!Number.isSafeInteger(totalFen) || !Number.isSafeInteger(count) || count < 1 || totalFen < count) {
    throw new Error("红包总金额不足，每人至少需要0.01元");
  }
}

export function allocatePacketFen(totalFen: number, claimed: number[], count: number, random = Math.random): number {
  validatePacket(totalFen, count);
  if (claimed.length >= count || claimed.some(n => !Number.isSafeInteger(n) || n < 1)) throw new Error("红包领取记录无效");
  const remaining = totalFen - claimed.reduce((a, b) => a + b, 0);
  const left = count - claimed.length;
  if (remaining < left) throw new Error("红包剩余金额无效");
  if (left === 1) return remaining;
  const max = Math.min(remaining - (left - 1), Math.floor(remaining / left * 2));
  const draw = random();
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1) throw new Error("随机数无效");
  return 1 + Math.floor(draw * max);
}
