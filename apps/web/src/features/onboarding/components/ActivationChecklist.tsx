"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import React, { useMemo } from "react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { LOCAL_ACTIVATION_FIRST_TICKET } from "@/core/auth/sessionStorageKeys";
import { Button } from "@/core/ui/button";
import { SectionTitle } from "@/core/ui/typography";
import { canPerformAction } from "@/core/routing/guards";
import { useWorkspace } from "@/core/workspace/WorkspaceContext";
import { ACTIVATION_LOCAL_QUERY_KEY } from "@/features/onboarding/activationQueryKeys";
import { HelpContextLink } from "@/features/help/components/HelpContextLink";
import { useCompleteOnboardingStep, useOnboardingProgress } from "@/features/onboarding/hooks";
import type { OnboardingStepStatus } from "@/features/onboarding/types";
import { trackProductEvent } from "@/core/telemetry/productEvents";

type ActivationRow = {
  id: string;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  /** Backend `step_key` when this row syncs to `/api/v1/onboarding/complete-step`. */
  backendStepKey?: string;
  /** Purely client-side completion (not in server onboarding). */
  localStorageKey?: typeof LOCAL_ACTIVATION_FIRST_TICKET;
};

export const ACTIVATION_ROWS: ActivationRow[] = [
  {
    id: "ws",
    title: "Workspace active",
    description: "Confirms all next module actions are scoped to the right workspace from the first click.",
    ctaLabel: "Use workspace selector in header",
  },
  {
    id: "tenant",
    title: "Workspace profile",
    description: "Makes outputs client-ready (brand/timezone) so demos and deliveries look consistent.",
    href: "/settings",
    backendStepKey: "workspace",
  },
  {
    id: "client",
    title: "First CRM client",
    description: "Creates a real account anchor so revenue, campaigns, and billing references stay coherent.",
    href: "/crm/clients/new",
    backendStepKey: "first_contact",
  },
  {
    id: "ticket",
    title: "First helpdesk ticket",
    description: "Proves support intake is live in this workspace (activation-only until backend adds a matching step_key).",
    href: "/inbox/tickets/new",
    localStorageKey: LOCAL_ACTIVATION_FIRST_TICKET,
  },
  {
    id: "campaign",
    title: "First campaign",
    description: "Shows execution flow is operational end-to-end from project bootstrap to campaign record.",
    href: "/campaigns/new",
    backendStepKey: "first_campaign",
  },
];

