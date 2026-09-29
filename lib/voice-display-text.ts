// Presentation only. Never use this function for storage, prompts or TTS input.
export const VOICE_SOUND_TAGS = [
    "laughs", "chuckle", "coughs", "clear-throat", "groans", "breath", "pant",
    "inhale", "exhale", "gasps", "sniffs", "sighs", "snorts", "burps",
    "lip-smacking", "humming", "hissing", "emm", "sneezes",
] as const;
export const VOICE_ACTION_TAGS_ZH = ["轻笑", "笑", "叹气", "咳嗽", "吸气", "呼气", "喘息"] as const;
const tags = new Set<string>([...VOICE_SOUND_TAGS, ...VOICE_ACTION_TAGS_ZH]);
export function filterVoiceDisplayText(text: string): string {
    const ranges: { start: number; end: number }[] = [];
    for (const match of text.matchAll(/\(([^()（）\r\n]*)\)|（([^()（）\r\n]*)）/g)) {
        const tag = (match[1] ?? match[2] ?? "").trim().toLowerCase().replace(/\s*-\s*/g, "-");
        if (!tags.has(tag)) continue;
        let start = match.index, end = start + match[0].length;
        while (start > 0 && /[ \t]/.test(text[start - 1])) start--;
        while (end < text.length && /[ \t]/.test(text[end])) end++;
        const previous = ranges.at(-1);
        if (previous && start <= previous.end) previous.end = end;
        else ranges.push({ start, end });
    }
    let result = "", cursor = 0;
    for (const { start, end } of ranges) {
        result += text.slice(cursor, start);
        // Normalize only the removed tag's boundary, preserving unrelated
        // spacing, Markdown hard breaks, indentation and ordinary parentheses.
        if (start > 0 && end < text.length && !/[\r\n]/.test(text[start - 1]) && !/[\r\n,.;:!?，。；：！？]/.test(text[end])) result += " ";
        cursor = end;
    }
    return result + text.slice(cursor);
}
