"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { MemoryEntry } from "@/lib/memory-types";

/**
 * Limit the number of mounted long-term-memory cards in mobile WebKit.
 * Every entry stays in the existing in-memory array; only distant *DOM cards*
 * are temporarily replaced with height-preserving placeholders.
 *
 * Chunks instead of single rows reduce IntersectionObserver target count.
 * Cached measured heights prevent already-visited sections from changing size
 * whenever they leave/reenter the viewport.
 */
const CHUNK_SIZE = 10;
const OVERSCAN_PX = 960;
const CARD_GAP_PX = 8; // existing memory-detail-scroll gap-2

function estimateChunkHeight(entries: MemoryEntry[]): number {
    // Collapsed memory cards show up to 100 characters. This is only an initial
    // estimate; measured height replaces it once the chunk has been rendered.
    return entries.reduce((sum, entry) => {
        const chars = Math.min(entry.content?.length ?? 0, 100);
        return sum + 86 + Math.max(1, Math.ceil(chars / 29)) * 21;
    }, Math.max(0, entries.length - 1) * CARD_GAP_PX);
}

type ChunkProps = {
    entries: MemoryEntry[];
    chunkIndex: number;
    scrollRootRef: RefObject<HTMLDivElement | null>;
    pinnedIds: ReadonlyArray<string | null>;
    renderEntry: (entry: MemoryEntry) => ReactNode;
};

function MemoryEntryChunk({ entries, chunkIndex, scrollRootRef, pinnedIds, renderEntry }: ChunkProps) {
    const elementRef = useRef<HTMLDivElement>(null);
    // First viewport is painted immediately; farther chunks mount on approach.
    const [isNearViewport, setIsNearViewport] = useState(chunkIndex < 2);
    const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
    const pinned = entries.some(entry => pinnedIds.includes(entry.id));
    const mounted = pinned || isNearViewport;
    const estimatedHeight = useMemo(() => estimateChunkHeight(entries), [entries]);

    useEffect(() => {
        const element = elementRef.current;
        const root = scrollRootRef.current;
        if (!element || !root || typeof IntersectionObserver === "undefined") {
            // Conservative fallback for environments with no observer support.
            setIsNearViewport(true);
            return;
        }
        const observer = new IntersectionObserver(
            records => setIsNearViewport(records.some(record => record.isIntersecting)),
            { root, rootMargin: `${OVERSCAN_PX}px 0px`, threshold: 0 },
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [scrollRootRef]);

    useLayoutEffect(() => {
        if (!mounted) return;
        const element = elementRef.current;
        if (!element) return;
        const measure = () => {
            const next = Math.ceil(element.getBoundingClientRect().height);
            if (next > 0) setMeasuredHeight(previous => previous === next ? previous : next);
        };
        measure();
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [mounted, entries, renderEntry]);

    return (
        <div
            ref={elementRef}
            data-memory-window-chunk={chunkIndex}
            style={mounted
                ? { display: "flex", flexDirection: "column", gap: CARD_GAP_PX, width: "100%", flexShrink: 0 }
                : { height: measuredHeight ?? estimatedHeight, width: "100%", flexShrink: 0 }}
        >
            {mounted ? entries.map(renderEntry) : null}
        </div>
    );
}

export function MemoryEntryVirtualList({
    entries,
    scrollRootRef,
    pinnedIds,
    renderEntry,
}: {
    entries: MemoryEntry[];
    scrollRootRef: RefObject<HTMLDivElement | null>;
    pinnedIds: ReadonlyArray<string | null>;
    renderEntry: (entry: MemoryEntry) => ReactNode;
}) {
    const chunks = useMemo(() => {
        const result: MemoryEntry[][] = [];
        for (let index = 0; index < entries.length; index += CHUNK_SIZE) {
            result.push(entries.slice(index, index + CHUNK_SIZE));
        }
        return result;
    }, [entries]);

    return (
        <div
            className="memory-entry-virtual-list"
            style={{ display: "flex", flexDirection: "column", gap: CARD_GAP_PX, width: "100%", flexShrink: 0 }}
        >
            {chunks.map((chunk, index) => (
                <MemoryEntryChunk
                    key={`${index}-${chunk[0].id}`}
                    entries={chunk}
                    chunkIndex={index}
                    scrollRootRef={scrollRootRef}
                    pinnedIds={pinnedIds}
                    renderEntry={renderEntry}
                />
            ))}
        </div>
    );
}
