"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { getChatImageFromIndexedDB } from "@/lib/chat-asset-storage";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { assetId: string; fallbackSrc?: string };

/** Visibility-scoped thumbnail with no global image-map retention for old notes. */
export function XhsLazyImage({ assetId, fallbackSrc, ...props }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState<string | null>(fallbackSrc ?? null);
  useEffect(() => {
    let alive = true;
    let visible = false;
    let ticket = 0;
    const target = imgRef.current;
    setSrc(fallbackSrc || null);
    if (!target || !assetId || fallbackSrc) return () => { alive = false; };
    const load = () => {
      const current = ++ticket;
      getChatImageFromIndexedDB(assetId).then(value => {
        if (alive && visible && current === ticket) setSrc(value);
      }).catch(() => undefined);
    };
    if (typeof IntersectionObserver === "undefined") {
      visible = true; load();
      return () => { alive = false; ticket += 1; };
    }
    const observer = new IntersectionObserver(entries => {
      const next = entries.some(entry => entry.isIntersecting);
      if (next === visible) return;
      visible = next;
      if (next) load();
      else { ticket += 1; setSrc(null); }
    }, { rootMargin: "400px" });
    observer.observe(target);
    return () => { alive = false; ticket += 1; observer.disconnect(); };
  }, [assetId, fallbackSrc]);
  return <img {...props} ref={imgRef} src={src ?? undefined} loading="lazy" decoding="async" />;
}
