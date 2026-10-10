"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

type Props = {
    postId: string;
    scrollContainerRef: RefObject<HTMLDivElement | null>;
    heightCache: Map<string, number>;
    estimatedHeight: number;
    initiallyMount: boolean;
    children: ReactNode;
};

/**
 * Keeps the scroll height of previously measured Moments while allowing far-off
 * post cards (and their image decoders, React state, listeners and previews) to
 * unmount. This windowing layer does not touch the stored MomentPost records.
 *
 * The IntersectionObserver fallback keeps everything mounted on old browsers.
 */
export function MomentPostViewport({
    postId,
    scrollContainerRef,
    heightCache,
    estimatedHeight,
    initiallyMount,
    children,
}: Props) {
    const holderRef = useRef<HTMLDivElement>(null);
    const [nearby, setNearby] = useState(
        () => initiallyMount || typeof IntersectionObserver === "undefined",
    );
    const [placeholderHeight, setPlaceholderHeight] = useState(
        () => heightCache.get(postId) ?? estimatedHeight,
    );

    useEffect(() => {
        const holder = holderRef.current;
        if (!holder || typeof IntersectionObserver === "undefined") {
            setNearby(true);
            return;
        }

        // The page body, not the window, is the scroll container in Float.
        const observer = new IntersectionObserver(
            entries => {
                const entry = entries[0];
                if (entry) setNearby(entry.isIntersecting);
            },
            {
                root: scrollContainerRef.current,
                rootMargin: "900px 0px 900px 0px",
                threshold: 0,
            },
        );
        observer.observe(holder);
        return () => observer.disconnect();
    }, [postId, scrollContainerRef]);

    useLayoutEffect(() => {
        if (!nearby) return;
        const holder = holderRef.current;
        if (!holder) return;

        const rememberHeight = () => {
            const next = Math.ceil(holder.getBoundingClientRect().height);
            if (!Number.isFinite(next) || next <= 0) return;
            heightCache.set(postId, next);
            setPlaceholderHeight(previous => previous === next ? previous : next);
        };

        // Flow-root includes the card's bottom margin in the measured row height.
        rememberHeight();
        if (typeof ResizeObserver === "undefined") return;
        const resizeObserver = new ResizeObserver(rememberHeight);
        resizeObserver.observe(holder);
        return () => resizeObserver.disconnect();
    }, [nearby, postId, heightCache]);

    return (
        <div ref={holderRef} data-moment-post-id={postId} style={{ display: "flow-root" }}>
            {nearby ? children : (
                <div aria-hidden="true" style={{ height: placeholderHeight, width: "100%" }} />
            )}
        </div>
    );
}
