"use client";

import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumb navigation for deep SaaS routes.
 * Renders as a semantic <nav> with aria-label="Breadcrumb".
 */
export function SaasBreadcrumb({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-white/30">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true" className="text-white/15">/</span>}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-white/60 transition-colors focus:outline-none focus-visible:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "text-white/60 font-medium" : ""} aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
