"use client";

import Link from "next/link";
import { use } from "react";

import { PortalDeliverableDownloadButton } from "@/features/client_portal_v1/components/PortalDeliverableDownloadButton";
import { PortalDeliverableReviewPanel } from "@/features/client_portal_v1/components/PortalDeliverableReviewPanel";
import { PortalPageShell } from "@/features/client_portal_v1/components/PortalPageShell";
import {
  PortalErrorState,
  PortalLoadingState,
  PortalStatusBadge,
} from "@/features/client_portal_v1/components/PortalUiStates";
import { usePortalDeliverable } from "@/features/client_portal_v1/hooks";

export default function PortalDeliverableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const query = usePortalDeliverable(id);

  return (
    <PortalPageShell
      title={query.data?.title ?? "Deliverable"}
      description={query.data?.description ?? undefined}
      backHref="/portal/deliverables"
    >
      {query.isLoading ? <PortalLoadingState message="Loading deliverable…" /> : null}
      {query.isError ? (
        <PortalErrorState
          title="Deliverable not found"
          message={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <PortalStatusBadge status={query.data.status} />
            <span className="text-sm text-muted-foreground">Version {query.data.version}</span>
            {query.data.published_at ? (
              <span className="text-sm text-muted-foreground">
                Published {new Date(query.data.published_at).toLocaleString()}
              </span>
            ) : null}
          </div>

          {query.data.has_file ?? Boolean(query.data.file_url) ? (
            <PortalDeliverableDownloadButton
              deliverableId={query.data.id}
              title={query.data.title}
            />
          ) : null}

          <p className="text-sm text-muted-foreground">
            Project:{" "}
            <Link className="text-link underline" href={`/portal/projects/${query.data.project_id}`}>
              View project
            </Link>
          </p>

          <PortalDeliverableReviewPanel deliverable={query.data} />
        </div>
      ) : null}
    </PortalPageShell>
  );
}
