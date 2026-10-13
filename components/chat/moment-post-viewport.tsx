"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

type Props = {
    postId: string;
    scrollContainerRef: RefObject<HTMLDivElement | null>;
    heightCache: Map<string, number>;
    estimatedHeight: number;
    initiallyMount: boolean;
    /** A native Moment photo may resolve asynchronously from IndexedDB. */
    hasMedia: boolean;
    /** Pagination already has its own scroll anchor restore. Do not compete with it. */
    isExternalAnchorActive?: () => boolean;
    children: ReactNode;
};

// Retain the virtualization that prevents old, image-heavy posts from exhausting
// WKWebView memory. The reserve is a ROW height, not an image cropping rule.
const HEIGHT_EPSILON = 1.5;
const MEDIA_WAIT_TIMEOUT_MS = 8000;

/** Safari 26 has no CSS scroll anchoring; Chrome/Firefox handle this themselves. */
function hasNativeScrollAnchoring(): boolean {
    return typeof CSS !== "undefined"
        && typeof CSS.supports === "function"
        && CSS.supports("overflow-anchor", "auto");
}

function mediaReady(holder: HTMLElement, hasMedia: boolean): boolean {
    if (!hasMedia) return true;
    const media = holder.querySelector(".feed-post-media");
    if (!media) return false; // Asset may still be resolving from IndexedDB.
    const gallery = media.querySelector(".fmmi-grid");
    // The original plugin leaves this marker on the persistent row wrapper.
    // On remount its async gallery may arrive after the native image is ready.
    if (holder.dataset.fmmi === "1" && !gallery) return false;
    // A hidden native lazy image must not delay an already-ready gallery.
    const images = (gallery ?? media).querySelectorAll("img");
    if (!images.length) return false;
    // 'complete' includes error, so a broken image cannot lock the reserve forever.
    return Array.from(images).every(image => image.complete);
}

/**
 * A very small virtualization wrapper: keep measured row heights while far-away
 * cards (and their image decoders, listeners and portals) are unmounted.
 *
 * While a remounted card is waiting for its photo, retain the placeholder's
 * old height instead of caching the briefly collapsed text-only card. Safari
 * lacks native overflow-anchor, so changes fully ABOVE the viewport require an
 * explicit matching scrollTop correction. Chromium must not be corrected twice.
 */
export function MomentPostViewport({
    postId,
    scrollContainerRef,
    heightCache,
    estimatedHeight,
    initiallyMount,
    hasMedia,
    isExternalAnchorActive,
    children,
}: Props) {
    const holderRef = useRef<HTMLDivElement>(null);
    const [nearby, setNearby] = useState(
        () => initiallyMount || typeof IntersectionObserver === "undefined",
    );
    const [placeholderHeight, setPlaceholderHeight] = useState(
        () => heightCache.get(postId) ?? estimatedHeight,
    );
    // The last actual DOM height, independently of whether media is settled.
    const lastHeightRef = useRef(placeholderHeight);
    const placeholderRef = useRef(placeholderHeight);
    const externalAnchorRef = useRef(isExternalAnchorActive);
    externalAnchorRef.current = isExternalAnchorActive;

    useEffect(() => {
        const holder = holderRef.current;
        if (!holder || typeof IntersectionObserver === "undefined") {
            setNearby(true);
            return;
        }

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
        const scrollContainer = scrollContainerRef.current;
        const nativeAnchoring = hasNativeScrollAnchoring();
        let disposed = false;
        let timedOut = false;
        let lastStable = heightCache.get(postId) ?? placeholderRef.current;
        // Setting minHeight before the browser paints prevents a previously
        // measured media card from collapsing while its asset:// URL resolves.
        if (hasMedia) holder.style.minHeight = `${Math.ceil(lastStable)}px`;

        const update = () => {
            if (disposed) return;
            const settled = timedOut || mediaReady(holder, hasMedia);
            if (hasMedia && !settled) {
                const floor = Math.max(lastStable, placeholderRef.current);
                holder.style.minHeight = `${Math.ceil(floor)}px`;
            } else {
                holder.style.minHeight = "";
            }

            const height = Math.ceil(holder.getBoundingClientRect().height);
            if (!Number.isFinite(height) || height <= 0) return;
            const previous = lastHeightRef.current;
            if (Math.abs(height - previous) >= HEIGHT_EPSILON) {
                if (!nativeAnchoring && scrollContainer && !externalAnchorRef.current?.()) {
                    const containerTop = scrollContainer.getBoundingClientRect().top;
                    const rowTop = holder.getBoundingClientRect().top;
                    // Only a fully preceding row can shift the current reading
                    // position; do not fight the user's finger inside this row.
                    if (rowTop + previous <= containerTop + 1) {
                        scrollContainer.scrollTop += height - previous;
                    }
                }
                lastHeightRef.current = height;
            }

            // A transient unpainted/undecoded card cannot poison the cache.
            // It may grow, however: keep the offscreen placeholder at least as
            // tall as anything already measured during the pending phase.
            if (!settled) {
                if (height > placeholderRef.current + HEIGHT_EPSILON) {
                    placeholderRef.current = height;
                    setPlaceholderHeight(height);
                }
                return;
            }

            lastStable = height;
            const cached = heightCache.get(postId);
            if (cached === undefined || Math.abs(cached - height) >= HEIGHT_EPSILON) {
                heightCache.set(postId, height);
            }
            if (Math.abs(placeholderRef.current - height) >= HEIGHT_EPSILON) {
                placeholderRef.current = height;
                setPlaceholderHeight(height);
            }
        };

        // Capturing load/error events works for lazily inserted images too.
        // MutationObserver covers IndexedDB photo arrival and plugin galleries.
        holder.addEventListener("load", update, true);
        holder.addEventListener("error", update, true);
        const mutationObserver = typeof MutationObserver !== "undefined"
            ? new MutationObserver(update) : null;
        mutationObserver?.observe(holder, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["src"],
        });
        const resizeObserver = typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(update) : null;
        resizeObserver?.observe(holder);
        // Missing/deleted assets must not leave an indefinitely tall spacer.
        const fallbackTimer = hasMedia ? window.setTimeout(() => {
            timedOut = true;
            update();
        }, MEDIA_WAIT_TIMEOUT_MS) : null;
        update();

        return () => {
            disposed = true;
            if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
            holder.removeEventListener("load", update, true);
            holder.removeEventListener("error", update, true);
            mutationObserver?.disconnect();
            resizeObserver?.disconnect();
            holder.style.minHeight = "";
        };
    }, [nearby, postId, hasMedia, heightCache, scrollContainerRef]);

    return (
        <div ref={holderRef} data-moment-post-id={postId} style={{ display: "flow-root" }}>
            {nearby ? children : (
                <div aria-hidden="true" style={{ height: placeholderHeight, width: "100%" }} />
            )}
        </div>
    );
}
