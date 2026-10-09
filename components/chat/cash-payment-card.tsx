"use client";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/chat-storage";
import { formatPaymentAmount } from "@/lib/payment-currency";
import { paymentDisplayState, paymentStatusGlyph } from "@/lib/payment-display";

export function CashBrand() {
  return <span className="cash-brand"><span className="cash-brand-apple" aria-hidden="true"></span>Cash</span>;
}

/** Payment-only drawing using the accepted 24px body and directional tail.
 * Group eligibility stays owned by Message Bridge's data-im-last. */
export function cashOutline(w: number, h: number, incoming: boolean, tail: boolean) {
  const r = Math.min(24, h / 2, w / 2), a = r < 24 ? r * .447715 : 8.4;
  let d = `M${r} 0H${w-r}C${w-a} 0 ${w} ${a} ${w} ${r}V${h-r}C${w} ${h-a} ${w-a} ${h} ${w-r} ${h}H${r}C${a} ${h} 0 ${h-a} 0 ${h-r}V${r}C0 ${a} ${a} 0 ${r} 0Z`;
  if (tail && incoming) {
    d = `M${r} 0H${w-r}C${w-a} 0 ${w} ${a} ${w} ${r}V${h-r}C${w} ${h-a} ${w-a} ${h} ${w-r} ${h}H${r}Q${r-1.2} ${h} ${r-2.4} ${h+.7}L13.2 ${h+6}C10.5 ${h+7.6} 7.5 ${h+8.3} 9 ${h+5.5}C11.7 ${h+1.7} 12 ${h-1.8} 8 ${h-5}C2.2 ${h-9.2} 0 ${h-12.5} 0 ${h-r}V${r}C0 ${a} ${a} 0 ${r} 0Z`;
  } else if (tail) {
    d += `M${w-3} ${h-13}C${w-3.8} ${h-8.8} ${w-5.8} ${h-7} ${w-8.5} ${h-4.8}C${w-12.4} ${h-1.8} ${w-12} ${h+1.5} ${w-9.3} ${h+5.5}C${w-7.7} ${h+8.6} ${w-11.1} ${h+7.1} ${w-13.5} ${h+5.8}L${w-r+2.5} ${h+.6}Q${w-r+1.4} ${h} ${w-r} ${h}L${w-r} ${h-13}Z`;
  }
  return d;
}
export function CashPaymentCard({ msg, onShowDetail }: { msg: ChatMessage; onShowDetail?: (msg: ChatMessage) => void }) {
  const data = msg.mediaData, packet = msg.mediaType === "red_packet", returned = data?.status === "declined";
  const count = data?.count || 1, claimed = data?.claimedBy?.length || 0;
  const state = paymentDisplayState(packet ? "red_packet" : "transfer", data), done = state === "completed";
  const status = returned ? "已退回" : packet && count > 1 ? `${claimed}/${count} 已领取` : done ? packet ? "已领取" : "已收款" : packet ? "待领取" : "待收款";
  const ref = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState({ w: 270, h: 176 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(entries => {
      const { width: w, height: h } = entries[0].contentRect;
      if (w && h) setSize(old => old.w === w && old.h === h ? old : { w, h });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <button ref={ref} type="button" className="cash-payment-card" data-returned={returned || undefined}
    aria-label={`${packet ? "红包" : "转账"}，${status}`} onClick={() => onShowDetail?.(msg)}>
    <svg className="cash-payment-surface" viewBox={`0 0 ${size.w} ${size.h+8}`} style={{ height: size.h+8 }} aria-hidden="true">
      <path className="cash-outline-body" d={cashOutline(size.w, size.h, msg.role !== "user", false)} />
      <path className="cash-outline-tail" d={cashOutline(size.w, size.h, msg.role !== "user", true)} />
    </svg>
    <span className="cash-payment-content">
      <CashBrand />
      <span className={packet ? "cash-packet-note cash-primary" : "cash-card-amount cash-primary"}>
        {packet ? data?.label || "恭喜发财，大吉大利" : formatPaymentAmount(data?.amount || 0, data?.currency)}
      </span>
      <span className="cash-card-note">{packet ? "红包" : data?.label || (msg.role === "user" ? "你发起了一笔转账" : "对方发起了一笔转账")}</span>
      <span className="cash-card-status"><span aria-hidden="true">{paymentStatusGlyph(state)}</span> {status}</span>
    </span>
  </button>;
}
