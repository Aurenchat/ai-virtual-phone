// Presentation only. This is used only for iMessage voice-message transcripts,
// never for stored messages, prompts, speech synthesis, or normal chat bubbles.
// Retain the exported lists for callers/tests that enumerate MiniMax 2.8 tags.
export const VOICE_SOUND_TAGS = [
    "laughs", "chuckle", "coughs", "clear-throat", "groans", "breath", "pant",
    "inhale", "exhale", "gasps", "sniffs", "sighs", "snorts", "burps",
    "lip-smacking", "humming", "hissing", "emm", "sneezes",
] as const;
export const VOICE_ACTION_TAGS_ZH = ["轻笑", "笑", "叹气", "咳嗽", "吸气", "呼气", "喘息"] as const;

type Range = { start: number; end: number };

function isEscaped(text: string, at: number): boolean {
    let slashes = 0;
    for (let index = at - 1; index >= 0 && text[index] === "\\"; index--) slashes++;
    return slashes % 2 === 1;
}

// A voice transcript can still contain Markdown links, images or literal code.
// Protect those *complete* spans before applying the deliberately broad bracket
// rule. Do not rewrite or parse Markdown; its actual renderer still owns that.
function protectedMarkdownRanges(text: string): Range[] {
    const spans: Range[] = [];
    const protect = (pattern: RegExp) => {
        for (const match of text.matchAll(pattern)) {
            if (!isEscaped(text, match.index)) spans.push({ start: match.index, end: match.index + match[0].length });
        }
    };

    // Includes ordinary links, image links, one-level parenthesized URLs and
    // reference-style links/images. Protect URLs as well as their visible labels.
    protect(/!?\[[^\]\r\n]+\]\((?:\\.|[^()\\\r\n]|\([^()\r\n]*\))*\)/g);
    protect(/!?\[[^\]\r\n]+\]\[[^\]\r\n]*\]/g);
    protect(/^[ \t]{0,3}\[[^\]\r\n]+\]:[^\r\n]*$/gm);
    protect(/^[ \t]*(?:[-+*]|\d+\.)[ \t]+\[[ xX]\]/gm);

    // Markdown inline code, including multi-backtick delimiters.
    protect(/(`+)[\s\S]*?\1/g);

    // Fenced code, including unclosed fences. A transcript might contain
    // code without a closing fence, which is still literal until text ends.
    const lines = text.matchAll(/[^\r\n]*(?:\r?\n|$)/g);
    let fence: { start: number; marker: string; size: number } | null = null;
    for (const line of lines) {
        if (!line[0]) break;
        const open = line[0].match(/^ {0,3}(`{3,}|~{3,})/);
        if (!fence) {
            if (open) fence = { start: line.index, marker: open[1][0], size: open[1].length };
        } else {
            const close = line[0].match(/^ {0,3}(`+|~+)[ \t]*\r?\n?$/);
            if (close && close[1][0] === fence.marker && close[1].length >= fence.size) {
                spans.push({ start: fence.start, end: line.index + line[0].length });
                fence = null;
            }
        }
    }
    if (fence) spans.push({ start: fence.start, end: text.length });
    return spans;
}

// Eleven v3/v4 audio cues use [natural-language instructions]; MiniMax sound
// cues and translated cues use (...) / （...）. The numeric MiniMax pause syntax
// is <#x#>, NOT <x>. Legacy ElevenLabs pauses use an SSML <break time="..." />.
const DISPLAY_CONTROL_PATTERN = /\([^()\r\n]*\)|（[^（）\r\n]*）|\[[^\[\]\r\n]*\]|［[^［］\r\n]*］|<#\d{1,2}(?:\.\d{1,2})?#>|<break\s+time\s*=\s*(?:"[^"<>\r\n]*"|'[^'<>\r\n]*')\s*\/\s*>/gi;

function removableControl(token: string): boolean {
    if (token.startsWith("<#")) {
        const seconds = Number(token.slice(2, -2));
        return Number.isFinite(seconds) && seconds >= 0.01 && seconds <= 99.99;
    }
    if (/^<break\b/i.test(token)) {
        // Only the SSML pause control, never arbitrary HTML or pronunciation
        // markup. "xs" is accepted as a legacy shorthand in generated text.
        return /^<break\s+time\s*=\s*(["'])(?:\d+(?:\.\d+)?s|xs)\1\s*\/\s*>$/i.test(token);
    }
    return true;
}

export function filterVoiceDisplayText(text: string): string {
    if (!text) return text;
    const protectedSpans = protectedMarkdownRanges(text);
    const ranges: Range[] = [];
    for (const match of text.matchAll(DISPLAY_CONTROL_PATTERN)) {
        const tokenStart = match.index, tokenEnd = tokenStart + match[0].length;
        if (isEscaped(text, tokenStart) || !removableControl(match[0])) continue;
        if (protectedSpans.some(span => tokenStart < span.end && tokenEnd > span.start)) continue;

        let start = tokenStart, end = tokenEnd;
        while (start > 0 && /[ \t]/.test(text[start - 1])) start--;
        while (end < text.length && /[ \t]/.test(text[end])) end++;
        const previous = ranges.at(-1);
        if (previous && start <= previous.end) previous.end = Math.max(previous.end, end);
        else ranges.push({ start, end });
    }
    let result = "", cursor = 0;
    const word = (char: string) => /[\p{L}\p{N}]/u.test(char);
    const cjk = (char: string) => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(char);
    for (const { start, end } of ranges) {
        result += text.slice(cursor, start);
        // Insert one readable separator between words, but never introduce a
        // stray space after Chinese punctuation or between adjacent Han words.
        const left = text[start - 1] || "", right = text[end] || "";
        const needsSeparator = (word(left) && word(right) && !(cjk(left) && cjk(right)))
            || (/[)\]}>`]/.test(left) && word(right))
            || (/[.,:;!?]/.test(left) && /[A-Za-z0-9]/.test(right));
        if (needsSeparator) result += " ";
        cursor = end;
    }
    return result + text.slice(cursor);
}
