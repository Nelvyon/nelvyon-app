"use client";

import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { useBrandingPolicy } from "@/features/branding/policyHooks";

/** WHITE-LABEL / BRANDING v2 — Flow 1: effective tenant/workspace policy (read-only). */
export default function BrandingPolicyPage() {
  const policyQuery = useBrandingPolicy();
  const policy = policyQuery.data;

  return (
    <ProtectedLayout module="branding">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Tenant branding policy</h2>
            <Badge tone="neutral">WHITE-LABEL v2</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Read-only effective policy for this tenant/workspace. It shows what branding fields are enabled, blocked, or
            inherited, and why. This page does not alter `/app/branding` v1 behavior.
          </p>
        </header>

        {policyQuery.error instanceof ApiError && policyQuery.error.status === 403 ? (
          <ForbiddenNotice>
            <p>You do not have access to tenant branding policy for this workspace.</p>
          </ForbiddenNotice>
        ) : null}
        {policyQuery.error && !(policyQuery.error instanceof ApiError && policyQuery.error.status === 403) ? (
          <ErrorNotice>
            <p>Could not load effective branding policy.</p>
          </ErrorNotice>
        ) : null}
        {policyQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading policy…</p> : null}

        {policy ? (
          <>
            <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground">Effective policy context</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Workspace</dt>
                  <dd className="font-medium text-foreground">{policy.workspace_name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="font-medium text-foreground">{policy.plan}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium text-foreground">{policy.status}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Branding v2 advanced</dt>
                  <dd className="font-medium text-foreground">
                    {policy.branding_v2_advanced_enabled ? "ON" : "OFF"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground">Field flags and sources</h3>
              <div className="space-y-2">
                {policy.fields.map((f) => (
                  <article className="rounded-md border border-border p-3 text-sm" key={f.field}>
                    <p className="font-medium text-foreground">
                      {f.field} · {f.state}
                    </p>
                    <p className="text-muted-foreground">Source: {f.source}</p>
                    <p className="text-muted-foreground">Reason: {f.reason}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground">Notes</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {policy.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </section>

            <div className="flex flex-wrap gap-3 text-sm">
              <Link className="text-link underline" href="/app/branding">
                Verify against /app/branding v1
              </Link>
              <Link className="text-link underline" href="/app/branding/preview-v2">
                Open preview matrix v2
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
