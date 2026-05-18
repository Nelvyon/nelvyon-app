"use client";

import Link from "next/link";
import { useState } from "react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { canPerformAction } from "@/core/routing/guards";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";
import { ErrorNotice } from "@/core/ui/pageStatus";
import {
  useBrandingActivationLogs,
  useBrandingPolicy,
  useSetBrandingActivation,
} from "@/features/branding/policyHooks";

/** WHITE-LABEL / BRANDING v2 — Flow 2: internal activation guard + audit log. */
export default function TenantBrandingActivationPage() {
  const { user } = useAuth();
  const canOperate = user ? canPerformAction(user.role, "os", "edit") : false;
  const policyQuery = useBrandingPolicy();
  const logsQuery = useBrandingActivationLogs();
  const setActivation = useSetBrandingActivation();
  const [note, setNote] = useState("");

  const policy = policyQuery.data;
  const logs = logsQuery.data ?? [];

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Tenant activation guard</h2>
            <Badge tone="neutral">WHITE-LABEL v2</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Internal control to activate/deactivate branding v2 advanced per tenant/workspace with server-side
            preconditions, plus a simple activation log.
          </p>
        </header>

        {!canOperate ? (
          <p className="text-sm text-warning-foreground">Only operator/admin roles can change this activation flag.</p>
        ) : null}

        {policyQuery.error instanceof ApiError ? (
          <ErrorNotice>
            <p>{policyQuery.error.message}</p>
          </ErrorNotice>
        ) : null}
        {setActivation.error instanceof ApiError ? (
          <ErrorNotice>
            <p>{setActivation.error.message}</p>
          </ErrorNotice>
        ) : null}

        {policy ? (
          <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">Current effective state</h3>
            <p className="text-sm text-muted-foreground">
              Workspace <span className="font-medium text-foreground">{policy.workspace_name}</span> · Plan{" "}
              <span className="font-medium text-foreground">{policy.plan}</span> · Status{" "}
              <span className="font-medium text-foreground">{policy.status}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Branding v2 advanced:{" "}
              <span className="font-medium text-foreground">
                {policy.branding_v2_advanced_enabled ? "ON" : "OFF"}
              </span>
            </p>
            <label className="block space-y-1 text-sm text-foreground">
              Change note (optional)
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why this activation change?"
                value={note}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!canOperate || setActivation.isPending || policy.branding_v2_advanced_enabled}
                onClick={() => setActivation.mutate({ enabled: true, note: note.trim() || undefined })}
                type="button"
              >
                Activate v2 advanced
              </Button>
              <Button
                disabled={!canOperate || setActivation.isPending || !policy.branding_v2_advanced_enabled}
                onClick={() => setActivation.mutate({ enabled: false, note: note.trim() || undefined })}
                type="button"
                variant="outline"
              >
                Deactivate v2 advanced
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This toggles only tenant policy flags. It does not create domains, CDN wiring, or global shell reskins.
            </p>
          </section>
        ) : null}

        <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Activation log (latest)</h3>
          {logsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading logs…</p> : null}
          {!logsQuery.isLoading && !logs.length ? (
            <p className="text-sm text-muted-foreground">No activation changes logged yet.</p>
          ) : null}
          <div className="space-y-2">
            {logs.map((r) => (
              <article className="rounded-md border border-border p-3 text-sm" key={r.id}>
                <p className="font-medium text-foreground">
                  {r.from_enabled ? "ON" : "OFF"} → {r.to_enabled ? "ON" : "OFF"}
                </p>
                <p className="text-muted-foreground">
                  by {r.actor_email || r.actor_user_id} · {r.created_at || "unknown time"}
                </p>
                {r.note ? <p className="text-muted-foreground">note: {r.note}</p> : null}
              </article>
            ))}
          </div>
          <p className="text-sm">
            <Link className="text-link underline" href="/app/branding/policy">
              Verify policy result
            </Link>
          </p>
        </section>
      </div>
    </ProtectedLayout>
  );
}
