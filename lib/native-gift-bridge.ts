"use client";

import type { ShoppingGiftCandidate } from "./shopping-gift-utils";
import { loadDeliveredShoppingGifts } from "./shopping-gift-utils";
import { loadChatPlugins } from "./chat-plugin-storage";

export type NativeGiftCandidate = ShoppingGiftCandidate & {
    providerId?: string;
    shoppingGiftId?: string;
    inventoryItemId?: string;
    transferToken?: string;
    giftSource?: "shopping" | "backpack";
};

export type NativeGiftProvider = {
    label: string;
    list(): Promise<{ gifts: NativeGiftCandidate[]; managedShoppingIds: string[] }>;
    /** The provider validates/reserves an item, invokes the native sender, then commits ownership. */
    send(itemId: string, recipientId: string, send: (gift: NativeGiftCandidate) => boolean): Promise<boolean>;
};
export type NativeGiftOpenRequest = { providerId: string; itemId: string; sessionId?: string };
type Registry = { providers: Map<string, NativeGiftProvider>; pending: Map<string, NativeGiftOpenRequest> };
const KEY = "__floatNativeGiftProvidersV1";
function registry(): Registry {
    const root = globalThis as unknown as Record<string, Registry>;
    return root[KEY] ?? (root[KEY] = { providers: new Map(), pending: new Map() });
}
export const NATIVE_GIFTS_CHANGED = "float-native-gifts-changed";
export const NATIVE_GIFT_OPEN = "float-native-gift-open";
export const NATIVE_GIFT_QUEUED = "float-native-gift-queued";
export function notifyNativeGiftsChanged(): void {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(NATIVE_GIFTS_CHANGED));
}
export function registerNativeGiftProvider(id: string, provider: NativeGiftProvider): () => void {
    if (registry().providers.has(id)) throw new Error("Gift provider already registered: " + id);
    registry().providers.set(id, provider);
    notifyNativeGiftsChanged();
    return () => { registry().providers.delete(id); notifyNativeGiftsChanged(); };
}
export async function loadNativeGifts(): Promise<NativeGiftCandidate[]> {
    if (loadChatPlugins().some(p => p.manifest.id === "auren.float-possessions")
        && !registry().providers.has("auren.float-possessions")) {
        throw new Error("物品持有插件尚未就绪，请启用插件后重新打开赠礼窗口");
    }
    const managed = new Set<string>();
    const extras: NativeGiftCandidate[] = [];
    // Do not fall back to stale shop items when an active ownership provider fails.
    for (const [id, provider] of registry().providers) {
        const result = await provider.list();
        result.managedShoppingIds.forEach(value => managed.add(value));
        extras.push(...result.gifts.map(g => ({ ...g, providerId: id })));
    }
    return [
        ...loadDeliveredShoppingGifts().filter(g => !managed.has(g.id)).map(g => ({ ...g, giftSource: "shopping" as const })),
        ...extras,
    ];
}
export async function sendNativeGift(gift: NativeGiftCandidate, recipientId: string, send: (gift: NativeGiftCandidate) => boolean): Promise<boolean> {
    if (!gift.providerId) {
        // Revalidate through the authority, including candidates selected before plugin startup.
        const current = (await loadNativeGifts()).find(g => !g.providerId && g.id === gift.id);
        if (!current) throw new Error("该商品已送出或尚未到货");
        return send(current);
    }
    const provider = registry().providers.get(gift.providerId);
    if (!provider || !gift.inventoryItemId) throw new Error("背包插件未启用，请重新打开赠礼窗口");
    return provider.send(gift.inventoryItemId, recipientId, resolved => send({ ...resolved, providerId: gift.providerId }));
}
export function openNativeGift(request: NativeGiftOpenRequest): void {
    window.dispatchEvent(new CustomEvent(NATIVE_GIFT_OPEN, { detail: request }));
}
export function queueNativeGift(sessionId: string, request: NativeGiftOpenRequest): void {
    registry().pending.set(sessionId, request);
    window.dispatchEvent(new CustomEvent(NATIVE_GIFT_QUEUED, { detail: { sessionId } }));
}
export function takeNativeGift(sessionId: string): NativeGiftOpenRequest | undefined {
    const request = registry().pending.get(sessionId);
    registry().pending.delete(sessionId);
    return request;
}
