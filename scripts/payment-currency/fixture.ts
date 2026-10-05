import "../payment-integrity/fixture";
import "../imessage-theme/fixture";
import * as currency from "../../lib/payment-currency";
import * as fx from "../../lib/payment-fx";
import * as directive from "../../lib/payment-directive";
import React from "react";
import { createRoot } from "react-dom/client";
import { RedPacketModal } from "../../components/chat/rich-input-modals";
import { sendChatPayment } from "../../lib/payment-chat";
(window as any).paymentCurrency = { currency, fx, directive };
const sendContainer = document.createElement("div");
document.body.append(sendContainer);
const sendRoot = createRoot(sendContainer);
(window as any).paymentCurrency.send = (mode: "transfer" | "red_packet", isGroup: boolean) => {
  sendRoot.render(React.createElement(RedPacketModal, {
    key: `${mode}-${isGroup}`, mode, isGroup, sessionId: "currency-send-ui",
    onClose() { sendRoot.render(null); },
    async onSend(amount, label, count, id, currency, quote) {
      await sendChatPayment({ id: id!, sessionId: "currency-send-ui", kind: mode, fromUser: true,
        amount, label, count, currency, recipientId: isGroup && mode === "transfer" ? "alice" : undefined }, "测试用户", quote);
      sendRoot.render(null);
    },
  }));
};
