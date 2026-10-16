/**
 * Ephemeral *lease factories*, never bare object-URL hints.
 *
 * ChatRoom must acquire a live ownership lease in a layout effect before
 * publishing a warm URL to CSS. The resource owner can retire/invalidate
 * entries at any time; an unleased string may be revoked before effect setup.
 * This module does not retain any Blob or own object-URL revocation.
 */
export type HotChatBackgroundLease = { url: string; release: () => void };
type Entry = { url: string; acquire: () => HotChatBackgroundLease | null };
const hot = new Map<string, Entry>();

export function acquireHotChatBackground(source: string): HotChatBackgroundLease | null {
    return hot.get(source)?.acquire() ?? null;
}

export function publishHotChatBackground(
    source: string,
    url: string,
    acquire: () => HotChatBackgroundLease | null,
): void {
    hot.set(source, { url, acquire });
}

export function forgetHotChatBackground(source: string, url?: string): void {
    if (url === undefined || hot.get(source)?.url === url) hot.delete(source);
}
