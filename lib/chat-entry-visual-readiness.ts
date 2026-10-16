/**
 * One-shot, bounded entry geometry readiness. No DOM access, no scroll writes.
 * The caller samples only while the first message pane is hidden; later
 * messages and v2.3 user-layout interaction never pass through this tracker.
 */
export const MAX_CHAT_ENTRY_VISUAL_WAIT_MS = 128;
const GEOMETRY_EPSILON_PX = 0.5;

type Snapshot = {
    now: number;
    expectsBridge: boolean;
    bridgeReady: boolean;
    scrollHeight: number;
    clientHeight: number;
    scrollTop: number;
    tailTop: number | null;
    tailBottom: number | null;
};

export type ChatEntryVisualResult =
    | { ready: false }
    | { ready: true; timedOut: boolean; reason: string };

function close(a: number | null, b: number | null): boolean {
    return a === null || b === null ? a === b : Math.abs(a - b) <= GEOMETRY_EPSILON_PX;
}

export function createChatEntryVisualReadiness(startedAt: number) {
    let previous: Snapshot | null = null;
    let stableMatches = 0;
    return {
        sample(next: Snapshot): ChatEntryVisualResult {
            const styled = !next.expectsBridge || next.bridgeReady;
            const unchanged = !!previous && styled &&
                previous.expectsBridge === next.expectsBridge &&
                previous.bridgeReady === next.bridgeReady &&
                close(previous.scrollHeight, next.scrollHeight) &&
                close(previous.clientHeight, next.clientHeight) &&
                close(previous.scrollTop, next.scrollTop) &&
                close(previous.tailTop, next.tailTop) &&
                close(previous.tailBottom, next.tailBottom);
            stableMatches = unchanged ? stableMatches + 1 : 0;
            previous = next;
            // Non-Bridge rooms keep the original ~two-frame fast path. The
            // Bridge needs two consecutive stable comparisons *after* mode.
            const requiredMatches = next.expectsBridge ? 2 : 1;
            if (styled && stableMatches >= requiredMatches) {
                return { ready: true, timedOut: false, reason: "stable" };
            }
            if (next.now - startedAt >= MAX_CHAT_ENTRY_VISUAL_WAIT_MS) {
                // Fail OPEN for accessibility/latency. Browser validation must
                // reject any visible >1px drift caused by this fallback.
                return { ready: true, timedOut: true,
                    reason: styled ? "geometry-unsettled" : "bridge-unavailable" };
            }
            return { ready: false };
        },
    };
}
