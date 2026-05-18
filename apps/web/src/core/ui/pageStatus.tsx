"use client";

import type { ReactNode } from "react";

import { cn } from "@/core/ui/utils";

interface PageLoadingProps {
  /** Short line shown next to the spinner. */
  message?: string;
}

/** Full-page wait (shell visible): spinner remains appropriate here. */
export function PageLoading({ message = "Loading your NELVYON workspace data…" }: PageLoadingProps) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-muted-foreground" role="status" aria-live="polite">
      <span
        aria-hidden
        className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-foreground"
      />
      <span>{message}</span>
    </div>
  );
}

/** Narrow inline spinner (legacy / rare); prefer skeletons for layout blocks. */
export function BlockLoading({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground" role="status" aria-live="polite">
      <span
        aria-hidden
        className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-muted border-t-foreground"
      />
      <span>{message}</span>
    </div>
  );
}

const noticeRoot = "rounded-lg border px-4 py-3.5 text-sm leading-relaxed shadow-card";
const noticeTitle = "text-base font-semibold tracking-tight";
const noticeBody = "mt-2 space-y-2 text-sm";

interface NoticeProps {
  title?: string;
  children: ReactNode;
}

export function ForbiddenNotice({ title = "Access restricted", children }: NoticeProps) {
  return (
    <div
      className={cn(noticeRoot, "border-warning/40 bg-warning/10 text-warning-foreground")}
      role="alert"
    >
      <p className={noticeTitle}>{title}</p>
      <div className={cn(noticeBody, "text-warning-foreground/95")}>{children}</div>
    </div>
  );
}

export function ErrorNotice({ title = "Something went wrong", children }: NoticeProps) {
  return (
    <div className={cn(noticeRoot, "border-destructive/35 bg-destructive/10 text-destructive")} role="alert">
      <p className={noticeTitle}>{title}</p>
      <div className={cn(noticeBody, "text-destructive/95")}>{children}</div>
    </div>
  );
}
