import type { Evidence } from "@/lib/types";
import { getPublicEvidenceUrl } from "@/lib/public-evidence";
export function EvidenceGallery({ items, compact = false }: {
    items: Evidence[];
    compact?: boolean;
}) {
    if (!items.length)
        return <div className="empty">Chưa có ảnh.</div>;
    return <div className={`evidence-grid ${compact ? "compact" : ""}`}>{items.map((e) => {
            const publicUrl = getPublicEvidenceUrl(e);
            return <article className="evidence-card" key={e.id}><a href={publicUrl} target="_blank" rel="noreferrer" title="Mở ảnh"><img src={`/api/evidence/${e.id}`} alt={e.file_name}/></a>{!compact && <div><b>{e.file_name}</b><br />{Math.round(e.size_bytes / 1024)} KB<div className="evidence-actions"><a className="content-link" href={publicUrl} target="_blank" rel="noreferrer">Mở ảnh</a></div></div>}</article>;
        })}</div>;
}

