"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { ReadingTtsPosition } from "@/lib/reading-tts";
import type { ReadingParagraphLocation } from "@/lib/reading-tts-location";

export function useReadingTtsFollow({ bodyRef, position, chapterIndex, setChapterIndex, isPdf, isScrollMode, pages, pageIndex, setPageIndex, paragraphs, hasSelection }: {
    bodyRef: RefObject<HTMLDivElement | null>; position: ReadingTtsPosition | null;
    chapterIndex: number; setChapterIndex: (index: number) => void; isPdf: boolean; isScrollMode: boolean;
    pages: ReadingParagraphLocation[][]; pageIndex: number; setPageIndex: (index: number) => void;
    paragraphs: ReadingParagraphLocation[]; hasSelection: () => boolean;
}) {
    const [following, setFollowing] = useState(true);
    const [followVersion, setFollowVersion] = useState(0);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const suspend = useCallback(() => {
        if (!position) return;
        const body = bodyRef.current;
        if (body) body.scrollTo({ top: body.scrollTop, left: body.scrollLeft, behavior: "instant" });
        setFollowing(false); clearTimeout(timer.current);
        timer.current = setTimeout(() => setFollowing(true), 8000);
    }, [bodyRef, position]);
    const follow = useCallback(() => { clearTimeout(timer.current); setFollowing(true); setFollowVersion(value => value + 1); }, []);
    useEffect(() => () => clearTimeout(timer.current), []);
    useEffect(() => {
        if (!position || !following || hasSelection()) return;
        if (!isPdf && position.chapterIndex !== chapterIndex) { setChapterIndex(position.chapterIndex); return; }
        if (isPdf && position.chapterIndex !== chapterIndex) setChapterIndex(position.chapterIndex);
        const matches = (item: ReadingParagraphLocation) => item.chapterIndex === position.chapterIndex && item.paragraphIndex === position.paragraphIndex;
        if (!isPdf && !isScrollMode) {
            if (pages[pageIndex]?.some(matches)) return;
            const page = pages.findIndex(items => items.some(matches));
            if (page >= 0) setPageIndex(page);
            return;
        }
        const body = bodyRef.current;
        if (!body) return;
        let frame = 0;
        const scroll = () => {
            if (hasSelection()) return;
            const bounds = body.getBoundingClientRect();
            let top: number | undefined;
            let bottom: number | undefined;
            if (isPdf) {
                const paragraph = paragraphs.find(matches);
                const page = body.querySelector<HTMLElement>(`div[data-page="${paragraph?.pageNum}"]`);
                const rect = page?.getBoundingClientRect();
                if (paragraph && rect) { top = rect.top + rect.height * (paragraph.yRatio ?? 0); bottom = top + 32; }
            } else {
                const element = body.querySelector<HTMLElement>(`[data-reading-text="true"][data-reading-chapter="${position.chapterIndex}"][data-reading-paragraph="${position.paragraphIndex}"]`);
                const rect = element?.getBoundingClientRect();
                if (rect) { top = rect.top; bottom = rect.bottom; }
            }
            if (top !== undefined && bottom !== undefined && (top < bounds.top + 10 || bottom > bounds.bottom - 16)) {
                const scale = bounds.height / body.clientHeight || 1;
                body.scrollTo({ top: body.scrollTop + (top - bounds.top) / scale - 36, behavior: "smooth" });
            }
        };
        const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(scroll); };
        const observer = new MutationObserver(schedule);
        observer.observe(body, { childList: true, subtree: true });
        schedule();
        return () => { cancelAnimationFrame(frame); observer.disconnect(); };
    }, [position, following, followVersion, chapterIndex, isPdf, isScrollMode, pages, pageIndex, bodyRef, paragraphs, hasSelection, setChapterIndex, setPageIndex]);
    return { following, suspend, follow };
}
