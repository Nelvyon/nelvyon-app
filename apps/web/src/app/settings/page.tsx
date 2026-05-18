"use client";

import React from "react";
import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonFormCard, SkeletonListRows } from "@/core/ui/Skeleton";
import { InviteMemberForm } from "@/features/settings/components/InviteMemberForm";
import { MembersList } from "@/features/settings/components/MembersList";
import { TenantProfileForm } from "@/features/settings/components/TenantProfileForm";
import { useInviteMember, useSecurityEvents, useTenantSettings, useUpdateTenantSettings, useWorkspaceMembers } from "@/features/settings/hooks";

export default function SettingsPage() {
  const { user } = useAuth();
  const tenantQuery = useTenantSettings();
  const membersQuery = useWorkspaceMembers();
  const updateTenant = useUpdateTenantSettings();
  const inviteMutation = useInviteMember();
  const securityEventsQuery = useSecurityEvents({ limit: 5, sort: "-created_at" });

  const canEdit = user ? canPerformAction(user.role, "settings", "edit") : false;

  return (
    <ProtectedLayout module="settings">
      <div className="space-y-8">
        {tenantQuery.isLoading && !tenantQuery.data && <SkeletonFormCard fields={4} />}
        {tenantQuery.error instanceof ApiError && tenantQuery.error.status === 403 && (
          <ForbiddenNotice>
            <p>NELVYON settings are not available for this workspace with your current role or workspace selection.</p>
          </ForbiddenNotice>
        )}
        {tenantQuery.error && !(tenantQuery.error instanceof ApiError && tenantQuery.error.status === 403) && (
          <ErrorNotice>
            <p>We could not load workspace settings. Check your connection and workspace, then try again.</p>
          </ErrorNotice>
        )}

        {tenantQuery.data && (
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">Profile &amp; timezone</h2>
            <TenantProfileForm
              canSubmit={canEdit}
              initialLogoUrl={tenantQuery.data.logo_url}
              initialName={tenantQuery.data.name}
              initialTimezone={tenantQuery.data.timezone}
              isSubmitting={updateTenant.isPending}
              onSubmit={async (payload) => {
                await updateTenant.mutateAsync(payload);
              }}
            />
            {updateTenant.error instanceof ApiError && updateTenant.error.status === 403 && (
              <p className="text-sm text-warning-foreground">Your role cannot update workspace profile fields.</p>
            )}
            {updateTenant.error &&
              !(updateTenant.error instanceof ApiError && updateTenant.error.status === 403) && (
                <p className="text-sm text-destructive">Profile could not be saved. Try again shortly.</p>
              )}
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-medium text-foreground">Recent security activity</h2>
            <Link className="text-sm text-link underline" href="/settings/audit">
              Open full audit view
            </Link>
          </div>
          {securityEventsQuery.data?.items?.length ? (
            <ul className="rounded-lg border border-border bg-card p-3 text-sm">
              {securityEventsQuery.data.items.slice(0, 5).map((evt) => (
                <li className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 py-2 last:border-b-0" key={evt.id}>
                  <span className="font-medium text-foreground">{evt.event_type}</span>
                  <span className="text-xs text-muted-foreground">
                    {(evt.status ?? "—").toUpperCase()} · {(evt.severity ?? "info").toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {securityEventsQuery.error ? (
            <p className="text-xs text-muted-foreground">Recent security activity unavailable for this workspace context.</p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">Members &amp; invitations</h2>
          {membersQuery.isLoading && !membersQuery.data && (
            <SkeletonListRows aria-label="Loading workspace members" rows={5} />
          )}
          {membersQuery.error instanceof ApiError && membersQuery.error.status === 403 && (
            <ForbiddenNotice>
              <p>NELVYON cannot list members for this workspace with your current access.</p>
            </ForbiddenNotice>
          )}
          {membersQuery.error && !(membersQuery.error instanceof ApiError && membersQuery.error.status === 403) && (
            <ErrorNotice>
              <p>We could not load members. Check your connection and workspace, then try again.</p>
            </ErrorNotice>
          )}
          {membersQuery.data && <MembersList members={membersQuery.data} />}
          <InviteMemberForm
            canSubmit={canEdit}
            isSubmitting={inviteMutation.isPending}
            onSubmit={async (values) => {
              await inviteMutation.mutateAsync(values);
            }}
          />
          {inviteMutation.error instanceof ApiError && inviteMutation.error.status === 403 && (
            <p className="text-sm text-warning-foreground">Your role cannot send invitations for this workspace.</p>
          )}
          {inviteMutation.error &&
            !(inviteMutation.error instanceof ApiError && inviteMutation.error.status === 403) && (
              <p className="text-sm text-destructive">
                Invite could not be sent. The email may already belong to this workspace.
              </p>
            )}
        </section>
      </div>
    </ProtectedLayout>
  );
}
