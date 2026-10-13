/** Short-lived scheduling only. No persistent viewed/reacted state. */
import { CHAT_MESSAGE_PUSHED_EVENT, CHAT_REQUEST_REPLY_EVENT, loadChatMessages, type ChatMessage } from "./chat-storage";
import { newestXhsShareMessage } from "./xiaohongshu-chat-share";
import { isBackgroundReplyGenerating, requestBackgroundChatReply } from "./follow-up-service";
import { kvGet } from "./kv-db";

const requests = new Map<string, { message: ChatMessage; timer?: ReturnType<typeof setTimeout>; ready: boolean }>();
const dispatched = new Map<string, number>();
let listening = false;
function releaseListener() {
    if (!requests.size && listening) { window.removeEventListener(CHAT_MESSAGE_PUSHED_EVENT, onMessage); listening = false; }
}
function arm(sessionId: string) {
    const request = requests.get(sessionId);
    if (!request?.ready) return;
    if (request.timer) clearTimeout(request.timer);
    request.timer = setTimeout(() => {
        if (requests.get(sessionId) !== request) return;
        requests.delete(sessionId); releaseListener();
        const share = newestXhsShareMessage(loadChatMessages(sessionId), sessionId);
        if (share?.id !== request.message.id || share.mediaData?.xiaohongshuNoteId !== request.message.mediaData?.xiaohongshuNoteId) return;
        const detail = { source: "native_xhs_share", sessionId, shareMessageId: share.id, handled: false, busy: false };
        window.dispatchEvent(new CustomEvent(CHAT_REQUEST_REPLY_EVENT, { detail }));
        if (detail.handled) return;
        // Claim before the shell's deferred fallback: it must not launch a second reply.
        detail.handled = true;
        let foregroundBusy = false;
        try { const lock = JSON.parse(kvGet("chat-generating:" + sessionId) || "null");
            foregroundBusy = !!lock?.startedAt && Date.now() - lock.startedAt < 5 * 60 * 1000; } catch { /* no live lock */ }
        if (!foregroundBusy && !isBackgroundReplyGenerating(sessionId)) void requestBackgroundChatReply(sessionId);
    }, 350);
}
function onMessage(event: Event) {
    const message = (event as CustomEvent<{ message?: ChatMessage }>).detail?.message;
    if (message?.role === "user" && requests.has(message.sessionId)) arm(message.sessionId);
}
export function scheduleXhsShareReply(message: ChatMessage, committed: Promise<boolean>): void {
    if (typeof window === "undefined" || !message.mediaData?.xiaohongshuNoteId) return;
    const now = Date.now();
    for (const [id, time] of dispatched) if (now - time > 30_000) dispatched.delete(id);
    if (dispatched.has(message.id)) return;
    dispatched.set(message.id, now);
    if (dispatched.size > 128) dispatched.delete(dispatched.keys().next().value!);
    const old = requests.get(message.sessionId); if (old?.timer) clearTimeout(old.timer);
    const request = { message, ready: false }; requests.set(message.sessionId, request);
    if (!listening) { window.addEventListener(CHAT_MESSAGE_PUSHED_EVENT, onMessage); listening = true; }
    void committed.then(ok => {
        if (requests.get(message.sessionId) !== request) return;
        if (!ok) { requests.delete(message.sessionId); releaseListener(); return; }
        request.ready = true; arm(message.sessionId);
    }).catch(() => { if (requests.get(message.sessionId) === request) requests.delete(message.sessionId); releaseListener(); });
}
