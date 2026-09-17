"use client";

import { useEffect, useState } from "react";
import { GiftPickerModal } from "./gift-picker-modal";
import { loadCharacters } from "@/lib/character-storage";
import { createOrGetSession } from "@/lib/chat-storage";
import { CHAT_OPEN_SESSION_EVENT } from "@/lib/chat-notification-events";
import { NATIVE_GIFT_OPEN, queueNativeGift, type NativeGiftOpenRequest } from "@/lib/native-gift-bridge";

/** Global shortcut: reuse the native picker to choose a recipient, then open the native chat sender. */
export function NativeGiftLauncher() {
    const [request, setRequest] = useState<NativeGiftOpenRequest | null>(null);
    const navigate = (sessionId: string, value: NativeGiftOpenRequest) => {
        queueNativeGift(sessionId, value);
        window.dispatchEvent(new CustomEvent("open-app", { detail: { appId: "chat", sessionId } }));
        window.dispatchEvent(new CustomEvent(CHAT_OPEN_SESSION_EVENT, { detail: { sessionId } }));
    };
    useEffect(() => {
        const open = (event: Event) => {
            const value = (event as CustomEvent<NativeGiftOpenRequest>).detail;
            if (!value?.itemId || !value.providerId) return;
            if (value.sessionId) navigate(value.sessionId, value);
            else setRequest(value);
        };
        window.addEventListener(NATIVE_GIFT_OPEN, open);
        return () => window.removeEventListener(NATIVE_GIFT_OPEN, open);
    }, []);
    if (!request) return null;
    return <GiftPickerModal initialItemId={request.itemId} isGroup recipients={loadCharacters()}
        sendLabel="前往聊天确认" onClose={() => setRequest(null)}
        onSend={(gift, recipient) => {
            if (!recipient || !gift.inventoryItemId) return;
            const session = createOrGetSession(recipient.id);
            navigate(session.id, { ...request, itemId: gift.inventoryItemId });
            setRequest(null);
        }} />;
}
