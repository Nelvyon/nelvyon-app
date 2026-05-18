"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";
import { ErrorNotice } from "@/core/ui/pageStatus";
import type { AdvisorTier } from "@/features/advisor/types";
import { useAdvisorEntitlements, useConsumeAdvisorSession } from "@/features/advisor/hooks";
import { ApiError } from "@/core/api/types";
import { useProjects } from "@/features/projects/hooks";

const MODULE_LABELS: Record<string, string> = {
  priorities_clarity: "Priorities and clarity",
  customer_problem: "Offer and customer fit",
  next_milestone: "Next milestone",
  traction_signals: "Traction signals",
  offers_packaging: "Offers and packaging",
  channels_focus: "Channels with focus",
  org_scaling: "Organization and delegation",
  unit_economics: "Unit economics checkpoints",
  risk_register: "Risks and assumptions",
};

function tierHeadline(tier: AdvisorTier): string {
  if (tier === "executive") return "Executive depth";
  if (tier === "growth") return "Growth depth";
  return "Fundamentals depth";
}

function outputProfileLabel(profile: string): string {
  if (profile === "executive_review") return "Portfolio-style review framing";
  if (profile === "growth_plan") return "Structured growth checklist";
  return "Short focus notes";
}

function workspaceMoves(tier: AdvisorTier): string[] {
  const universal = [
    "Put your current hypothesis and next milestone into a draft project so delivery sees the same wording you use here.",
    "When something blocks execution, open a tracked request through support with concrete context.",
  ];
  if (tier === "basic") return universal;
  const extra =
    tier === "growth"
      ? [
          "Name one experiment tied to revenue or retention, and where you will record results in the project brief.",
          "Pick a single channel or motion to stress-test this month instead of spreading thin.",
        ]
      : [
          "Surface trade-offs between speed, quality, and burn—your specialists use that to sequence work.",
          "Maintain a short risk list (demand, delivery, cash) reviewers can align with in delivery planning.",
          "Revisit ownership: who decides, who executes, and where approval slows you down.",
        ];
  return [...universal, ...extra];
}

