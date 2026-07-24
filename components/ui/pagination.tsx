import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

function pageWindow(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  return [...new Set([1, total, current - 1, current, current + 1])]
    .filter((page) => page > 0 && page <= total)
    .sort((a, b) => a - b);
}

export function Pagination({ page, totalItems, pageSize, pathname, query }: {
  page: number;
  totalItems: number;
  pageSize: number;
  pathname: string;
  query?: Record<string, string | undefined>;
}) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  function href(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value && key !== "page") params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const suffix = params.toString();
    return suffix ? `${pathname}?${suffix}` : pathname;
  }

  const pages = pageWindow(page, totalPages);

  return (
    <nav className="pagination" aria-label="Phân trang">
      <span className="pagination-info">
        {`${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)} / ${totalItems}`}
      </span>
      <div className="pagination-buttons">
        <Link href={page > 1 ? href(page - 1) : href(1)} className={`pagination-btn${page <= 1 ? " is-disabled" : ""}`} aria-label="Trang trước" aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined}>
          <ChevronLeft size={16} aria-hidden="true" />
        </Link>
        {pages.map((item, index) => {
          const previous = pages[index - 1];
          return (
            <span className="pagination-page-group" key={item}>
              {previous && item - previous > 1 && <span className="pagination-ellipsis" aria-hidden="true">…</span>}
              <Link href={href(item)} className={`pagination-btn${item === page ? " pagination-btn-active" : ""}`} aria-label={`Trang ${item}`} aria-current={item === page ? "page" : undefined}>
                {item}
              </Link>
            </span>
          );
        })}
        <Link href={page < totalPages ? href(page + 1) : href(totalPages)} className={`pagination-btn${page >= totalPages ? " is-disabled" : ""}`} aria-label="Trang sau" aria-disabled={page >= totalPages} tabIndex={page >= totalPages ? -1 : undefined}>
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
}
