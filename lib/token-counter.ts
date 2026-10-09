// lib/token-counter.ts
// Lightweight token estimation — zero external dependencies.
// CJK characters ~ 1.5 char/token, Latin ~ 4 char/token, +4 overhead per message.

// Count UTF-16 code units directly. Avoid String.match() building an O(n)
// array of one-character strings for long CJK prompts. Keep the original
// estimate exactly: supplementary Unicode code points still count as two
// non-CJK UTF-16 units, as in the old regex implementation.
// Latin-only input is common. A non-global probe avoids the per-code-unit
// loop for those messages, without allocating a match array.
const HAS_CJK_CODE_UNIT = /[⺀-鿿豈-﫿︰-﹏　-〿぀-ゟ゠-ヿ가-힯]/;

function isCjkCodeUnit(code: number): boolean {
    return (code >= 0x2e80 && code <= 0x9fff)
        || (code >= 0xf900 && code <= 0xfaff)
        || (code >= 0xfe30 && code <= 0xfe4f)
        || (code >= 0x3000 && code <= 0x303f)
        || (code >= 0x3040 && code <= 0x309f)
        || (code >= 0x30a0 && code <= 0x30ff)
        || (code >= 0xac00 && code <= 0xd7af);
}

export function estimateTokens(text: string): number {
    if (!text) return 0;
    if (!HAS_CJK_CODE_UNIT.test(text)) return Math.ceil(text.length / 4);
    let cjkCount = 0;
    for (let i = 0; i < text.length; i++) {
        if (isCjkCodeUnit(text.charCodeAt(i))) cjkCount++;
    }
    return Math.ceil(cjkCount / 1.5 + (text.length - cjkCount) / 4);
}

export function estimateMessagesTokens(messages: { role: string; content: string }[]): number {
    let total = 0;
    for (const msg of messages) {
        total += estimateTokens(msg.content) + 4; // per-message overhead
    }
    return total + 2; // conversation overhead
}

export function remainingTokenBudget(
    maxContext: number,
    currentTokens: number,
    reserveForGeneration: number = 500
): number {
    return Math.max(0, maxContext - currentTokens - reserveForGeneration);
}
