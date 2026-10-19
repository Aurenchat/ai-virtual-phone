/**
 * Bounded-memory message integrity checks for native history pruning.
 * Never JSON.stringify() an entire media-rich conversation at once.
 */
type MessageRecord = { id: string };
const DIGEST_CHUNK_CHARS = 128 * 1024;

/**
 * SHA-256 fingerprint of every serialized message, in order. The framing
 * includes each JSON string's length so concatenations remain unambiguous.
 * Batches keep memory bounded and avoid thousands of WebCrypto round trips.
 * This is an integrity guard, not an authentication or a database write fence.
 */
export async function fingerprintPruneMessages<T extends MessageRecord>(messages: readonly T[]): Promise<string> {
    if (!globalThis.crypto?.subtle) throw new Error("当前环境不支持安全预检校验，已禁止裁剪");
    const digests: string[] = [];
    const encoder = new TextEncoder();
    let parts: string[] = [];
    let chars = 0;
    const flush = async () => {
        if (!parts.length) return;
        const bytes = encoder.encode(parts.join(""));
        parts = [];
        chars = 0;
        const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
        digests.push(Array.from(hash, byte => byte.toString(16).padStart(2, "0")).join(""));
    };
    for (const message of messages) {
        const json = JSON.stringify(message);
        if (typeof json !== "string") throw new Error("消息无法校验，禁止裁剪");
        const framed = `${json.length}:${json}`;
        if (chars && chars + framed.length > DIGEST_CHUNK_CHARS) await flush();
        parts.push(framed);
        chars += framed.length;
        if (chars >= DIGEST_CHUNK_CHARS) await flush();
    }
    await flush();
    const finalBytes = encoder.encode(`${messages.length}|${digests.join("|")}`);
    const finalHash = new Uint8Array(await crypto.subtle.digest("SHA-256", finalBytes));
    return Array.from(finalHash, byte => byte.toString(16).padStart(2, "0")).join("");
}

/** Strict storage-record comparison, never allocate one giant history JSON. */
export function equalPruneMessages<T extends MessageRecord>(before: readonly T[], after: readonly T[]): boolean {
    if (before.length !== after.length) return false;
    for (let i = 0; i < before.length; i++) {
        if (before[i].id !== after[i].id || JSON.stringify(before[i]) !== JSON.stringify(after[i])) return false;
    }
    return true;
}

/** Match a session cursor without relying on IndexedDB's secondary-index order. */
export function createPruneDiskChecker<T extends MessageRecord>(expected: readonly T[]) {
    const rows = new Map(expected.map(row => [row.id, row]));
    if (rows.size !== expected.length) throw new Error("发现重复消息 ID，禁止裁剪");
    let counted = 0;
    return {
        inspect(actual: T) {
            const original = rows.get(actual.id);
            if (!original || JSON.stringify(original) !== JSON.stringify(actual)) {
                throw new Error("消息尚未持久化或已被修改，禁止裁剪");
            }
            counted++;
        },
        complete() {
            if (counted !== rows.size) throw new Error("存储消息数量与预检不符，禁止裁剪");
        },
    };
}
