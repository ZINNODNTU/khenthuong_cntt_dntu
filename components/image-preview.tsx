"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Loader2, AlertTriangle } from "lucide-react";

type ImageData = {
  src: string;
  alt: string;
  caption?: string;
};

export function ImagePreview({
  images,
  initialIndex = 0,
  onClose,
  thumbnailRef,
}: {
  images: ImageData[];
  initialIndex?: number;
  onClose: () => void;
  thumbnailRef?: HTMLElement | null;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const single = images.length <= 1;
  const current = images[index];

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  // Focus trap & restore
  useEffect(() => {
    closeBtnRef.current?.focus();
    const prev = document.activeElement as HTMLElement | null;
    return () => { prev?.focus(); };
  }, []);

  useEffect(() => {
    setScale(1);
    setRotation(0);
    setLoaded(false);
    setError(false);
  }, [index]);

  useEffect(() => {
    if (!current) return;
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => { setError(true); setLoaded(true); };
    img.src = current.src;
  }, [current]);

  const goPrev = useCallback(() => {
    if (!single) setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  }, [single, images.length]);

  const goNext = useCallback(() => {
    if (!single) setIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  }, [single, images.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft" && !single) goPrev();
      if (e.key === "ArrowRight" && !single) goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, goPrev, goNext, single]);

  // Wheel zoom
  useEffect(() => {
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      setScale((s) => Math.max(0.5, Math.min(3, s - e.deltaY * 0.002)));
    }
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  if (!current) return null;

  return (
    <div
      className="image-viewer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={"Xem ảnh" + (current.alt ? ": " + current.alt : "")}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* Top bar */}
      <div className="image-viewer-topbar">
        {!single && (
          <span className="image-viewer-counter">{index + 1} / {images.length}</span>
        )}
        <div className="image-viewer-actions">
          <button type="button" className="image-viewer-btn" onClick={() => setScale((s) => Math.min(s + 0.5, 3))} aria-label="Phóng to"><ZoomIn size={18} /></button>
          <button type="button" className="image-viewer-btn" onClick={() => setScale((s) => Math.max(s - 0.5, 0.5))} aria-label="Thu nhỏ"><ZoomOut size={18} /></button>
          <button type="button" className="image-viewer-btn" onClick={() => setRotation((r) => (r + 90) % 360)} aria-label="Xoay ảnh"><RotateCcw size={18} /></button>
          <button ref={closeBtnRef} type="button" className="image-viewer-btn image-viewer-close" onClick={close} aria-label="Đóng"><X size={20} /></button>
        </div>
      </div>

      {/* Nav arrows */}
      {!single && (
        <>
          <button type="button" className="image-viewer-nav image-viewer-nav-prev" onClick={goPrev} aria-label="Ảnh trước"><ChevronLeft size={28} /></button>
          <button type="button" className="image-viewer-nav image-viewer-nav-next" onClick={goNext} aria-label="Ảnh sau"><ChevronRight size={28} /></button>
        </>
      )}

      {/* Image area */}
      <div className="image-viewer-body">
        {!loaded && !error && (
          <div className="image-viewer-loader">
            <Loader2 size={32} className="spin" />
            <span className="text-sm">Đang tải ảnh…</span>
          </div>
        )}
        {error && (
          <div className="image-viewer-error">
            <AlertTriangle size={32} />
            <span>Không thể tải ảnh.</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setLoaded(false); setError(false); }}>Thử lại</button>
          </div>
        )}
        <img
          src={current.src}
          alt={current.alt}
          className={"image-viewer-img" + (loaded ? " loaded" : "")}
          style={{ transform: "scale(" + scale + ") rotate(" + rotation + "deg)" }}
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(true); }}
        />
      </div>

      {/* Caption */}
      {current.caption && (
        <div className="image-viewer-caption">{current.caption}</div>
      )}
    </div>
  );
}

export function useImageViewer() {
  const [viewerState, setViewerState] = useState<{
    images: ImageData[];
    index: number;
  } | null>(null);
  const thumbnailRef = useRef<HTMLElement | null>(null);

  const open = useCallback((images: ImageData[], index = 0, ref?: HTMLElement | null) => {
    thumbnailRef.current = ref || null;
    setViewerState({ images, index });
  }, []);

  const close = useCallback(() => {
    setViewerState(null);
  }, []);

  const viewer = viewerState ? (
    <ImagePreview
      images={viewerState.images}
      initialIndex={viewerState.index}
      onClose={close}
      thumbnailRef={thumbnailRef.current}
    />
  ) : null;

  return { open, close, viewer };
}
