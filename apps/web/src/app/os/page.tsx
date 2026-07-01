"use client";

import React from "react";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { SectionTitle } from "@/core/ui/typography";
import Link from "next/link";
import { HelpContextLink } from "@/features/help/components/HelpContextLink";
import { buildOsPlaybook, countRetriesInSample, rollupWebhooks } from "@/features/os/analytics";
import { OsAnalyticsStrip } from "@/features/os/components/OsAnalyticsStrip";
import { OsHealthBanner } from "@/features/os/components/OsHealthBanner";
import { OsAdvancedJobsExport } from "@/features/os/components/OsAdvancedJobsExport";
import { OsJobsReportBlock } from "@/features/os/components/OsJobsReportBlock";
import { OsModuleShortcuts } from "@/features/os/components/OsModuleShortcuts";
import { OsOverviewSkeleton } from "@/features/os/components/OsOverviewSkeleton";
import { OsPlaybook } from "@/features/os/components/OsPlaybook";
import { OsRecentJobs } from "@/features/os/components/OsRecentJobs";
import { OsStatsGrid } from "@/features/os/components/OsStatsGrid";
import { useOsDashboard } from "@/features/os/hooks";

function firstError(...errs: (unknown | null | undefined)[]) {
  return errs.find(Boolean) ?? null;
}