function readLocalDone(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function setLocalDone(key: string, done: boolean) {
  try {
    if (done) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function backendStepMap(steps: OnboardingStepStatus[] | undefined): Map<string, boolean> {
  const m = new Map<string, boolean>();
  for (const s of steps ?? []) {
    m.set(s.key, s.completed);
  }
  return m;
}

export function ActivationChecklist() {
  const { user, accessToken } = useAuth();
  const { workspaceId } = useWorkspace();
  const progress = useOnboardingProgress(Boolean(user && accessToken && workspaceId));
  const completeMutation = useCompleteOnboardingStep();
  const queryClient = useQueryClient();
  const localTicketQuery = useQuery({
    queryKey: ACTIVATION_LOCAL_QUERY_KEY,
    queryFn: () => readLocalDone(LOCAL_ACTIVATION_FIRST_TICKET),
    enabled: Boolean(user && accessToken),
  });
  const localTicket = Boolean(localTicketQuery.data);

  const backendMap = useMemo(() => backendStepMap(progress.data?.steps), [progress.data?.steps]);

  const canMarkServer = user ? canPerformAction(user.role, "settings", "edit") : false;

  if (!user || !accessToken || !workspaceId) {
    return null;
  }

  const isRowDone = (row: ActivationRow): boolean => {
    if (row.id === "ws") return Boolean(workspaceId);
    if (row.localStorageKey) return localTicket;
    if (row.backendStepKey) return backendMap.get(row.backendStepKey) ?? false;
    return false;
  };

  const doneCount = ACTIVATION_ROWS.filter((r) => isRowDone(r)).length;

  const onMarkServer = async (key: string) => {
    await completeMutation.mutateAsync({ stepKey: key });
    trackProductEvent("onboarding_step_completed", { step_key: key, module: "onboarding" });
  };

  const onMarkTicketLocal = () => {
    setLocalDone(LOCAL_ACTIVATION_FIRST_TICKET, true);
    trackProductEvent("onboarding_step_completed", { step_key: "first_ticket_local", module: "onboarding" });
    void queryClient.invalidateQueries({ queryKey: [...ACTIVATION_LOCAL_QUERY_KEY] });
  };

  return (
    <section aria-label="Activation checklist" className="rounded-lg border border-border bg-card p-4 shadow-card">
      <SectionTitle>Activation checklist</SectionTitle>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Up to five actionable steps. Rows with a server badge call{" "}
        <code className="rounded bg-muted px-1">POST /api/v1/onboarding/complete-step</code> when you mark them done
        (operator/admin in workspace). The ticket row is <strong>client-only</strong> until the backend exposes a
        matching <code className="rounded bg-muted px-1">step_key</code>.
      </p>
      <p className="mt-2 text-xs font-medium text-foreground">
        Progress: {doneCount}/{ACTIVATION_ROWS.length}
      </p>
      {progress.isLoading ? (
        <p className="mt-1 text-xs text-muted-foreground">Loading activation progress for current workspace…</p>
      ) : null}
      {progress.isFetching && progress.data ? (
        <p className="mt-1 text-xs text-muted-foreground">Refreshing activation progress from workspace data…</p>
      ) : null}
      <div className="pt-1">
        <HelpContextLink href="/help" label="Need setup help? Open Help center" />
      </div>
      <ul className="mt-3 divide-y divide-border rounded-md border border-border">
        {ACTIVATION_ROWS.map((row) => {
          const done = isRowDone(row);
          return (
            <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between" key={row.id}>
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {row.title}{" "}
                  {row.backendStepKey ? (
                    <span className="ml-1 rounded bg-muted px-1 text-[10px] font-normal text-muted-foreground">
                      server:{row.backendStepKey}
                    </span>
                  ) : row.localStorageKey ? (
                    <span className="ml-1 rounded bg-warning/15 px-1 text-[10px] font-normal text-warning-foreground">
                      client-only
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">{row.description}</p>
                {row.href ? (
                  <Link className="mt-1 inline-block text-sm text-link underline" href={row.href}>
                    {row.ctaLabel ?? "Open →"}
                  </Link>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{row.ctaLabel ?? "No direct route for this step."}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {done ? (
                  <span className="text-xs font-medium text-success">Done</span>
                ) : row.backendStepKey ? (
                  <>
                    <Button
                      disabled={!canMarkServer || completeMutation.isPending}
                      onClick={() => void onMarkServer(row.backendStepKey!)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Mark done (server)
                    </Button>
                    {!canMarkServer ? <span className="text-xs text-warning-foreground">Requires operator/admin.</span> : null}
                  </>
                ) : row.localStorageKey ? (
                  <Button onClick={onMarkTicketLocal} size="sm" type="button" variant="secondary">
                    Mark done (this browser)
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Complete in header</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {progress.error ? (
        progress.error instanceof ApiError && progress.error.status === 403 ? (
          <p className="mt-2 text-xs text-destructive">
            Activation progress is blocked for this role/workspace. Next: switch workspace or ask an admin for settings
            edit scope.
          </p>
        ) : (
          <p className="mt-2 text-xs text-destructive">
            Could not load onboarding progress due to request/network failure. Next: refresh and confirm active session +
            workspace header.
          </p>
        )
      ) : null}
      {completeMutation.isSuccess ? (
        <p className="mt-2 text-xs text-success-foreground">Step saved and activation progress synced.</p>
      ) : null}
      {completeMutation.error ? (
        completeMutation.error instanceof ApiError && completeMutation.error.status === 403 ? (
          <p className="mt-2 text-xs text-destructive">
            Save blocked by role/workspace policy. Requires operator/admin scope for server-backed checklist updates.
          </p>
        ) : (
          <p className="mt-2 text-xs text-destructive">
            Could not save checklist step. Next: retry once; if it persists, refresh and submit again.
          </p>
        )
      ) : null}
    </section>
  );
}
