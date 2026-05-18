"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonDetailCard } from "@/core/ui/Skeleton";
import { WebhookActiveForm } from "@/features/automations/components/WebhookActiveForm";
import { WebhookDetailCard } from "@/features/automations/components/WebhookDetailCard";
import { useAutomationWebhook, useUpdateWebhook } from "@/features/automations/hooks";

export default function AutomationWebhookDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const { user } = useAuth();
  const query = useAutomationWebhook(id);
  const updateMutation = useUpdateWebhook(id);
  const canEdit = user ? canPerformAction(user.role, "automations", "edit") : false;

  return (
    <ProtectedLayout module="automations">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/automations/webhooks">Back to webhooks</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/automations/jobs">Jobs</Link>
          </Button>
        </div>

        {query.isLoading && <SkeletonDetailCard />}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>NELVYON blocked access to this webhook for your role or workspace.</p>
          </ForbiddenNotice>
        )}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) && (
          <ErrorNotice>
            <p>We could not load this webhook. It may have been removed, or the request failed.</p>
          </ErrorNotice>
        )}

        {query.data && (
          <>
            <WebhookDetailCard webhook={query.data} />
            <section className="space-y-2">
              <h2 className="text-base font-medium text-foreground">Activation</h2>
              <WebhookActiveForm
                canSubmit={canEdit}
                isActive={query.data.is_active !== false}
                isSubmitting={updateMutation.isPending}
                onSubmit={async (is_active) => {
                  await updateMutation.mutateAsync({ is_active });
                }}
              />
              {updateMutation.error instanceof ApiError && updateMutation.error.status === 403 && (
                <p className="text-sm text-warning-foreground">Your role cannot update this webhook.</p>
              )}
              {updateMutation.error &&
                !(updateMutation.error instanceof ApiError && updateMutation.error.status === 403) && (
                  <p className="text-sm text-destructive">Update failed. Try again shortly.</p>
                )}
            </section>
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
