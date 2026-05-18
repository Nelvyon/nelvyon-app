"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader, NelvyonDsStatusDot, type NelvyonDsStatus } from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LanguageSelector } from "@/components/LanguageSelector";
import { resetUser, trackEvent } from "@/lib/analytics";
import { cn } from "@/core/ui/utils";
import type { SaasPlan, SaasTenantDto } from "../onboarding/components/types";

type ActivityItem = {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
};

type DashboardSummary = {
  tenant: SaasTenantDto;
  activeJobs: number;
  completedJobs: number;
  totalSpend: number;
  recentActivity: ActivityItem[];
};

const NAV = ["Dashboard", "Servicios", "CRM", "Workflows", "Campanas", "Configuracion"] as const;

function planTone(plan: SaasPlan): "primary" | "success" | "warning" {
  if (plan === "enterprise") return "warning";
  if (plan === "pro") return "success";
  return "primary";
}

function activityStatus(type: string): NelvyonDsStatus {
  const v = type.toLowerCase();
  if (v.includes("error") || v.includes("fail")) return "crit";
  if (v.includes("warn")) return "warn";
  if (v.includes("running") || v.includes("pending")) return "pending";
  return "ok";
}

function formatDate(d: string): string {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

export default function SaasDashboardPage() {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportingReport, setExportingReport] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/saas/dashboard", { credentials: "same-origin", cache: "no-store" });
        if (res.status === 401) {
          router.replace(`/auth/login?next=${encodeURIComponent("/saas/dashboard")}`);
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError(t("common.error"));
          return;
        }
        const body = (await res.json()) as DashboardSummary;
        if (!body?.tenant?.onboardingCompleted) {
          router.replace("/saas/onboarding");
          return;
        }
        if (!cancelled) {
          setSummary(body);
          const plan = body.tenant?.plan;
          if (typeof plan === "string") {
            const storageKey = "nelvyon_last_plan";
            const previous = sessionStorage.getItem(storageKey);
            if (previous && previous !== plan) {
              trackEvent("plan_upgraded", { plan, from: previous });
            }
            sessionStorage.setItem(storageKey, plan);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, t]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 text-sm text-muted-foreground">{t("common.loading")}…</div>
    );
  }

  if (!summary) {
    return <div className="px-4 py-10 text-sm text-destructive">{error ?? t("common.empty_state")}</div>;
  }

  const { tenant } = summary;
  if (!tenant.onboardingCompleted) {
    return null;
  }

  const kpis = [
    { label: t("dashboard.active_jobs"), value: summary.activeJobs },
    { label: t("dashboard.completed_jobs"), value: summary.completedJobs },
    { label: t("dashboard.total_spend"), value: `${summary.totalSpend.toFixed(2)} EUR` },
    { label: t("dashboard.current_plan"), value: tenant.plan },
  ];

  const now = new Date().toLocaleDateString("es-ES", { dateStyle: "full" });
  const hasNoJobs = summary.activeJobs === 0 && summary.completedJobs === 0;

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <NelvyonDsCard className="space-y-4">
            <div className="text-lg font-semibold text-foreground">NELVYON</div>
            <LanguageSelector />
            <div className="space-y-2">
              {NAV.map((item) => (
                <div
                  key={item}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    item === "Dashboard" ? "bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-border pt-3">
              <p className="text-sm font-medium text-foreground">{tenant.companyName}</p>
              <NelvyonDsBadge tone={planTone(tenant.plan)}>{tenant.plan}</NelvyonDsBadge>
            </div>
            <NelvyonDsButton
              variant="secondary"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
                resetUser();
                router.replace("/auth/login");
              }}
            >
              Cerrar sesion
            </NelvyonDsButton>
          </NelvyonDsCard>
        </aside>

        <main className="space-y-6">
          <NelvyonDsSectionHeader eyebrow="SaaS Dashboard" title={t("dashboard.welcome", { company: tenant.companyName })} subtitle={now} />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => (
              <NelvyonDsCard key={k.label} title={k.label}>
                <p className="text-2xl font-semibold text-foreground">{k.value}</p>
              </NelvyonDsCard>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <NelvyonDsCard title={t("dashboard.recent_activity")}>
              {summary.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("common.empty_state")}</p>
              ) : (
                <ul className="space-y-3">
                  {summary.recentActivity.slice(0, 10).map((a) => (
                    <li key={a.id} className="flex items-start gap-3 border-b border-border pb-3 text-sm last:border-none">
                      <NelvyonDsStatusDot status={activityStatus(a.eventType)} label={a.eventType} />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{a.description}</p>
                        <p className="text-muted-foreground">{a.eventType} · {formatDate(a.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </NelvyonDsCard>

            <NelvyonDsCard title={t("dashboard.quick_actions")}>
              <div className="space-y-2">
                <NelvyonDsButton
                  className="w-full justify-start"
                  disabled={exportingReport}
                  onClick={async () => {
                    setExportingReport(true);
                    try {
                      const res = await fetch("/api/saas/reports/generate", {
                        method: "POST",
                        credentials: "same-origin",
                      });
                      if (res.status === 401) {
                        router.replace(`/auth/login?next=${encodeURIComponent("/saas/dashboard")}`);
                        return;
                      }
                      if (!res.ok) return;
                      const body = (await res.json()) as { downloadUrl?: string };
                      if (body.downloadUrl) window.location.href = body.downloadUrl;
                    } finally {
                      setExportingReport(false);
                    }
                  }}
                >
                  {exportingReport ? `${t("common.loading")}…` : "Exportar informe ejecutivo (ZIP)"}
                </NelvyonDsButton>
                <NelvyonDsButton asChild className="w-full justify-start">
                  <Link href="/os/execution">Ir a Servicios</Link>
                </NelvyonDsButton>
                <NelvyonDsButton asChild variant="secondary" className="w-full justify-start">
                  <Link href="/saas/dashboard">Abrir CRM</Link>
                </NelvyonDsButton>
                <NelvyonDsButton asChild variant="secondary" className="w-full justify-start">
                  <Link href="/saas/dashboard">Ver Campanas</Link>
                </NelvyonDsButton>
                <NelvyonDsButton asChild variant="secondary" className="w-full justify-start">
                  <Link href="/dashboard/settings">Suscripción y facturación</Link>
                </NelvyonDsButton>
              </div>
              {hasNoJobs ? (
                <div className="mt-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
                  {t("dashboard.empty_state")}
                </div>
              ) : null}
            </NelvyonDsCard>
          </section>
        </main>
      </div>
    </div>
    </DashboardLayout>
  );
}
