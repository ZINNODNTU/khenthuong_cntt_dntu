"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb-nav">
      <ol className="breadcrumb-list">
        <li className="breadcrumb-item">
          <Link href="/dashboard" className="breadcrumb-link" aria-label="Trang chủ">
            <Home size={14} />
          </Link>
          <ChevronRight size={12} className="breadcrumb-sep" aria-hidden="true" />
        </li>
        {items.map((item, i) => (
          <li key={i} className="breadcrumb-item">
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="breadcrumb-link">{item.label}</Link>
            ) : (
              <span className="breadcrumb-current" aria-current="page">{item.label}</span>
            )}
            {i < items.length - 1 && <ChevronRight size={12} className="breadcrumb-sep" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
