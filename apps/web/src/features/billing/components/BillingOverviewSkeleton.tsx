"use client";

import React from "react";

import { Skeleton } from "@/core/ui/Skeleton";

/** Placeholder layout for /billing while summary, usage, and invoices load. */
export function BillingOverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading billing overview" className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4 shadow-card">
        <Skeleton className="h-5 w-40" />
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="space-y-2" key={i}>
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 shadow-card">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-2 h-3 w-64" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="space-y-2" key={i}>
              <div className="flex justify-between gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-4 w-40" />
        <div className="mt-2 overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-5 gap-0 border-b border-border bg-muted p-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton className="h-3 w-16" key={i} />
            ))}
          </div>
          {Array.from({ length: 5 }, (_, i) => (
            <div className="grid grid-cols-5 border-b border-border p-2 last:border-0" key={i}>
              {Array.from({ length: 5 }, (_, j) => (
                <Skeleton className="h-3 w-14" key={j} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-64" />
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
          <ul className="divide-y divide-border">
            {Array.from({ length: 5 }, (_, i) => (
              <li className="flex items-center justify-between gap-2 px-3 py-3" key={i}>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Usage + table block while usage query is in flight. */
export function BillingUsageSectionSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading usage" className="space-y-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-48" />
      <div className="mt-2 space-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div className="space-y-2" key={i}>
            <div className="flex justify-between gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-4 w-40" />
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="grid grid-cols-5 gap-0 border-b border-border bg-muted p-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton className="h-3 w-16" key={i} />
          ))}
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div className="grid grid-cols-5 border-b border-border p-2 last:border-0" key={i}>
            {Array.from({ length: 5 }, (_, j) => (
              <Skeleton className="h-3 w-14" key={j} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
