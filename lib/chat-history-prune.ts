import { chatDb, withChatHistoryImportLock } from "./chat-db";
import { fingerprintPruneMessages, createPruneDiskChecker } from "./chat-prune-validation";
import { loadChatMessages, loadChatSessions, isChatStorageHydrated, getChatSessionRevision,
    assertChatHistoryPruneBoundary, withChatHistoryPruneLock, deleteChatMessagesByIds,
    type ChatMessage, type ChatSession } from "./chat-storage";
import { deleteChatMessagesFromCloudChecked } from "./chat-cloud-delete";
import { syncAllWeixinBotRuntimesToCloud } from "./weixin-cloud-sync";
import { isBackgroundReplyGenerating } from "./follow-up-service";

export type ChatHistoryPrunePreview = Readonly<{ sessionId: string; total: number; remove: number; retain: number; keep: number }>;
type Snapshot = { messages: ChatMessage[]; session: ChatSession; revision: number; fingerprint: string };
const previews = new WeakMap<ChatHistoryPrunePreview, Snapshot>();
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function assertIdle(sessionId: string, messages: ChatMessage[]) {
    if (isBackgroundReplyGenerating(sessionId) || messages.some(m => m.status === "sending" || m.isTyping || m.mediaData?.imageGenerationStatus === "pending")) {
        throw new Error("会话仍在生成或保存内容，请等待结束后重新预检");
    }
}
async function verify(snapshot: Snapshot) {
    const { session, messages, revision, fingerprint } = snapshot;
    const current = loadChatMessages(session.id);
    assertIdle(session.id, current);
    if (getChatSessionRevision(session.id) !== revision
        || (await fingerprintPruneMessages(current)) !== fingerprint
        || JSON.stringify(loadChatSessions().find(s => s.id === session.id)) !== JSON.stringify(session)) {
        throw new Error("预检已失效，请重新预检");
    }
    await chatDb.transaction("r", chatDb.messages, chatDb.sessions, async () => {
        const check = createPruneDiskChecker(messages);
        await chatDb.messages.where("sessionId").equals(session.id).each(record => check.inspect(record));
        check.complete();
        if (JSON.stringify(await chatDb.sessions.get(session.id)) !== JSON.stringify(session)) {
            throw new Error("会话元数据已变化，请重新预检");
        }
    });
    // Check again after async IDB reads; a concurrent local edit invalidates it.
    if (getChatSessionRevision(session.id) !== revision
        || (await fingerprintPruneMessages(loadChatMessages(session.id))) !== fingerprint) {
        throw new Error("预检期间消息发生变化，请重新预检");
    }
}
export async function previewChatHistoryPrune(sessionId: string, keep: number): Promise<ChatHistoryPrunePreview> {
    if (!Number.isSafeInteger(keep) || keep < 1) throw new Error("保留条数必须是正整数");
    if (!isChatStorageHydrated()) throw new Error("聊天数据尚未加载完成");
    const session = loadChatSessions().find(s => s.id === sessionId);
    if (!session) throw new Error("会话不存在");
    // Copy only the array of references; do not duplicate 9,000 media-rich objects.
    // The cryptographic fingerprint rejects in-place changes to those references.
    const messages = loadChatMessages(sessionId).slice();
    const revision = getChatSessionRevision(sessionId);
    const fingerprint = await fingerprintPruneMessages(messages);
    const snapshot = { messages, session: clone(session), revision, fingerprint };
    const remove = Math.max(0, messages.length - keep);
    assertChatHistoryPruneBoundary(messages, messages.slice(0, remove));
    await verify(snapshot);
    const preview = Object.freeze({ sessionId, keep, total: messages.length, remove, retain: messages.length - remove });
    previews.set(preview, snapshot);
    return preview;
}
/**
 * Detect a queued *uncoordinated* write that commits immediately after our
 * delete transaction. This is confirmation, NOT a write fence: an unrelated
 * connection can always write again after this read completes.
 *
 * Compare one row at a time to avoid a second full-session JSON string. The
 * survivor list is short after pruning, but can include inline media data.
 */
async function confirmPruneDiskMatchesCache(sessionId: string): Promise<void> {
    const inMemory = loadChatMessages(sessionId);
    const session = loadChatSessions().find(s => s.id === sessionId);
    await chatDb.transaction("r", chatDb.messages, chatDb.sessions, async () => {
        const checker = createPruneDiskChecker(inMemory);
        await chatDb.messages.where("sessionId").equals(sessionId).each(record => checker.inspect(record));
        checker.complete();
        if (JSON.stringify(await chatDb.sessions.get(sessionId)) !== JSON.stringify(session)) {
            throw new Error("持久化会话元数据与缓存不符");
        }
    }).catch(error => {
        throw new Error("删除事务已提交，但数据库与缓存核对未通过。请勿重复裁剪，请重新加载检查记录。原因：" + String(error));
    });
}

export async function executeChatHistoryPrune(preview: ChatHistoryPrunePreview): Promise<{ deleted: number; warning?: string }> {
    const snapshot = previews.get(preview);
    if (!snapshot) throw new Error("预检已使用或失效，请重新预检");
    previews.delete(preview); // one-shot, including failed attempts
    return withChatHistoryImportLock("prune", () => withChatHistoryPruneLock(preview.sessionId, async () => {
        await verify(snapshot);
        const deleted = snapshot.messages.slice(0, preview.remove);
        let cloudCount = 0;
        // Do not race a timeout: a still-running cloud request must retain the busy lock.
        for (let i = 0; i < deleted.length; i += 200) {
            try { cloudCount += await deleteChatMessagesFromCloudChecked(deleted.slice(i, i + 200)); }
            catch (error) { throw new Error("云端删除未完成，本地未执行；云端可能已部分删除。" + String(error)); }
        }
        await verify(snapshot);
        const count = await deleteChatMessagesByIds(preview.sessionId, deleted.map(m => m.id), { expected: snapshot.messages, session: snapshot.session });
        if (count !== preview.remove) throw new Error("删除数量不一致，请重新加载检查，未确认成功");
        // A second independent connection may have queued a stale put(old)
        // while our write transaction was active. A new readonly transaction
        // can observe that queued write before we report success. This cannot
        // guarantee protection from arbitrary future writes: retain NO-GO until
        // all actual Float writers share a coordination protocol.
        await confirmPruneDiskMatchesCache(preview.sessionId);
        if (cloudCount > 0) {
            try { await syncAllWeixinBotRuntimesToCloud(); }
            catch { return { deleted: count, warning: "本地已提交，但微信运行包同步失败，请到设置中重新同步。" }; }
        }
        return { deleted: count };
    }));
}
