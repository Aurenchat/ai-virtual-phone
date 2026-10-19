import type { ChatMessage } from "./chat-storage";
import { deleteWeixinCloudMessagesFromCloud } from "./weixin-cloud-sync";

export function getWeixinCloudDeleteTargetCount(messages: ChatMessage[]): number {
    return new Set(messages.filter(m => m.cloudSync?.source === "weixin-cloud" && m.cloudSync.botId && m.cloudSync.externalId)
        .map(m => m.cloudSync!.botId + "\0" + m.cloudSync!.externalId)).size;
}

/** Shared native cloud-first check. A partial cloud failure must never trigger local deletion. */
export async function deleteChatMessagesFromCloudChecked(messages: ChatMessage[]): Promise<number> {
    const count = await deleteWeixinCloudMessagesFromCloud(messages);
    if (count < getWeixinCloudDeleteTargetCount(messages)) throw new Error("云端记录没有完全删除，请检查同步设置后重试。");
    return count;
}
