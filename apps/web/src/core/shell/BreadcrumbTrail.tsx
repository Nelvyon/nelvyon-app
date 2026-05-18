"use client";

import Link from "next/link";

import { BreadcrumbItem } from "@/core/shell/breadcrumbTypes";

export function BreadcrumbTrail({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li className="flex items-center gap-1" key={item.key}>
              {index > 0 ? <span aria-hidden className="px-1 text-muted-foreground/70">/</span> : null}
              {item.href && !isLast ? (
                <Link className="text-link transition-colors hover:text-link-hover hover:underline" href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "font-medium text-foreground" : "text-muted-foreground"}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
