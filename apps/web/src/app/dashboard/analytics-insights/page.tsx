"use client";

import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { PackReportSectionsPanel } from "@/features/packs/PackReportSections";
import { usePackReportLatest } from "@/features/packs/hooks";
import { ANALYTICS_INSIGHTS_META } from "@/lib/packs/analyticsInsightsPack";
import { ANALYTICS_INSIGHTS_PACK_ID } from "@/lib/packs/types";
import { SAAS_EMPTY_STATES, SAAS_REPORT } from "@/lib/saas/copy";

export default function AnalyticsInsightsReportPage() {
  const query = usePackReportLatest(ANALYTICS_INSIGHTS_PACK_ID);
  const latest = query.data?.latest;
  const report = latest?.report;

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={ANALYTICS_INSIGHTS_META.kickoffPath}>Lanzar nuevo pack</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/packs">Catálogo</Link>
          </Button>
        </div>

        {query.isLoading ? <SkeletonListRows rows={4} /> : null}

        {!query.isLoading && !latest ? (
          <PanelCard>
            <p className="font-medium">{SAAS_EMPTY_STATES.noDeliverables.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Lanza Analytics Insights desde el kickoff OS para ver tu primer insight GA4.
            </p>
            <Button asChild className="mt-4">
              <Link href={ANALYTICS_INSIGHTS_META.kickoffPath}>Lanzar pack</Link>
            </Button>
          </PanelCard>
        ) : null}

        {report ? (
          <>
            <PanelCard accent={ANALYTICS_INSIGHTS_META.accent}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {report.pack_name}
                </p>
                <ProvenanceBadge provenance={report.data_provenance} />
              </div>
              <h2 className="mt-1 text-2xl font-semibold">{report.business_name}</h2>
              <p className="mt-3 text-base font-medium text-foreground">
                {report.live_insight?.headline ?? report.summary}
              </p>
              {report.live_insight?.property_id ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Propiedad GA4: {report.live_insight.property_id} · {report.live_insight.period_days} días
                </p>
              ) : null}
            </PanelCard>

            {report.live_insight ? (
              <PanelCard>
                <h3 className="text-base font-semibold">Canales (datos reales o demo)</h3>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  {report.live_insight.channel_breakdown.slice(0, 3).map((c) => (
                    <div className="rounded-lg border border-border/80 px-3 py-2" key={c.channel}>
                      <dt className="text-xs text-muted-foreground">{c.channel}</dt>
                      <dd className="text-lg font-semibold tabular-nums">{c.share_pct}%</dd>
                    </div>
                  ))}
                </dl>
              </PanelCard>
            ) : null}

            {report.sections && report.sections.length > 0 ? (
              <PackReportSectionsPanel sections={report.sections} />
            ) : null}

            <PanelCard>
              <h3 className="text-base font-semibold">{SAAS_REPORT.nextStepsTitle}</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {report.next_steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </PanelCard>
          </>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}

function ProvenanceBadge({
  provenance,
}: {
  provenance?: "demo" | "ga4" | "meta_ads" | "pending";
}) {
  if (provenance === "ga4") {
    return (
      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success-foreground">
        Datos GA4 live
      </span>
    );
  }
  if (provenance === "demo") {
    return (
      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
        Demo fixture
      </span>
    );
  }
  return null;
}
