/**
 * User-initiated, iMessage-only translation layout guard.
 *
 * Native scroll anchoring may move the scrolling pane when a bottom message
 * expands. A single-rAF lease is insufficient: after first toggle pinned is
 * false, and the third toggle can be moved by the native bottom anchor.
 *
 * Keep native anchoring paused for the reading session, independent of the
 * scroll controller's pinned flag. End only on explicit scroll intent, new
 * message/initial positioning, or room teardown. No persistence or message I/O.
 */

type Guard = {
    originalValue: string;
    originalPriority: string;
    removeListeners: () => void;
};
const guards = new WeakMap<HTMLElement, Guard>();
const KEYBOARD_SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

export function releaseChatUserLayoutHold(scroller: HTMLElement | null): void {
    if (!scroller) return;
    const guard = guards.get(scroller);
    if (!guard) return;
    guards.delete(scroller); // Re-entrant release must be harmless.
    guard.removeListeners();
    // Never leave a session's inline override in the live room.
    if (guard.originalValue) {
        scroller.style.setProperty("overflow-anchor", guard.originalValue, guard.originalPriority);
    } else {
        scroller.style.removeProperty("overflow-anchor");
    }
}

function holdNativeAnchorForReading(scroller: HTMLElement): void {
    if (guards.has(scroller)) return;
    const originalValue = scroller.style.getPropertyValue("overflow-anchor");
    const originalPriority = scroller.style.getPropertyPriority("overflow-anchor");
    // The chat's bottom-anchor child explicitly opts in to native anchoring.
    // A pane-level important override excludes it during manual translation.
    // Safari 26 / iOS WKWebView does not implement overflow-anchor. The
    // position correction below remains mandatory even when this is unsupported.
    if (typeof CSS !== "undefined" && CSS.supports?.("overflow-anchor", "none")) {
        scroller.style.setProperty("overflow-anchor", "none", "important");
    }

    const onScrollGesture = () => releaseChatUserLayoutHold(scroller);
    const onKeyboardScroll = (event: KeyboardEvent) => {
        // This native listener can run BEFORE React TranslationBody's
        // preventDefault/stopPropagation. Identify the focused translation
        // control directly, never infer consumption from defaultPrevented.
        // Only an actionable first Space press on that exact control is exempt;
        // nested plugins, key repeats and active text selection retain normal
        // keyboard-scroll lease release behavior.
        const target = event.target;
        if (event.key === " " && !event.repeat &&
            target instanceof Element && target.matches('[data-im-text-body]') &&
            !window.getSelection()?.toString()) return;
        if (event.defaultPrevented) return;
        if (KEYBOARD_SCROLL_KEYS.has(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
            if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
            releaseChatUserLayoutHold(scroller);
        }
    };
    const onScrollbarDrag = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        const right = scroller.getBoundingClientRect().right;
        if (event.clientX >= right - 22) releaseChatUserLayoutHold(scroller);
    };
    scroller.addEventListener("wheel", onScrollGesture, { passive: true });
    scroller.addEventListener("touchmove", onScrollGesture, { passive: true });
    scroller.addEventListener("pointerdown", onScrollbarDrag, { passive: true });
    // Native key scrolling normally targets the pane or an element inside it.
    scroller.addEventListener("keydown", onKeyboardScroll);
    guards.set(scroller, {
        originalValue,
        originalPriority,
        removeListeners: () => {
            scroller.removeEventListener("wheel", onScrollGesture);
            scroller.removeEventListener("touchmove", onScrollGesture);
            scroller.removeEventListener("pointerdown", onScrollbarDrag);
            scroller.removeEventListener("keydown", onKeyboardScroll);
        },
    });
}

export function beginChatUserLayoutChange(
    scroller: HTMLElement | null,
    trigger: HTMLElement,
    suspendFollow: () => void,
    resumeIfAtBottom?: () => void,
): (() => void) | undefined {
    if (!scroller?.isConnected || !trigger.isConnected || !scroller.contains(trigger)) return;
    const anchor = trigger.closest<HTMLElement>("[data-msg-id]") ?? trigger;
    if (!scroller.contains(anchor)) return;

    // Capture physical bottom position before changing layout or pinned state.
    // A manual toggle only follows when the viewport was actually at the bottom;
    // history readers keep the v2.2 tapped-bubble position policy.
    const followBottom = !!resumeIfAtBottom &&
        Math.abs(scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight) <= 2;
    holdNativeAnchorForReading(scroller);
    suspendFollow();
    const originalTop = anchor.getBoundingClientRect().top;
    let finished = false;
    return () => {
        if (finished) return;
        finished = true;
        if (!scroller.isConnected || !anchor.isConnected || !scroller.contains(anchor)) return;
        if (followBottom) {
            // Pre-paint bottom alignment; never animate via scrollTo({behavior:"smooth"}).
            // Keep native anchoring suspended so it cannot compete with JS.
            const bottom = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
            if (Math.abs(scroller.scrollTop - bottom) > 1) scroller.scrollTop = bottom;
            resumeIfAtBottom?.(); // Re-arm later media/AI bottom following only at the bottom.
            return;
        }
        const shift = anchor.getBoundingClientRect().top - originalTop;
        // Only correct a real coordinate shift; no scrollTop write on a stable
        // commit. Browser clamps if the requested position is out of range.
        if (Number.isFinite(shift) && Math.abs(shift) > 1) scroller.scrollTop += shift;
        // Do NOT restore overflow-anchor here or on the next rAF. It remains
        // paused across subsequent toggles, preventing the third-click regression.
    };
}
