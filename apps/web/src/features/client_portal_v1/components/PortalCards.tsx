"use client";

import Link from "next/link";

import {
  portalDeliverableStatusLabel,
  portalDeliverableTypeLabel,
  portalProjectStatusLabel,
} from "@/features/client_portal_v1/constants";
import { PortalStatusBadge } from "@/features/client_portal_v1/components/PortalUiStates";
import type { PortalDeliverable } from "@/features/client_portal_v1/types";

export function PortalDeliverableCard({ item }: { item: PortalDeliverable }) {
  const typeLabel = portalDeliverableTypeLabel(item.type);

  return (
    <Link
      href={`/portal/deliverables/${item.id}`}
      className="block rounded-lg border border-border bg-card p-4 shadow-card transition hover:border-primary/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{typeLabel}</p>
          <p className="font-medium text-foreground">{item.title}</p>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
          ) : null}
        </div>
        <PortalStatusBadge status={item.status} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Versión {item.version}
        {item.published_at
          ? ` · Publicado ${new Date(item.published_at).toLocaleDateString("es-ES")}`
          : ""}
      </p>
    </Link>
  );
}

export function PortalProjectCard({
  id,
  name,
  description,
  status,
}: {
  id: string;
  name: string;
  description?: string | null;
  status: string;
}) {
  return (
    <Link
      href={`/portal/projects/${id}`}
      className="block rounded-lg border border-border bg-card p-4 shadow-card transition hover:border-primary/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-foreground">{name}</p>
        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {portalProjectStatusLabel(status)}
        </span>
      </div>
      {description ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </Link>
  );
}
