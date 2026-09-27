"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { readReadingSelection, type ReadingQuote } from "@/lib/reading-quote";

type SelectionAction = { quote: ReadingQuote; left: number; top: number };

export function useReadingSelection(
    bodyRef: RefObject<HTMLDivElement | null>,
    viewerRef: RefObject<HTMLDivElement | null>,
    bookTitle: string,
    locationKey: string,
) {
    const [action, setAction] = useState<SelectionAction | null>(null);
    const snapshotRef = useRef<ReadingQuote | null>(null);
    const gestureRef = useRef({ x: 0, y: 0, time: 0, inBody: false, blocked: false });
    const read = useCallback(() => bodyRef.current
        ? readReadingSelection(bodyRef.current, window.getSelection(), bookTitle) : null, [bodyRef, bookTitle]);
    const hasSelection = useCallback(() => Boolean(read()), [read]);
    const suppressNavigation = useCallback(() => gestureRef.current.blocked || hasSelection(), [hasSelection]);

    useEffect(() => {
        let frame = 0;
        const refresh = () => {
            const selected = read();
            const viewer = viewerRef.current;
            const body = bodyRef.current;
            if (!selected || !viewer || !body || !body.getClientRects().length || getComputedStyle(body).visibility === "hidden") {
                snapshotRef.current = null;
                setAction(null);
                return;
            }
            gestureRef.current.blocked = true;
            snapshotRef.current = selected.quote;
            const bounds = body.getBoundingClientRect();
            const rects = Array.from(selected.range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0 && rect.bottom > bounds.top && rect.top < bounds.bottom);
            const rect = window.getSelection()?.focusNode === selected.range.startContainer ? rects[0] : rects.at(-1);
            if (!rect) { setAction(null); return; }
            const origin = viewer.getBoundingClientRect();
            // The phone shell may be scaled; position in the viewer's own CSS coordinates.
            const scaleX = origin.width / viewer.offsetWidth || 1;
            const scaleY = origin.height / viewer.offsetHeight || 1;
            setAction({
                quote: selected.quote,
                left: Math.max(8, Math.min(viewer.clientWidth - 64, (rect.left + rect.width / 2 - origin.left) / scaleX - 28)),
                top: Math.max((bounds.top - origin.top) / scaleY, Math.min((bounds.bottom - origin.top) / scaleY - 38,
                    (rect.top - origin.top) / scaleY - 40)),
            });
        };
        const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(refresh); };
        const down = (event: PointerEvent) => {
            if ((event.target as Element)?.closest?.('[data-reading-quote-action]')) return;
            const inBody = Boolean(bodyRef.current?.contains(event.target as Node));
            gestureRef.current = { x: event.clientX, y: event.clientY, time: event.timeStamp, inBody, blocked: inBody && hasSelection() };
            snapshotRef.current = null;
            setAction(null);
        };
        const up = (event: PointerEvent) => {
            const gesture = gestureRef.current;
            if (gesture.inBody && (hasSelection() || event.timeStamp - gesture.time > 350 ||
                (event.pointerType === "mouse" && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 5))) gesture.blocked = true;
            schedule();
        };
        document.addEventListener("selectionchange", schedule);
        document.addEventListener("pointerdown", down, true);
        document.addEventListener("pointerup", up, true);
        document.addEventListener("pointercancel", up, true);
        document.addEventListener("touchend", schedule);
        window.addEventListener("resize", schedule);
        window.addEventListener("scroll", schedule, true);
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener("selectionchange", schedule);
            document.removeEventListener("pointerdown", down, true);
            document.removeEventListener("pointerup", up, true);
            document.removeEventListener("pointercancel", up, true);
            document.removeEventListener("touchend", schedule);
            window.removeEventListener("resize", schedule);
            window.removeEventListener("scroll", schedule, true);
        };
    }, [bodyRef, viewerRef, read, hasSelection]);

    const clear = useCallback(() => {
        if (read()) window.getSelection()?.removeAllRanges();
        snapshotRef.current = null;
        setAction(null);
    }, [read]);
    useEffect(() => { clear(); }, [locationKey, clear]);
    useEffect(() => () => { if (read()) window.getSelection()?.removeAllRanges(); }, [read]);

    const capture = () => { snapshotRef.current = read()?.quote ?? snapshotRef.current; };
    const takeQuote = () => {
        const quote = snapshotRef.current;
        clear();
        return quote;
    };
    return { action, capture, takeQuote, clear, hasSelection, suppressNavigation };
}
