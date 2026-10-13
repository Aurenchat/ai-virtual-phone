"use client";

import { useLayoutEffect, type RefObject } from "react";

const CHAT_BOTTOM_RESERVE_CSS_VAR = "--chat-bottom-reserve";
const STICK_TO_BOTTOM_THRESHOLD = 120;

function findBottomOverlay(wrapper: HTMLElement): HTMLElement | null {
    for (const child of Array.from(wrapper.children)) {
        if (!(child instanceof HTMLElement)) continue;
        const ui = child.dataset.ui;
        if (ui === "input" || ui === "multi-select") return child;
    }
    return null;
}

export function useChatBottomReserve<TWrapper extends HTMLElement, TScroll extends HTMLElement>(
    wrapperRef: RefObject<TWrapper | null>,
    scrollRef: RefObject<TScroll | null>,
    refreshKey: string,
    shouldAutoStick?: () => boolean,
) {
    useLayoutEffect(() => {
        if (typeof window === "undefined") return;
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        let disposed = false;
        let frame = 0;
        let bottomScrollFrame = 0;
        let observer: ResizeObserver | null = null;

        const scheduleStickToBottom = () => {
            if (disposed) return;
            if (bottomScrollFrame) window.cancelAnimationFrame(bottomScrollFrame);
            bottomScrollFrame = window.requestAnimationFrame(() => {
                bottomScrollFrame = 0;
                if (disposed) return;
                const el = scrollRef.current;
                if (el && (shouldAutoStick?.() ?? true)) {
                    const target = Math.max(0, el.scrollHeight - el.clientHeight);
                    if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target;
                }
            });
        };

        const measure = () => {
            frame = 0;
            if (disposed) return;
            const overlay = findBottomOverlay(wrapper);
            if (!overlay) {
                wrapper.style.removeProperty(CHAT_BOTTOM_RESERVE_CSS_VAR);
                return;
            }

            const el = scrollRef.current;
            const wasNearBottom = el
                ? el.scrollHeight - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_THRESHOLD
                : false;
            const height = Math.ceil(overlay.getBoundingClientRect().height);

            if (height > 0) {
                wrapper.style.setProperty(CHAT_BOTTOM_RESERVE_CSS_VAR, `${height}px`);
            } else {
                wrapper.style.removeProperty(CHAT_BOTTOM_RESERVE_CSS_VAR);
            }

            if (wasNearBottom && (shouldAutoStick?.() ?? true)) scheduleStickToBottom();
        };

        const requestMeasure = () => {
            if (disposed) return;
            if (frame) window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(measure);
        };

        const overlay = findBottomOverlay(wrapper);
        if (overlay && typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver(requestMeasure);
            observer.observe(overlay);
        }

        measure();
        window.addEventListener("resize", requestMeasure);
        window.visualViewport?.addEventListener("resize", requestMeasure);
        window.visualViewport?.addEventListener("scroll", requestMeasure);

        return () => {
            disposed = true;
            if (frame) window.cancelAnimationFrame(frame);
            if (bottomScrollFrame) window.cancelAnimationFrame(bottomScrollFrame);
            observer?.disconnect();
            window.removeEventListener("resize", requestMeasure);
            window.visualViewport?.removeEventListener("resize", requestMeasure);
            window.visualViewport?.removeEventListener("scroll", requestMeasure);
        };
    }, [wrapperRef, scrollRef, refreshKey, shouldAutoStick]);
}
