import "../payment-currency/fixture";
import React from "react";
import { createRoot } from "react-dom/client";
import { CashPaymentCard } from "../../components/chat/cash-payment-card";
import { MediaDetailModal } from "../../components/chat/message-bubble";
import { RedPacketModal } from "../../components/chat/rich-input-modals";
import * as display from "../../lib/payment-display";
import { createBuiltinPreset } from "../../lib/builtin-preset";
import { sendChatPayment } from "../../lib/payment-chat";
import type { ChatMessage } from "../../lib/chat-storage";

const container = document.createElement("div");
document.body.append(container);
const root = createRoot(container);
let renderKey = 0;
const probe = {
  display, createBuiltinPreset,
  outcomes: [] as Array<{ updated: ChatMessage; text: string; action: string }>,
  sends: [] as Array<Record<string, unknown>>,
  closeCount: 0,
  cards(messages: ChatMessage[]) {
    root.render(<div>{messages.map(msg => <CashPaymentCard key={msg.id} msg={msg} />)}</div>);
  },
  detail(msg: ChatMessage) {
    probe.outcomes = [];
    root.render(<MediaDetailModal key={++renderKey} msg={msg} userName="测试用户"
      onClose={() => { probe.closeCount++; root.render(null); }}
      onAccept={(updated, text, action) => { probe.outcomes.push({ updated, text, action }); root.render(null); }} />);
  },
  composer(cashStyle: boolean, mode: "transfer" | "red_packet", isGroup: boolean, failSend = false) {
    probe.sends = [];
    root.render(<RedPacketModal key={++renderKey} cashStyle={cashStyle} mode={mode} isGroup={isGroup}
      sessionId="payment-display-send" onClose={() => { probe.closeCount++; root.render(null); }}
      onSend={async (amount, label, count, id, currency, quote) => {
        probe.sends.push({ amount, label, count, id, currency, quote });
        if (failSend) throw new Error("injected send failure");
        await sendChatPayment({ id: id!, sessionId: "payment-display-send", kind: mode, fromUser: true,
          amount, label, count, currency }, "测试用户", quote);
        root.render(null);
      }} />);
  },
  close() { root.render(null); },
};
(window as any).paymentDisplayTest = probe;
