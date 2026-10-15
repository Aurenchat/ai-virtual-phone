/**
 * Session-local, presentation-only bottom following for ChatRoom.
 *
 * ChatRoom can synchronously append a row before media, iMessage grouping and
 * input overlay geometry settle. A single scrollTop write is not sufficient.
 * Never hold chat messages/media, never persist a position, and never override
 * a deliberate user scroll, history-anchor restoration or search jump.
 */
export type ChatScrollStability = {
    attach: (scroller: HTMLElement | null) => () => void;
    initial: () => void;
    appended: (forceForOwnMessage?: boolean) => void;
    followIfPinned: () => void;
    suspend: () => void;
    resumeIfAtBottom: () => void;
    stabilizeTarget: (center: () => void) => void;
    isPinned: () => boolean;
};

const REJOIN_BOTTOM_PX = 2;
const SETTLE_DELAYS_MS = [90, 250, 650];
const WATCH_LAST_ROWS = 8;

export function createChatScrollStability(): ChatScrollStability {
    let scroller: HTMLElement | null = null;
    let layoutTarget: (() => void) | null = null;
    let pinned = true;
    let animationFrame = 0;
    let settleTimers: number[] = [];
    let resizeObserver: ResizeObserver | null = null;
    let scrollbarDragY: number | null = null;
    let gesture: "up" | "down" | null = null;
    let lastTouchY: number | null = null;
    let touchScrollTop: number | null = null;
    let attachmentVersion = 0;
    let detachCurrent: (() => void) | null = null;

    const bottomDistance = () => scroller
        ? Math.max(0, scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight)
        : 0;

    const clearPending = () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        for (const timer of settleTimers) clearTimeout(timer);
        settleTimers = [];
    };

    const align = () => {
        if (!scroller) return;
        if (layoutTarget) { layoutTarget(); return; }
        if (!pinned) return;
        // Use the scroll container's real bottom; do not guess a bubble height.
        const target = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        if (Math.abs(scroller.scrollTop - target) <= 1) return;
        scroller.scrollTop = target;
    };

    const scheduleAlign = () => {
        if (!scroller || (!pinned && !layoutTarget) || animationFrame) return;
        animationFrame = requestAnimationFrame(() => {
            animationFrame = 0;
            align();
        });
    };

    const watchLastRows = () => {
        if (!scroller || !resizeObserver) return;
        resizeObserver.disconnect();
        // Includes timestamp/group wrappers: iMessage Bridge changes grouping
        // and margins in a later animation frame after React has committed.
        resizeObserver.observe(scroller); // Viewport/keyboard size changes, not all history.
        const rows = scroller.querySelectorAll<HTMLElement>('[id^="message-"], .chat-offline-turn, .chat-stream-preview');
        const observed = new Set<Element>();
        for (let i = Math.max(0, rows.length - WATCH_LAST_ROWS); i < rows.length; i++) {
            const row = rows[i];
            observed.add(row);
            if (row.parentElement && row.parentElement !== scroller) observed.add(row.parentElement);
        }
        for (const target of observed) resizeObserver.observe(target);
    };

    const settle = () => {
        if (!pinned || !scroller) return;
        clearPending();
        align(); // useLayoutEffect calls this before first paint
        watchLastRows();
        // Bounded delayed checks cover the Bridge's next-frame restyling,
        // initial font/geometry changes and delayed overlay measurement.
        scheduleAlign();
        for (const ms of SETTLE_DELAYS_MS) {
            settleTimers.push(window.setTimeout(align, ms));
        }
    };

    const suspend = () => {
        layoutTarget = null;
        pinned = false;
        clearPending();
    };

    const stabilizeTarget = (center: () => void) => {
        suspend();
        if (!scroller) return;
        layoutTarget = center;
        scheduleAlign();
        for (const ms of SETTLE_DELAYS_MS) {
            settleTimers.push(window.setTimeout(() => {
                align();
                if (ms === SETTLE_DELAYS_MS[SETTLE_DELAYS_MS.length - 1]) {
                    layoutTarget = null;
                    clearPending();
                }
            }, ms));
        }
    };

    const rejoin = () => {
        if (pinned) return;
        pinned = true;
        watchLastRows();
        scheduleAlign();
    };

    const onWheel = (event: WheelEvent) => {
        if (layoutTarget && event.deltaY !== 0) suspend();
        touchScrollTop = null;
        if (event.deltaY < 0) { gesture = "up"; suspend(); }
        else if (event.deltaY > 0) {
            gesture = "down";
            if (bottomDistance() <= REJOIN_BOTTOM_PX) rejoin();
        }
    };
    const onTouchStart = (event: TouchEvent) => {
        if (layoutTarget) suspend();
        lastTouchY = event.touches[0]?.clientY ?? null;
        touchScrollTop = scroller?.scrollTop ?? null;
        gesture = null;
        clearPending();
    };
    const onTouchMove = (event: TouchEvent) => {
        const y = event.touches[0]?.clientY;
        if (y === undefined || lastTouchY === null) return;
        if (y > lastTouchY + 2) { gesture = "up"; suspend(); lastTouchY = y; }
        else if (y < lastTouchY - 2) { gesture = "down"; lastTouchY = y; }
    };
    const onTouchEnd = () => { lastTouchY = null; }; // Keep direction through momentum/queued scroll events.
    const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || !scroller) return;
        touchScrollTop = null;
        const rect = scroller.getBoundingClientRect();
        scrollbarDragY = event.clientX >= rect.right - 22 ? event.clientY : null;
        gesture = null;
        if (scrollbarDragY !== null) suspend(); // Track clicks can scroll without pointermove.
    };
    const onPointerMove = (event: PointerEvent) => {
        if (scrollbarDragY === null) return;
        if (event.clientY < scrollbarDragY - 2) { gesture = "up"; suspend(); }
        else if (event.clientY > scrollbarDragY + 2) gesture = "down";
        scrollbarDragY = event.clientY;
    };
    const onPointerUp = () => { scrollbarDragY = null; };
    const onKeyDown = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement | null;
        if (target?.isContentEditable || target?.closest?.("input, textarea, [contenteditable]:not([contenteditable=false])")) return;
        if (target && typeof target.nodeType !== "number") return;
        if (target && target !== document.body && target !== document.documentElement && !scroller?.contains(target)) return;
        if (layoutTarget && ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) suspend();
        touchScrollTop = null;
        if (["ArrowUp", "PageUp", "Home"].includes(event.key) || (event.key === " " && event.shiftKey)) { gesture = "up"; suspend(); }
        else if (["ArrowDown", "PageDown", "End", " "].includes(event.key)) {
            gesture = "down";
            if (bottomDistance() <= REJOIN_BOTTOM_PX) rejoin();
        }
    };
    const onScroll = () => {
        if (!scroller) return;
        const current = scroller.scrollTop;
        const near = bottomDistance() <= REJOIN_BOTTOM_PX;
        if (touchScrollTop !== null) {
            // Touching the scrollbar moves content opposite to a normal swipe.
            // Track actual scrolling through touchend/inertia, not just finger direction.
            if (current < touchScrollTop - 1 && !near) gesture = "up";
            else if (current > touchScrollTop + 1) gesture = "down";
            touchScrollTop = current;
        }
        if (gesture === "up") suspend();
        else if (gesture === "down" || scrollbarDragY !== null) {
            if (near) rejoin();
        }
    };
    const onMediaLoad = (event: Event) => {
        if (event.target instanceof HTMLImageElement || event.target instanceof HTMLVideoElement) {
            scheduleAlign();
        }
    };

    const attach = (element: HTMLElement | null) => {
        detachCurrent?.();
        scroller = element;
        if (!element) return () => {};
        const version = ++attachmentVersion;
        pinned = true;
        element.addEventListener("scroll", onScroll, { passive: true });
        element.addEventListener("wheel", onWheel, { passive: true });
        element.addEventListener("touchstart", onTouchStart, { passive: true });
        element.addEventListener("touchmove", onTouchMove, { passive: true });
        element.addEventListener("touchend", onTouchEnd, { passive: true });
        element.addEventListener("touchcancel", onTouchEnd, { passive: true });
        window.addEventListener("keydown", onKeyDown);
        element.addEventListener("pointerdown", onPointerDown, { passive: true });
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerup", onPointerUp, { passive: true });
        window.addEventListener("pointercancel", onPointerUp, { passive: true });
        // Capture image load/error even though they do not bubble.
        element.addEventListener("load", onMediaLoad, true);
        element.addEventListener("error", onMediaLoad, true);
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => {
                if (version === attachmentVersion && scroller === element) scheduleAlign();
            });
            watchLastRows();
        }
        const dispose = () => {
            if (version !== attachmentVersion) return;
            ++attachmentVersion;
            detachCurrent = null;
            layoutTarget = null;
            clearPending();
            resizeObserver?.disconnect();
            resizeObserver = null;
            for (const [name, listener, option] of [
                ["scroll", onScroll], ["wheel", onWheel], ["touchstart", onTouchStart],
                ["touchmove", onTouchMove], ["touchend", onTouchEnd],
                ["touchcancel", onTouchEnd],
                ["pointerdown", onPointerDown],
                ["load", onMediaLoad, true], ["error", onMediaLoad, true],
            ] as const) element.removeEventListener(name, listener as EventListener, option as boolean);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointercancel", onPointerUp);
            if (scroller === element) scroller = null;
            scrollbarDragY = null;
            lastTouchY = null;
            touchScrollTop = null;
            gesture = null;
        };
        detachCurrent = dispose;
        return dispose;
    };

    return {
        attach,
        initial: () => { layoutTarget = null; pinned = true; gesture = null; touchScrollTop = null; settle(); },
        appended: (forceForOwnMessage = false) => {
            if (forceForOwnMessage) { layoutTarget = null; pinned = true; gesture = null; touchScrollTop = null; }
            if (pinned) settle();
            else watchLastRows();
        },
        followIfPinned: () => scheduleAlign(),
        suspend: () => { gesture = null; touchScrollTop = null; suspend(); },
        resumeIfAtBottom: () => {
            if (!scroller || bottomDistance() > REJOIN_BOTTOM_PX) return;
            gesture = null;
            touchScrollTop = null;
            rejoin();
        },
        stabilizeTarget,
        isPinned: () => pinned,
    };
}
