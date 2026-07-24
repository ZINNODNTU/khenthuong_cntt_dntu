import type { Evidence } from "@/lib/types";
import { getPublicEvidenceUrl } from "@/lib/public-evidence";

export function EvidenceGallery({ items, compact = false }: { items: Evidence[]; compact?: boolean }) {
  if (!items.length) return <div className="empty-state"><p className="text-sm text-secondary">Chưa có ảnh.</p></div>;

  return (
    <div className={`image-grid ${compact ? "compact" : ""}`}>
      {items.map((e) => {
        const publicUrl = getPublicEvidenceUrl(e);
        return (
          <article className="image-tile" key={e.id}>
            <a href={publicUrl} target="_blank" rel="noreferrer" title="Mở ảnh">
              <img src={`/api/evidence/${e.id}`} alt={e.file_name} loading="lazy" />
            </a>
            {!compact && (
              <div style={{ padding: "var(--space-2)" }}>
                <div className="font-medium text-sm">{e.file_name}</div>
                <div className="text-xs text-secondary">{Math.round(e.size_bytes / 1024)} KB</div>
                <a href={publicUrl} target="_blank" rel="noreferrer" className="text-xs" style={{ color: "var(--color-primary)" }}>
                  Mở ảnh
                </a>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