export default function OsOverviewPage() {
  const { statsQuery, jobsQuery, failedJobsQuery, webhooksQuery, billingQuery, canBilling } = useOsDashboard();

  const err = firstError(
    statsQuery.error,
    jobsQuery.error,
    failedJobsQuery.error,
    webhooksQuery.error,
    canBilling ? billingQuery.error : null,
  );

  const stats = statsQuery.data;
  const jobs = jobsQuery.data?.items ?? [];
  const failedJobs = failedJobsQuery.data?.items ?? [];
  const webhookItems = webhooksQuery.data?.items ?? [];
  const billing = billingQuery.data;

  const billingAlerts = billing?.usage_alerts ?? 0;
  const webhookRollup = rollupWebhooks(webhookItems);
  const retriesInSample = countRetriesInSample(jobs);
  const playbook = stats
    ? buildOsPlaybook({
        statsFailed: stats.failed,
        statsPending: stats.pending,
        webhookInactive: webhookRollup.inactive,
        metersAtRisk: billing?.meters_at_risk ?? [],
      })
    : [];

  const showInitialSkeleton =
    (statsQuery.isLoading ||
      jobsQuery.isLoading ||
      failedJobsQuery.isLoading ||
      webhooksQuery.isLoading ||
      (canBilling && billingQuery.isLoading)) &&
    !stats;

  return (
    <ProtectedLayout module="os">
      <div className="space-y-8">
        <div className="rounded-lg border border-[#0084FF]/25 bg-[#0b1428]/80 px-4 py-3 text-sm text-foreground">
          <span className="font-medium text-[#0084FF]">NELVYON OS (shell oficial)</span>
          {" — "}
          <Link className="underline hover:text-[#0084FF]" href="/os/dashboard">
            Ir al dashboard operativo
          </Link>
          . Esta ruta sigue siendo el hub de automatización (jobs/webhooks); no se elimina en Fase 2A.
        </div>
        <HelpContextLink href="/help/os" label="Operations troubleshooting guide" />
        {showInitialSkeleton && <OsOverviewSkeleton />}

        {err instanceof ApiError && err.status === 403 && (
          <ForbiddenNotice>
            <p>Cause: Operations (OS) data is not available for this workspace or your role returned 403.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch workspace in the header, or ask an admin for OS/automation visibility aligned with your job.
            </p>
          </ForbiddenNotice>
        )}
        {err && !(err instanceof ApiError && err.status === 403) && (
          <ErrorNotice>
            <p>Cause: one of stats, jobs, webhooks, or billing snapshot requests failed.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: refresh; open Automations → Jobs if you need a narrower view; retry after a minute if the API was warming up.
            </p>
          </ErrorNotice>
        )}

        {stats && (
          <OsHealthBanner billingUsageAlerts={billingAlerts} failedJobs={stats.failed} pendingJobs={stats.pending} />
        )}

        {stats && (
          <OsAnalyticsStrip
            recentSampleSize={jobs.length}
            retriesInRecentSample={retriesInSample}
            stats={stats}
            webhooks={webhookRollup}
          />
        )}

        <section className="rounded-lg border border-border bg-card p-4 text-sm shadow-card">
          <p className="font-medium text-foreground">New operational lens</p>
          <p className="mt-1 text-muted-foreground">
            Observability v1 adds a fixed 24h snapshot, minimal incident drilldown, and alert guardrails simulation.
          </p>
          <p className="mt-2">
            <Link className="text-link underline" href="/os/observability">
              Open /os/observability
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/global">
              Open /os/global
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/qa/checklist">
              Open /os/qa/checklist
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/qa-review">
              Open /os/qa-review (human QA queue)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/competitor-gap">
              Open /os/competitor-gap
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/i18n">
              Open /os/i18n
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/excellence/golden-path">
              Open /os/excellence/golden-path
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/design-system">
              Open /os/design-system (Design System v1)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/web-premium/preview">
              Open /os/web-premium/preview (Web Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/ecommerce-premium/preview">
              Open /os/ecommerce-premium/preview (E‑commerce Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/seo-premium/preview">
              Open /os/seo-premium/preview (SEO Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/ads-premium/preview">
              Open /os/ads-premium/preview (Ads Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/branding-premium/preview">
              Open /os/branding-premium/preview (Branding Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/voz-premium/preview">
              Open /os/voz-premium/preview (Voz Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/bots-premium/preview">
              Open /os/bots-premium/preview (Bots Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/personal-digital-premium/preview">
              Open /os/personal-digital-premium/preview (Personal Digital Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/advisor-empresarial-premium/preview">
              Open /os/advisor-empresarial-premium/preview (Advisor Empresarial Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/canales-comunicaciones-premium/preview">
              Open /os/canales-comunicaciones-premium/preview (Canales y Comunicaciones Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/social-media-premium/preview">
              Open /os/social-media-premium/preview (Social Media Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/email-marketing-premium/preview">
              Open /os/email-marketing-premium/preview (Email Marketing Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/contenido-copywriting-premium/preview">
              Open /os/contenido-copywriting-premium/preview (Contenido y Copywriting Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/video-multimedia-premium/preview">
              Open /os/video-multimedia-premium/preview (Video y Multimedia Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/3d-inmersivo-premium/preview">
              Open /os/3d-inmersivo-premium/preview (3D y Contenido Inmersivo Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/fotografia-producto-premium/preview">
              Open /os/fotografia-producto-premium/preview (Fotografía de Producto Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/diseno-grafico-premium/preview">
              Open /os/diseno-grafico-premium/preview (Diseño gráfico y creatividades Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/consultoria-automatizacion-premium/preview">
              Open /os/consultoria-automatizacion-premium/preview (Consultoría de automatización Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/integraciones-apis-premium/preview">
              Open /os/integraciones-apis-premium/preview (Integraciones y APIs Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/mantenimiento-web-premium/preview">
              Open /os/mantenimiento-web-premium/preview (Mantenimiento web Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/reputacion-orm-premium/preview">
              Open /os/reputacion-orm-premium/preview (Reputación online y ORM Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/formacion-capacitacion-premium/preview">
              Open /os/formacion-capacitacion-premium/preview (Formación y capacitación digital Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/influencer-marketing-premium/preview">
              Open /os/influencer-marketing-premium/preview (Influencer Marketing Premium template)
            </Link>
          </p>
          <p className="mt-1">
            <Link className="text-link underline" href="/os/tenants/activation">
              Open /os/tenants/activation
            </Link>
          </p>
        </section>

        {stats && <OsPlaybook items={playbook} />}

        {stats && (
          <section className="space-y-3">
            <SectionTitle>Automation</SectionTitle>
            <OsStatsGrid stats={stats} />
          </section>
        )}

        {canBilling && billing && (
          <section className="space-y-3">
            <SectionTitle>Plan snapshot</SectionTitle>
            <div className="rounded-lg border border-border bg-card p-4 text-sm shadow-card">
              <p>
                <span className="text-muted-foreground">Plan:</span>{" "}
                <span className="font-medium text-foreground">{billing.plan_label}</span> ({billing.plan_id})
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Meters at risk:</span>{" "}
                <span className="text-foreground">{billing.meters_at_risk.length ? billing.meters_at_risk.join(", ") : "—"}</span>
              </p>
              {!billing.meters_at_risk.length ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  No meters flagged at risk in this snapshot — either usage is within limits or billing has not emitted alerts
                  yet. Next: check Billing → Usage for detail if quotas feel tight.
                </p>
              ) : null}
            </div>
          </section>
        )}

        {!canBilling && (
          <p className="rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground shadow-card">
            Billing snapshot is hidden for your role. Operators and admins see plan and quota risk on this screen.
          </p>
        )}

        <section className="space-y-3">
          <SectionTitle>Recent automation jobs</SectionTitle>
          {jobsQuery.isLoading && !jobsQuery.data && (
            <SkeletonListRows aria-label="Loading recent automation jobs" rows={6} />
          )}
          {jobsQuery.data && <OsRecentJobs items={jobs} />}
        </section>

        {jobsQuery.data && failedJobsQuery.data && (
          <OsJobsReportBlock failedSample={failedJobs} recent={jobs} />
        )}

        <OsAdvancedJobsExport />

        <OsModuleShortcuts />
      </div>
    </ProtectedLayout>
  );
}