export default function BusinessAdvisorPage() {
  const entitlementsQuery = useAdvisorEntitlements();
  const consumeSession = useConsumeAdvisorSession();
  const projectsQuery = useProjects();
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const projectHint = useMemo(() => {
    const items = projectsQuery.data?.items ?? [];
    if (items.length === 0) return null;
    const sorted = [...items].sort((a, b) => {
      const ta = a.updated_at ?? a.created_at ?? "";
      const tb = b.updated_at ?? b.created_at ?? "";
      return tb.localeCompare(ta);
    });
    const top = sorted[0];
    return { name: top?.name ?? "Project", count: items.length };
  }, [projectsQuery.data]);

  const data = entitlementsQuery.data;
  const consumePending = consumeSession.isPending;

  return (
    <ProtectedLayout module="help">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Business advisor</h2>
            <Badge tone="neutral">NELVYON v1</Badge>
            {data ? (
              <Badge tone="success">{tierHeadline(data.tier)}</Badge>
            ) : entitlementsQuery.isLoading ? (
              <Badge tone="neutral">Loading tier…</Badge>
            ) : null}
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Specialized entrepreneurship and growth guidance tied to your workspace—not a generic conversation surface. Depth,
            focus areas, and structured output follow your commercial plan. Nothing here replaces your delivery team: it helps
            you prioritize and hand off cleanly.
          </p>
        </header>

        <p className="max-w-3xl text-xs text-muted-foreground">
          Honest scope: recommendations stay actionable and context-aware. Full delivery methodology remains with your team.
          Session usage is metered per workspace and month, enforced on the server by your plan tier.
        </p>

        {entitlementsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading plan and access…</p>
        ) : null}
        {entitlementsQuery.error instanceof ApiError ? (
          <ErrorNotice>
            <p>We could not read your advisor access from the workspace.</p>
            <p className="mt-2 text-sm text-muted-foreground">Next: confirm workspace selection, then retry. If it persists, open support.</p>
          </ErrorNotice>
        ) : null}

        {data ? (
          <div className="grid gap-4 md:grid-cols-3">
            <section className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground">Plan</h3>
              <p className="text-sm capitalize text-muted-foreground">
                Commercial plan: <span className="font-medium text-foreground">{data.plan_id}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Session budget (monthly):{" "}
                <span className="font-semibold text-foreground">{data.sessions_per_month}</span>
              </p>
              <Button asChild className="mt-2 w-full sm:w-auto" size="sm" variant="outline">
                <Link href="/billing">Review billing and plans</Link>
              </Button>
            </section>
            <section className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-card md:col-span-2">
              <h3 className="text-sm font-semibold text-foreground">Focus areas unlocked</h3>
              <ul className="flex flex-wrap gap-2">
                {data.modules.map((key) => (
                  <li key={key}>
                    <Badge tone="neutral">{MODULE_LABELS[key] ?? key}</Badge>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Structured output profile:{" "}
                <span className="font-medium text-foreground">{outputProfileLabel(data.output_profile)}</span>
              </p>
            </section>
          </div>
        ) : null}

        {data ? (
          <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">Session control (monthly)</h3>
            <p className="text-sm text-muted-foreground">
              Period <span className="font-medium text-foreground">{data.month_key}</span> · Used{" "}
              <span className="font-medium text-foreground">{data.used_sessions_this_month}</span> of{" "}
              <span className="font-medium text-foreground">{data.sessions_per_month}</span> · Remaining{" "}
              <span className="font-medium text-foreground">{data.remaining_sessions_this_month}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={consumePending || data.limit_reached}
                onClick={async () => {
                  setSessionMessage(null);
                  try {
                    const result = await consumeSession.mutateAsync();
                    if (result.consumed) {
                      setSessionMessage("Session registered. Your workspace counter has been updated.");
                    } else {
                      setSessionMessage("Monthly session limit reached for this tier. You can continue next month or review plans.");
                    }
                  } catch {
                    setSessionMessage("Could not register session usage. Retry once or open support.");
                  }
                }}
                type="button"
              >
                {consumePending ? "Registering session…" : "Register advisor session"}
              </Button>
              <Button
                onClick={() => {
                  void entitlementsQuery.refetch();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Refresh usage
              </Button>
            </div>
            {data.limit_reached ? (
              <p className="text-sm text-muted-foreground">
                Your monthly session budget has been reached for this plan. Upgrade options are available in billing.
              </p>
            ) : null}
            {sessionMessage ? <p className="text-sm text-muted-foreground">{sessionMessage}</p> : null}
            {consumeSession.error instanceof ApiError ? (
              <ErrorNotice>
                <p>Server could not apply the session counter update.</p>
                <p className="mt-2 text-sm text-muted-foreground">Next: retry once, then use support if the issue persists.</p>
              </ErrorNotice>
            ) : null}
          </section>
        ) : null}

        <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Workspace context (read-only)</h3>
          {projectsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading projects…</p> : null}
          {projectsQuery.isError ? (
            <ErrorNotice>
              <p>Could not load project list for framing.</p>
              <p className="mt-2 text-sm text-muted-foreground">You can still draft work in Projects from the shortcuts below.</p>
            </ErrorNotice>
          ) : null}
          {!projectsQuery.isLoading && !projectsQuery.isError ? (
            projectHint ? (
              <p className="text-sm text-muted-foreground">
                {projectHint.count} project{projectHint.count === 1 ? "" : "s"} visible—most recently touched:{" "}
                <span className="font-medium text-foreground">{projectHint.name}</span>.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No projects returned yet—start with a draft so your team sees the same storyline.</p>
            )
          ) : null}
        </section>

        {data ? (
          <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">Suggested next workspace moves</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {workspaceMoves(data.tier).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/app/projects/new">Open project draft flow</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/support">Open support</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/assistant?role=sales">Commercial specialist flows</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/billing">Billing and plan options</Link>
          </Button>
        </section>
      </div>
    </ProtectedLayout>
  );
}
