"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { readXiaohongshuFullImage } from "@/lib/xiaohongshu-image-assets";
import { getChatImageFromIndexedDB } from "@/lib/chat-asset-storage";

type Props = {
  imageIds: string[];
  initialIndex: number;
  onClose: () => void;
};

/** Render one high-resolution resource at a time. It is freed on image change/close. */
export function XiaohongshuImageViewer({ imageIds, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(Math.min(imageIds.length - 1, Math.max(0, initialIndex)));
  const [src, setSrc] = useState<string | null>(null);
  const [srcId, setSrcId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const scaleRef = useRef(1);
  const imageEpoch = useRef(0);
  const objectUrlRef = useRef<string | null>(null);
  const hadPinch = useRef(false);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const touchPointer = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const historyToken = useRef(`xhs-viewer-${Date.now()}-${Math.random()}`);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => { setScale(1); scaleRef.current = 1; setOffset({ x: 0, y: 0 }); pointers.current.clear(); pinch.current = null; lastTap.current = null; }, [index]);

  const currentId = imageIds[index];
  const activeIdRef = useRef(currentId);
  activeIdRef.current = currentId;
  useEffect(() => {
    let live = true;
    const epoch = ++imageEpoch.current;
    setSrc(null); setSrcId(null); setError(""); setFallbackUsed(false);
    const id = currentId;
    if (!id) { setError("找不到这张图片"); return; }
    readXiaohongshuFullImage(id).then(value => {
      if (!live || epoch !== imageEpoch.current) return;
      if (!value) { setError("图片已丢失或未恢复"); return; }
      if (value instanceof Blob) {
        const objectUrl = URL.createObjectURL(value);
        objectUrlRef.current = objectUrl;
        setSrc(objectUrl);
      } else setSrc(value);
      setSrcId(id);
    }).catch(() => { if (live) setError("图片读取失败"); });
    return () => {
      live = false; imageEpoch.current += 1;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    };
  }, [currentId]);

  function requestClose() {
    if (window.history.state?.xhsImageViewer === historyToken.current) window.history.back();
    else onClose();
  }

  useEffect(() => {
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousOverscroll = body.style.overscrollBehavior;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousState = window.history.state;
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    window.history.pushState({ ...previousState, xhsImageViewer: historyToken.current }, "");
    const onBack = (event: PopStateEvent) => { event.stopImmediatePropagation(); onCloseRef.current(); };
    window.addEventListener("popstate", onBack, true);
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      window.removeEventListener("popstate", onBack, true);
      body.style.overflow = previousOverflow;
      body.style.overscrollBehavior = previousOverscroll;
      if (window.history.state?.xhsImageViewer === historyToken.current) window.history.replaceState(previousState, "");
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["Escape", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) e.stopImmediatePropagation();
      if (e.key === "Escape") { e.preventDefault(); requestClose(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setIndex(n => Math.max(0, n - 1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); setIndex(n => Math.min(imageIds.length - 1, n + 1)); }
      if (e.key === "Tab") {
        const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        const active = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = (active + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        e.preventDefault(); buttons[next]?.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [imageIds.length, onClose]);

  if (imageIds.length === 0) return null;
  function handleDecodeError() {
    if (!currentId || fallbackUsed) { setSrc(null); setError("图片格式无法在此设备解码"); return; }
    setFallbackUsed(true);
    const epoch = imageEpoch.current;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    void getChatImageFromIndexedDB(currentId).then(value => {
      if (activeIdRef.current !== currentId || epoch !== imageEpoch.current) return;
      if (value) { setSrc(value); setError("原图格式无法解码，已显示缩略图"); }
      else { setSrc(null); setError("图片格式无法在此设备解码"); }
    }).catch(() => { if (activeIdRef.current === currentId && epoch === imageEpoch.current) { setSrc(null); setError("图片读取失败"); } });
  }
  function changeZoom(next: number) {
    const bounded = Math.max(1, Math.min(4, next));
    scaleRef.current = bounded;
    setScale(bounded);
    if (bounded === 1) setOffset({ x: 0, y: 0 });
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    touchPointer.current = e.pointerType !== "mouse";
    if (pointers.current.size === 1) { touchStart.current = { x: e.clientX, y: e.clientY }; hadPinch.current = false; }
    if (pointers.current.size === 2) {
      hadPinch.current = true; lastTap.current = null;
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: scaleRef.current };
    }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      changeZoom(pinch.current.scale * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.current.distance));
    } else if (pointers.current.size === 1 && scaleRef.current > 1) {
      setOffset(prev => ({ x: prev.x + e.clientX - previous.x, y: prev.y + e.clientY - previous.y }));
    }
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const start = touchStart.current;
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (wasSingle && start && !hadPinch.current) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (scaleRef.current === 1 && Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        setIndex(n => Math.max(0, Math.min(imageIds.length - 1, n + (dx < 0 ? 1 : -1))));
      } else if (touchPointer.current && Math.hypot(dx, dy) < 12) {
        const previous = lastTap.current;
        if (previous && Date.now() - previous.time < 350 && Math.hypot(e.clientX - previous.x, e.clientY - previous.y) < 24) {
          changeZoom(scaleRef.current === 1 ? 2 : 1); lastTap.current = null;
        } else lastTap.current = { time: Date.now(), x: e.clientX, y: e.clientY };
      }
    }
    touchStart.current = null;
  }

  return createPortal(
    <div ref={dialogRef} className="xhs-full-image-viewer" role="dialog" aria-modal="true" aria-label="查看完整图片">
      <div className="xhs-full-image-toolbar">
        <span aria-live="polite">{index + 1} / {imageIds.length}</span>
        <div>
          <button type="button" aria-label="缩小" onClick={() => changeZoom(scale - 0.5)}><ZoomOut size={21} /></button>
          <button type="button" aria-label="放大" onClick={() => changeZoom(scale + 0.5)}><ZoomIn size={21} /></button>
          <button type="button" aria-label="关闭图片" onClick={requestClose}><X size={23} /></button>
        </div>
      </div>
      <div className="xhs-full-image-stage" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerCancel={() => { pointers.current.clear(); pinch.current = null; touchStart.current = null; lastTap.current = null; }}
        onDoubleClick={() => { if (!touchPointer.current) changeZoom(scaleRef.current === 1 ? 2 : 1); }}>
        {src && srcId === currentId ? <img key={currentId} draggable={false} src={src} onError={handleDecodeError} alt={`图片 ${index + 1}`} style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }} /> : <span>{error || "正在加载图片…"}</span>}
      </div>
      {src && error && <span className="xhs-full-image-notice" role="status">{error}</span>}
      {imageIds.length > 1 && <>
        <button type="button" className="xhs-full-image-nav xhs-full-image-nav--left" onClick={() => setIndex(n => Math.max(0, n - 1))} disabled={index === 0} aria-label="上一张"><ChevronLeft size={30} /></button>
        <button type="button" className="xhs-full-image-nav xhs-full-image-nav--right" onClick={() => setIndex(n => Math.min(imageIds.length - 1, n + 1))} disabled={index === imageIds.length - 1} aria-label="下一张"><ChevronRight size={30} /></button>
      </>}
    </div>,
    document.body,
  );
}
