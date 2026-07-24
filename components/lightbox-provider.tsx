"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    src: string;
    alt: string;
    publicUrl: string;
  } | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const close = useCallback(() => {
    setState(null);
    setScale(1);
    setRotation(0);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a[href*='/api/evidence/']");
      if (!anchor) return;
      const img = anchor.querySelector("img");
      if (!img) return;
      e.preventDefault();
      setState({
        src: img.src,
        alt: img.alt,
        publicUrl: anchor.getAttribute("href") || img.src,
      });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!state) return;
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  useEffect(() => {
    if (!state) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [state]);

  return (
    <>
      {children}

      {state && (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={"Xem ảnh: " + state.alt}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="lightbox-toolbar">
            <button type="button" className="lightbox-btn" onClick={() => setScale((s) => Math.min(s + 0.5, 3))} aria-label="Phóng to">
              <ZoomIn size={20} />
            </button>
            <button type="button" className="lightbox-btn" onClick={() => setScale((s) => Math.max(s - 0.5, 0.5))} aria-label="Thu nhỏ">
              <ZoomOut size={20} />
            </button>
            <button type="button" className="lightbox-btn" onClick={() => setRotation((r) => (r + 90) % 360)} aria-label="Xoay ảnh">
              <RotateCcw size={20} />
            </button>
            <a href={state.publicUrl} target="_blank" rel="noreferrer" className="lightbox-btn lightbox-open-link" aria-label="Mở trong tab mới">
              Mở
            </a>
            <button type="button" className="lightbox-btn lightbox-btn-close" onClick={close} aria-label="Đóng">
              <X size={20} />
            </button>
          </div>
          <div className="lightbox-image-wrap">
            <img
              src={state.src}
              alt={state.alt}
              className="lightbox-image"
              style={{ transform: "scale(" + scale + ") rotate(" + rotation + "deg)" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
