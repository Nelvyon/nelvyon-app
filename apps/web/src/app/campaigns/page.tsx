"use client";

import React from "react";
import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { CampaignList } from "@/features/campaigns/components/CampaignList";
import { useCampaigns } from "@/features/campaigns/hooks";

export default function CampaignsListPage() {
  const { user } = useAuth();
  const mode = getBrandMode();
  const isClientMode = mode === "client";
  const appName = getBrandAppName(mode);
  const query = useCampaigns();
  const canCreate = isClientMode ? false : user ? canPerformAction(user.role, "campaigns", "create") : false;

  return (
    <ProtectedLayout module="campaigns">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canCreate && (
            <Button asChild>
              <Link href="/campaigns/new">Create campaign</Link>
            </Button>
          )}
        </div>

        {query.isLoading && <SkeletonListRows aria-label="Loading campaigns" rows={7} />}
        {query.isFetching && query.data ? (
          <p className="text-xs text-muted-foreground">
            {isClientMode ? "Refreshing projects for this account…" : "Refreshing campaigns for current workspace…"}
          </p>
        ) : null}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>
              {isClientMode
                ? "Projects are not available for this account access."
                : `${appName} cannot open projects for this workspace with your current role or workspace selection.`}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isClientMode
                ? "Next: ask your account owner to enable Projects for this portal access."
                : "Next: switch workspace in the header or ask an admin for campaigns view permissions."}
            </p>
          </ForbiddenNotice>
        )}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) && (
          <ErrorNotice>
            <p>
              {isClientMode
                ? "Cause: projects request failed before rows could load for this account."
                : "Cause: campaigns request failed before rows could load for this workspace."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isClientMode
                ? "Next: confirm network and account session, then refresh this page."
                : "Next: confirm network + workspace header, then refresh; re-authenticate if needed."}
            </p>
          </ErrorNotice>
        )}
        {query.data && <CampaignList items={query.data.items} showCreateCta={canCreate} />}
      </div>
    </ProtectedLayout>
  );
}
