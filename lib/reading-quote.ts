import type { ChatMessage } from "./chat-storage";

/** Original selection, independent of the user's editable message content. Indices are zero-based. */
export type ReadingQuote = {
    text: string;
    bookTitle?: string;
    chapterIndex?: number;
    startParagraphIndex?: number;
    endParagraphIndex?: number;
    /** Only present when a continuous selection crosses a chapter boundary. */
    endChapterIndex?: number;
};

export function getReadingQuote(msg: Pick<ChatMessage, "origin" | "mediaType" | "mediaData">): ReadingQuote | undefined {
    if (msg.origin !== "reading_discuss" && msg.mediaType !== "reading_discuss") return undefined;
    const quote = msg.mediaData?.readingQuote;
    return quote && typeof quote.text === "string" && quote.text.trim() ? quote : undefined;
}

export function formatReadingQuoteContent(msg: Pick<ChatMessage, "origin" | "mediaType" | "mediaData" | "content">, content = msg.content): string {
    const quote = getReadingQuote(msg);
    if (!quote) return content;
    const title = quote.bookTitle || msg.mediaData?.readingBookTitle;
    return `${title ? `共读《${title}》\n` : ""}[引用书中文字]\n${quote.text}\n[/引用书中文字]\n\n[用户]\n${content}\n[/用户]`;
}

const TEXT_SELECTOR = '[data-reading-text="true"]';
const EXCLUDED_SELECTOR = '[data-no-nav="true"], [aria-hidden="true"], button, input, textarea, select';

function textOwner(node: Node, root: HTMLElement): HTMLElement | null {
    const element = node.nodeType === 1 ? node as Element : node.parentElement;
    const owner = element?.closest<HTMLElement>(TEXT_SELECTOR);
    return owner && root.contains(owner) && !element?.closest(EXCLUDED_SELECTOR) ? owner : null;
}

function indexAttribute(owner: HTMLElement, name: string): number | undefined {
    const value = owner.getAttribute(name);
    if (value === null || value === "") return undefined;
    const index = Number(value);
    return Number.isInteger(index) && index >= 0 ? index : undefined;
}

/** Read the live native selection; never expand it to whole paragraphs or infer its text from the book. */
export function readReadingSelection(root: HTMLElement, selection: Selection | null, bookTitle: string): { quote: ReadingQuote; range: Range } | null {
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return null;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
    const start = textOwner(range.startContainer, root);
    const end = textOwner(range.endContainer, root);
    if (!start || !end) return null;
    const text = selection.toString();
    if (!text.trim()) return null;

    // Native selection normally omits user-select:none annotations. Verify that no UI text
    // leaked into it (browser behavior differs), without changing any selected characters.
    const walker = root.ownerDocument.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    let node: Node | null = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer : walker.nextNode();
    let bodyText = "";
    while (node) {
        if (range.intersectsNode(node) && textOwner(node, root)) {
            const from = node === range.startContainer ? range.startOffset : 0;
            const to = node === range.endContainer ? range.endOffset : node.textContent?.length;
            bodyText += (node.textContent || "").slice(from, to);
        }
        node = walker.nextNode();
    }
    if (bodyText.replace(/\s/g, "") !== text.replace(/\s/g, "")) return null;

    const chapterIndex = indexAttribute(start, "data-reading-chapter");
    const endChapterIndex = indexAttribute(end, "data-reading-chapter");
    return {
        quote: {
            text, bookTitle, chapterIndex,
            startParagraphIndex: indexAttribute(start, "data-reading-paragraph"),
            endParagraphIndex: indexAttribute(end, "data-reading-paragraph"),
            ...(endChapterIndex !== undefined && endChapterIndex !== chapterIndex ? { endChapterIndex } : {}),
        },
        range,
    };
}
