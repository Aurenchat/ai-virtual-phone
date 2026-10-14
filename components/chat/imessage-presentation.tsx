"use client";

import { createContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";

type ImessagePresentationValue = {
    enabled: boolean;
    voiceTranscript: boolean;
    beforeTranslationToggle?: (target: HTMLElement) => (() => void) | undefined;
};
export const ImessagePresentation = createContext<ImessagePresentationValue>({ enabled: false, voiceTranscript: false });

// Resolve scoped CSS opt-in during the commit's layout phase, before paint.
// Waiting for rAF exposed an expanded non-iMessage translation for one frame.
// Old themes remain opt-out; this only reads computed CSS, never stores settings.
export function useImessagePresentation(ref: RefObject<HTMLElement | null>, css: string, sessionId: string) {
    const [enabled, setEnabled] = useState(false);
    useLayoutEffect(() => {
        const s = ref.current && getComputedStyle(ref.current);
        setEnabled(s?.getPropertyValue("--im-theme").trim() === "1" && s.getPropertyValue("--im-presentation").trim() === "1");
    }, [ref, css, sessionId]);
    return enabled;
}

const interactive = 'a,button,input,textarea,select,summary,[contenteditable="true"],[role="button"],[role="link"],[data-chat-plugin-slot]';
export function TranslationBody({ expanded, onToggle, controls, children }: { expanded: boolean; onToggle: (target: HTMLElement) => void; controls: string; children: ReactNode }) {
    const gesture = useRef({ x: 0, y: 0, time: 0, blocked: false });
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    const selecting = () => !!window.getSelection()?.toString();
    const excluded = (target: EventTarget, root: HTMLElement) => {
        const el = target instanceof Element ? target.closest(interactive) : null;
        return !!el && el !== root;
    };
    return <div className="im-bilingual-original" data-im-text-body="" role="button" tabIndex={0}
        aria-label={expanded ? "收起中文翻译" : "展开中文翻译"} aria-expanded={expanded} aria-controls={controls}
        onPointerDownCapture={e => { clear(); gesture.current = { x: e.clientX, y: e.clientY, time: performance.now(), blocked: e.button !== 0 || excluded(e.target, e.currentTarget) }; }}
        onPointerMoveCapture={e => { if (Math.hypot(e.clientX - gesture.current.x, e.clientY - gesture.current.y) > 6) gesture.current.blocked = true; }}
        onPointerUpCapture={() => { if (performance.now() - gesture.current.time >= 450 || selecting()) gesture.current.blocked = true; }}
        onPointerCancelCapture={() => { clear(); gesture.current.blocked = true; }}
        onContextMenuCapture={() => { clear(); gesture.current.blocked = true; }}
        onDoubleClickCapture={() => { clear(); gesture.current.blocked = true; }}
        onClick={e => {
            if (e.defaultPrevented || excluded(e.target, e.currentTarget) || gesture.current.blocked || selecting() || e.detail > 1 || e.currentTarget.closest('[data-active]')) return;
            // Allow double-click selection to cancel the pending single click.
            // React events are no longer current after the 250ms timer.
            const target = e.currentTarget;
            clear(); timer.current = setTimeout(() => { timer.current = null; if (!selecting()) onToggle(target); }, 250);
        }}
        onKeyDown={e => {
            if (e.target !== e.currentTarget || selecting() || e.repeat) return;
            if (e.key === "Enter" || e.key === " ") {
                // This focused control consumes the key as a translation toggle.
                // Without stopping propagation, ChatScrollStability's window
                // keydown listener treats Space as a request to rejoin bottom.
                e.preventDefault();
                e.stopPropagation();
                clear();
                onToggle(e.currentTarget);
            }
        }}>
        {children}
    </div>;
}
