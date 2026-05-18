"use client";

import React from "react";

import { Skeleton } from "@/core/ui/Skeleton";

/** Placeholder layout for /os while automation stats and samples load. */
export function OsOverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading operations overview" className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4 shadow-card">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-3 h-3 w-full max-w-2xl" />
      </div>
      <div className="rounded-lg border border-border bg-card p-4 shadow-card">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="mt-2 h-3 max-w-xl" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="rounded-md border border-border bg-muted/50 p-3" key={i}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 2 }, (_, i) => (
          <div className="rounded-lg border border-border bg-card p-4 shadow-card" key={i}>
            <Skeleton className="h-4 w-64" />
            <Skeleton className="mt-2 h-3 w-full max-w-xl" />
            <Skeleton className="mt-4 h-8 w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="rounded-lg border border-border bg-card p-3 shadow-card" key={i}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-20" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-52" />
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
          <ul className="divide-y divide-border">
            {Array.from({ length: 6 }, (_, i) => (
              <li className="flex items-center justify-between gap-2 px-3 py-3" key={i}>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-12" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
