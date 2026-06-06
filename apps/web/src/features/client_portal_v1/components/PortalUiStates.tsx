"use client";

import type { ReactNode } from "react";

import { cn } from "@/core/ui/utils";
import { portalDeliverableStatusLabel } from "@/features/client_portal_v1/constants";
import type { PortalDeliverableStatus } from "@/features/client_portal_v1/types";

const STATUS_STYLES: Record<PortalDeliverableStatus, string> = {
  published: "bg-amber-500/15 text-amber-800 border-amber-500/30",
  approved_by_client: "bg-emerald-500/15 text-emerald-800 border-emerald-500/30",
  changes_requested: "bg-orange-500/15 text-orange-900 border-orange-500/30",
};

export function PortalStatusBadge({ status }: { status: string }) {
  const style =
    status in STATUS_STYLES
      ? STATUS_STYLES[status as PortalDeliverableStatus]
      : "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        style,
      )}
    >
      {portalDeliverableStatusLabel(status)}
    </span>
  );
}

export function PortalEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center shadow-card">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PortalLoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-muted-foreground" role="status">
      <span
        aria-hidden
        className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground"
      />
      <span>{message}</span>
    </div>
  );
}

export function PortalErrorState({
  title = "Could not load data",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/35 bg-destructive/10 px-4 py-4 text-sm" role="alert">
      <p className="font-semibold text-destructive">{title}</p>
      {message ? <p className="mt-1 text-destructive/90">{message}</p> : null}
      {onRetry ? (
        <button
          type="button"
          className="mt-3 text-sm font-medium text-link underline"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
