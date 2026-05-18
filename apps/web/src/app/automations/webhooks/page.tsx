"use client";

import React from "react";
import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { WebhookList } from "@/features/automations/components/WebhookList";
import { useAutomationWebhooks } from "@/features/automations/hooks";

export default function AutomationWebhooksPage() {
  const query = useAutomationWebhooks();

  return (
    <ProtectedLayout module="automations">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/automations/jobs">Jobs</Link>
          </Button>
        </div>

        {query.isLoading && <SkeletonListRows aria-label="Loading webhooks" rows={6} />}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>NELVYON cannot open webhooks for this workspace with your current role or workspace selection.</p>
          </ForbiddenNotice>
        )}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) && (
          <ErrorNotice>
            <p>We could not load webhooks. Check your connection and workspace, then try again.</p>
          </ErrorNotice>
        )}
        {query.data && <WebhookList items={query.data.items} />}
      </div>
    </ProtectedLayout>
  );
}
