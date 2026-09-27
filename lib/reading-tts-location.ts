import type { ReadingTtsPosition } from "./reading-tts";

export type ReadingParagraphLocation = Pick<ReadingTtsPosition, "chapterIndex" | "paragraphIndex"> & { pageNum?: number; yRatio?: number };
export type ReadingAnchor = Partial<ReadingParagraphLocation>;

export function nearestPdfParagraph<T extends ReadingParagraphLocation>(paragraphs: T[], page: number, y: number): T | undefined {
    return paragraphs.filter(item => item.pageNum === page).reduce<T | undefined>((best, item) =>
        !best || Math.abs((item.yRatio ?? 0) - y) < Math.abs((best.yRatio ?? 0) - y) ? item : best, undefined);
}

/** A text line belongs to the latest paragraph start above its baseline. */
export function pdfParagraphAt<T extends ReadingParagraphLocation>(paragraphs: T[], y: number): T | undefined {
    return paragraphs.reduce<T | undefined>((best, item) => {
        const start = item.yRatio ?? 0;
        return start <= y + 0.003 && (!best || start > (best.yRatio ?? 0)) ? item : best;
    }, undefined) ?? paragraphs[0];
}

function elementAnchor(element: HTMLElement): ReadingAnchor {
    const chapter = element.closest<HTMLElement>("[data-reading-chapter]")?.dataset.readingChapter;
    const paragraph = element.closest<HTMLElement>("[data-reading-paragraph]")?.dataset.readingParagraph;
    return { chapterIndex: chapter === undefined ? undefined : Number(chapter), paragraphIndex: paragraph === undefined ? undefined : Number(paragraph) };
}

export function currentReadingAnchor(body: HTMLElement, selection?: Selection | null): ReadingAnchor {
    const bounds = body.getBoundingClientRect();
    if (selection && !selection.isCollapsed && selection.rangeCount && body.contains(selection.getRangeAt(0).startContainer)) {
        const range = selection.getRangeAt(0);
        const element = range.startContainer.nodeType === 1 ? range.startContainer as HTMLElement : range.startContainer.parentElement!;
        const page = element.closest<HTMLElement>("[data-page]");
        const rect = page?.getBoundingClientRect();
        return { ...elementAnchor(element), ...(page && rect ? { pageNum: Number(page.dataset.page), yRatio: (range.getBoundingClientRect().top - rect.top) / rect.height } : {}) };
    }
    const focusY = bounds.top + Math.min(60, bounds.height * 0.15);
    const candidates = Array.from(body.querySelectorAll<HTMLElement>('[data-reading-text="true"][data-reading-paragraph], .reading-pdf-text-layer span'))
        .map(element => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.bottom > bounds.top && rect.top < bounds.bottom && rect.height > 0);
    candidates.sort((a, b) => Math.abs(a.rect.top - focusY) - Math.abs(b.rect.top - focusY));
    if (candidates[0]) {
        const { element, rect } = candidates[0];
        const page = element.closest<HTMLElement>("div[data-page]");
        const pageRect = page?.getBoundingClientRect();
        return { ...elementAnchor(element), ...(page && pageRect ? { pageNum: Number(page.dataset.page), yRatio: (rect.top - pageRect.top) / pageRect.height } : {}) };
    }
    const pages = Array.from(body.querySelectorAll<HTMLElement>('div[data-page]')).map(element => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.bottom > focusY && rect.top < bounds.bottom);
    // At the end of a short PDF, the preceding page's blank tail may remain visible.
    // With no visible text, prefer the page occupying most of the viewport.
    const visibleHeight = (rect: DOMRect) => Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top);
    pages.sort((a, b) => visibleHeight(b.rect) - visibleHeight(a.rect));
    if (pages[0]) return { pageNum: Number(pages[0].element.dataset.page), yRatio: Math.max(0, (focusY - pages[0].rect.top) / pages[0].rect.height) };
    return {};
}
