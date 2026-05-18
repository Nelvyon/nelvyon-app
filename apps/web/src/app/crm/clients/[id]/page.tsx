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
import { ClientDetailCard } from "@/features/crm/components/ClientDetailCard";
import { ClientForm } from "@/features/crm/components/ClientForm";
import { useClient, useUpdateClient } from "@/features/crm/hooks";
import { ClientCreateInput } from "@/features/crm/types";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const { user } = useAuth();
  const query = useClient(id);
  const updateMutation = useUpdateClient(id);
  const canEdit = user ? canPerformAction(user.role, "crm", "edit") : false;
  const invalidId = !Number.isFinite(id) || id <= 0;

  const onUpdate = async (values: ClientCreateInput) => {
    await updateMutation.mutateAsync(values);
  };

  return (
    <ProtectedLayout module="crm">
      <div className="space-y-5">
        <Button asChild size="sm" variant="outline">
          <Link href="/crm/clients">Back to clients</Link>
        </Button>

        {invalidId ? (
          <ErrorNotice title="Invalid client id">
            <p>Cause: this route does not contain a valid numeric client identifier.</p>
            <p className="mt-2 text-sm text-muted-foreground">Next: return to Revenue → Clients and open a valid account row.</p>
          </ErrorNotice>
        ) : null}
        {query.isLoading && (
          <>
            <p className="text-sm text-muted-foreground">Loading client profile, linked deals path, and editable fields…</p>
            <SkeletonDetailCard />
          </>
        )}
        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>Cause: your role or current workspace cannot read this Revenue client.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch workspace in the header or ask an admin for CRM view access.
            </p>
          </ForbiddenNotice>
        )}
        {query.error instanceof ApiError && query.error.status === 404 && (
          <ErrorNotice title="Client not found">
            <p>Cause: this client id is not present in the current workspace scope (deleted/moved/wrong tenant).</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: open Revenue → Clients and navigate from the list to avoid stale links.
            </p>
          </ErrorNotice>
        )}
        {query.error &&
          !(query.error instanceof ApiError && (query.error.status === 403 || query.error.status === 404)) && (
          <ErrorNotice>
            <p>Cause: the client request failed or the id is not in this tenant.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: return to Revenue → Clients and open the row again; refresh if the problem persists.
            </p>
          </ErrorNotice>
        )}

        {query.data && (
          <>
            <ClientDetailCard client={query.data} />
            <section className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-card">
              <h2 className="text-base font-medium text-foreground">Deals and pipeline for this client</h2>
              <p className="text-sm text-muted-foreground">
                Open Revenue → Deals filtered to this account to review stage, owner, value, and risk in one list.
              </p>
              <Button asChild variant="outline">
                <Link href={`/crm/deals?client_id=${id}`}>View deals for this client</Link>
              </Button>
            </section>
            <section className="space-y-2">
              <h2 className="text-base font-medium text-foreground">Quick edit</h2>
              <ClientForm
                canSubmit={canEdit}
                initialValues={{
                  business_name: query.data.business_name,
                  sector: query.data.sector,
                  country: query.data.country ?? undefined,
                  city: query.data.city ?? undefined,
                  website_url: query.data.website_url ?? undefined,
                }}
                isSubmitting={updateMutation.isPending}
                onSubmit={onUpdate}
                submitLabel="Update client"
              />
            </section>
            {updateMutation.error instanceof ApiError && updateMutation.error.status === 403 && (
              <p className="text-sm text-warning-foreground">You cannot update this client with your current NELVYON role.</p>
            )}
            {updateMutation.isSuccess ? (
              <p className="text-xs text-success-foreground">Saved and synced from persisted client detail.</p>
            ) : null}
            {updateMutation.error &&
              !(updateMutation.error instanceof ApiError && updateMutation.error.status === 403) && (
                <p className="text-sm text-destructive">
                  Update failed. Next: retry save once; if it fails again, refresh this client record and submit again.
                </p>
              )}
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
