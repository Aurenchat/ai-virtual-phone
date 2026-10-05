import * as kv from "../../lib/kv-db";
import * as wallet from "../../lib/wallet-storage";
import * as ledger from "../../lib/payment-ledger";
import * as money from "../../lib/payment-money";
import * as paymentChat from "../../lib/payment-chat";
import * as chat from "../../lib/chat-storage";
import { chatDb } from "../../lib/chat-db";
import * as backup from "../../lib/data-management/idb";
(window as any).payments = { kv, wallet, ledger, money, paymentChat, chat, chatDb, backup };
import React from "react";
import { createRoot } from "react-dom/client";
import { MediaDetailModal } from "../../components/chat/message-bubble";
import { RedPacketModal } from "../../components/chat/rich-input-modals";
const root = createRoot(document.getElementById("root")!);
(window as any).paymentUi = {
  detail(msg: chat.ChatMessage) {
    (window as any).paymentUi.outcomes = [];
    root.render(React.createElement(MediaDetailModal, { msg, userName: "测试用户", onClose() {},
      onAccept(updated: chat.ChatMessage, text: string, action: string) { (window as any).paymentUi.outcomes.push({ updated, text, action }); root.render(null); } }));
  },
  send() {
    root.render(React.createElement(RedPacketModal, { mode: "red_packet", sessionId: "ui-send", isGroup: true, onClose() {},
      async onSend(amount: number, label: string, count?: number, id?: string) {
        await paymentChat.sendChatPayment({ id: id!, sessionId: "ui-send", kind: "red_packet", fromUser: true, amount, label, count }, "测试用户"); root.render(null);
      } }));
  },
};
import * as parser from "../../lib/rich-message-parser";
(window as any).payments.parser = parser;
