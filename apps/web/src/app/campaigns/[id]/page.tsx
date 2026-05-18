"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { getBrandMode } from "@/core/platform/brand";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonDetailCard } from "@/core/ui/Skeleton";
import { CampaignDetailCard } from "@/features/campaigns/components/CampaignDetailCard";
import { CampaignForm } from "@/features/campaigns/components/CampaignForm";
import { CampaignStatusForm } from "@/features/campaigns/components/CampaignStatusForm";
import { useCampaign, useUpdateCampaign } from "@/features/campaigns/hooks";
import { CampaignCreateInput, CampaignUpdateInput } from "@/features/campaigns/types";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const { user } = useAuth();
  const isClientMode = getBrandMode() === "client";
  const query = useCampaign(id);
  const updateMutation = useUpdateCampaign(id);
  const canEdit = isClientMode ? false : user ? canPerformAction(user.role, "campaigns", "edit") : false;
  const invalidId = !Number.isFinite(id) || id <= 0;

  const onUpdate = async (values: CampaignCreateInput) => {
    const payload: CampaignUpdateInput = {
      project_id: values.project_id,
      platform: values.platform,
      campaign_type: values.campaign_type,
      ...(values.client_id !== undefined ? { client_id: values.client_id } : {}),
      ...(values.name !== undefined ? { name: values.name } : {}),
      ...(values.content !== undefined ? { content: values.content } : {}),
      ...(values.target_audience !== undefined ? { target_audience: values.target_audience } : {}),
      ...(values.status !== undefined ? { status: values.status } : {}),
    };
    await updateMutation.mutateAsync(payload);
  };

  return (
    <ProtectedLayout module="campaigns">
      <div className="space-y-5">
        <Button asChild size="sm" variant="outline">
          <Link href="/campaigns">{isClientMode ? "Back to projects" : "Back to campaigns"}</Link>
        </Button>

        {invalidId ? (
          <ErrorNotice title="Invalid project id">
            <p>Cause: this route does not contain a valid numeric project identifier.</p>
            <p className="mt-2 text-sm text-muted-foreground">Next: return to Projects and open a valid row.</p>
          </ErrorNotice>
        ) : null}
        {query.isLoading && (
          <>
            <p className="text-sm text-muted-foreground">{isClientMode ? "Loading project details…" : "Loading campaign details…"}</p>
            <SkeletonDetailCard />
          </>
        )}
        {query.isFetching && query.data ? (
          <p className="text-xs text-muted-foreground">
            {isClientMode ? "Refreshing project detail for this account…" : "Refreshing campaign detail for current workspace…"}
          </p>
        ) : null}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>
              {isClientMode
                ? "Cause: this project is not available for your account access."
                : "Cause: this campaign is outside your current role/workspace visibility scope."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isClientMode
                ? "Next: ask your account owner to share this project in portal scope."
                : "Next: switch workspace in the header or ask an admin for campaigns view permissions."}
            </p>
          </ForbiddenNotice>
        )}
        {query.error instanceof ApiError && query.error.status === 404 && (
          <ErrorNotice title={isClientMode ? "Project not found" : "Campaign not found"}>
            <p>
              {isClientMode
                ? "Cause: this project is not available for your account, or no longer exists."
                : "Cause: this campaign id is not available in the current workspace scope."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: return to {isClientMode ? "Projects" : "Campaigns"} and open it again from the list.
            </p>
          </ErrorNotice>
        )}
        {query.error &&
          !(query.error instanceof ApiError && (query.error.status === 403 || query.error.status === 404)) && (
          <ErrorNotice>
            <p>
              {isClientMode
                ? "Cause: this project could not be loaded due to a temporary connection or service issue."
                : "Cause: campaign detail request failed unexpectedly."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isClientMode
                ? "Next: refresh this page and verify account session access."
                : "Next: refresh once; if it persists, confirm workspace header and API/session health."}
            </p>
          </ErrorNotice>
        )}

        {query.data && (
          <>
            <CampaignDetailCard campaign={query.data} />
            {!isClientMode ? (
              <>
                <section className="space-y-2">
                  <h2 className="text-base font-medium text-foreground">Status / launch</h2>
                  <CampaignStatusForm
                    canSubmit={canEdit}
                    currentStatus={query.data.status}
                    isSubmitting={updateMutation.isPending}
                    onSubmit={async (status) => {
                      await updateMutation.mutateAsync({ status });
                    }}
                  />
                </section>
                <section className="space-y-2">
                  <h2 className="text-base font-medium text-foreground">Edit fields</h2>
                  <CampaignForm
                    canSubmit={canEdit}
                    initialValues={{
                      project_id: query.data.project_id,
                      client_id: query.data.client_id ?? undefined,
                      platform: query.data.platform,
                      campaign_type: query.data.campaign_type,
                      name: query.data.name ?? undefined,
                      content: query.data.content ?? undefined,
                      target_audience: query.data.target_audience ?? undefined,
                      status: query.data.status ?? undefined,
                    }}
                    isSubmitting={updateMutation.isPending}
                    onSubmit={onUpdate}
                    submitLabel="Update campaign"
                  />
                </section>
              </>
            ) : null}
            {updateMutation.isSuccess && !isClientMode ? (
              <p className="text-xs text-success-foreground">Saved and synced from persisted campaign detail.</p>
            ) : null}
            {updateMutation.error instanceof ApiError && updateMutation.error.status === 403 && (
              <p className="text-sm text-warning-foreground">
                Save blocked: your role cannot update this campaign in the current workspace. Next: ask an admin/operator to apply edits.
              </p>
            )}
            {updateMutation.error &&
              !(updateMutation.error instanceof ApiError && updateMutation.error.status === 403) && (
                <p className="text-sm text-destructive">
                  Save failed. Next: retry once; if it fails again, refresh detail and submit changes again.
                </p>
              )}
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
