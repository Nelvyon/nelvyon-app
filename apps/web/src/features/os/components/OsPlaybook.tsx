"use client";

import React from "react";
import Link from "next/link";

import { SectionTitle } from "@/core/ui/typography";
import type { OsPlaybookItem } from "@/features/os/analytics";

export function OsPlaybook({ items }: { items: OsPlaybookItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionTitle>What to check next</SectionTitle>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-card sm:flex-row sm:items-start sm:justify-between"
            key={`${item.href}-${item.title}`}
          >
            <div>
              <p className="font-medium text-foreground">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            </div>
            <Link
              className="inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-card transition-colors hover:bg-muted"
              href={item.href}
            >
              {item.cta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
