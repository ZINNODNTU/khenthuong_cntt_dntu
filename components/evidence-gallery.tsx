"use client";

import type { Evidence } from "@/lib/types";
import { getPublicEvidenceUrl } from "@/lib/public-evidence";
import { useImageViewer } from "@/components/image-preview";
import { ImageIcon } from "lucide-react";

export function EvidenceGallery({ items, compact = false }: { items: Evidence[]; compact?: boolean }) {
  const { open, viewer } = useImageViewer();

  if (!items.length) return (
    <div className="empty-state image-gallery-empty">
      <ImageIcon size={32} className="text-secondary" />
      <p className="text-sm text-secondary">Chưa có ảnh.</p>
    </div>
  );

  return (
    <>
      <div className={`image-grid ${compact ? "compact" : ""}`}>
        {items.map((e, i) => {
          const src = `/api/evidence/${e.id}`;
          const publicUrl = getPublicEvidenceUrl(e);
          const allItems = items.map((x, j) => ({
            src: `/api/evidence/${x.id}`,
            alt: x.file_name || "",
            caption: !compact ? `${x.file_name} · ${Math.round(x.size_bytes / 1024)} KB` : undefined,
          }));
          return (
            <article className="image-tile" key={e.id}>
              <button
                type="button"
                className="image-tile-btn"
                onClick={() => open(allItems, i)}
                aria-label={e.file_name || "Xem ảnh"}
              >
                <img src={src} alt={e.file_name || ""} loading="lazy" />
                <span className="image-tile-overlay">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </span>
              </button>
              {!compact && (
                <div className="image-tile-info">
                  <div className="font-medium text-sm truncate">{e.file_name}</div>
                  <div className="text-xs text-secondary">{Math.round(e.size_bytes / 1024)} KB</div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {viewer}
    </>
  );
}
