"use client";

import { createContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

export const ImessagePresentation = createContext({ enabled: false, voiceTranscript: false });

// Read the theme's opt-in after SessionCustomCSS has injected scoped styles.
// Old themes do not opt in. No global setting or persistent data is modified.
export function useImessagePresentation(ref: RefObject<HTMLElement | null>, css: string, sessionId: string) {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const s = ref.current && getComputedStyle(ref.current);
            setEnabled(s?.getPropertyValue("--im-theme").trim() === "1" && s.getPropertyValue("--im-presentation").trim() === "1");
        });
        return () => cancelAnimationFrame(frame);
    }, [ref, css, sessionId]);
    return enabled;
}

const interactive = 'a,button,input,textarea,select,summary,[contenteditable="true"],[role="button"],[role="link"],[data-chat-plugin-slot]';
export function TranslationBody({ expanded, onToggle, controls, children }: { expanded: boolean; onToggle: () => void; controls: string; children: ReactNode }) {
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
            clear(); timer.current = setTimeout(() => { timer.current = null; if (!selecting()) onToggle(); }, 250);
        }}
        onKeyDown={e => {
            if (e.target !== e.currentTarget || selecting() || e.repeat) return;
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); clear(); onToggle(); }
        }}>
        {children}
    </div>;
}
