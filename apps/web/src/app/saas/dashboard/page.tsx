"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader, NelvyonDsStatusDot, type NelvyonDsStatus } from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CommercialPipelineSection } from "@/features/saas-deals/components/CommercialPipelineSection";
import { SaasEmptyState, SAAS_EMPTY_DESCRIPTION, SAAS_EMPTY_TITLE } from "@/features/saas-shell/components/SaasEmptyState";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { ActivationChecklist } from "@/features/saas-shell/components/ActivationChecklist";
import { trackEvent } from "@/lib/analytics";
import type { SaasPlan, SaasTenantDto } from "../onboarding/components/types";

type ActivityItem = {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
};

type ModuleStats = {
  contacts: number;
  campaigns: number;
  activeWorkflows: number;
  forms: number;
  upcomingAppointments: number;
};

type DashboardSummary = {
  tenant: SaasTenantDto;
  moduleStats?: ModuleStats;
  activeJobs: number;
  completedJobs: number;
  totalSpend: number;
  recentActivity: ActivityItem[];
};



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
    return (
      <div className="px-4 py-10">
        <SaasEmptyState title={SAAS_EMPTY_TITLE} description={error ?? SAAS_EMPTY_DESCRIPTION} />
      </div>
    );
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
        <SaasSidebar
          activeId="dashboard"
          tenantCompany={tenant.companyName}
          tenantPlan={tenant.plan}
          showLanguageSelector
        />

        <main className="space-y-6">
          <NelvyonDsSectionHeader eyebrow="SaaS Dashboard" title={t("dashboard.welcome", { company: tenant.companyName })} subtitle={now} />

          <ActivationChecklist />

          <CommercialPipelineSection />

          {/* Module stats */}
          {summary.moduleStats && (
            <>
              <NelvyonDsSectionHeader
                eyebrow="Marketing"
                title="Estado de tus módulos"
                subtitle="Métricas reales de CRM, campañas, workflows y más."
              />
              <section className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
                {[
                  { label: "Contactos CRM", value: summary.moduleStats.contacts, href: "/saas/crm" },
                  { label: "Campañas", value: summary.moduleStats.campaigns, href: "/saas/campanias" },
                  { label: "Workflows activos", value: summary.moduleStats.activeWorkflows, href: "/saas/workflows" },
                  { label: "Formularios", value: summary.moduleStats.forms, href: "/saas/formularios" },
                  { label: "Citas próximas", value: summary.moduleStats.upcomingAppointments, href: "/saas/citas" },
                ].map((s) => (
                  <Link key={s.label} href={s.href}>
                    <NelvyonDsCard className="transition-colors hover:border-primary/50 hover:bg-primary/5">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="mt-1 text-3xl font-bold text-foreground">{s.value}</p>
                    </NelvyonDsCard>
                  </Link>
                ))}
              </section>
            </>
          )}

          <NelvyonDsSectionHeader
            eyebrow="Operaciones"
            title="Actividad del tenant"
            subtitle="Jobs, gasto y plan de tu espacio SaaS."
          />

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
                <SaasEmptyState
                  title={SAAS_EMPTY_TITLE}
                  description="Cuando haya jobs o eventos del tenant aparecerán aquí."
                />
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
                <NelvyonDsButton asChild variant="secondary" className="w-full justify-start">
                  <Link href="/saas/crm">Abrir CRM</Link>
                </NelvyonDsButton>
                <NelvyonDsButton asChild variant="secondary" className="w-full justify-start">
                  <Link href="/saas/crm?tab=pipeline">Ver pipeline comercial</Link>
                </NelvyonDsButton>
                <NelvyonDsButton asChild variant="secondary" className="w-full justify-start">
                  <Link href="/saas/campanias">Campañas de email</Link>
                </NelvyonDsButton>
                <NelvyonDsButton asChild variant="secondary" className="w-full justify-start">
                  <Link href="/saas/sms">SMS Marketing</Link>
                </NelvyonDsButton>
                <NelvyonDsButton asChild variant="secondary" className="w-full justify-start">
                  <Link href="/saas/whatsapp">WhatsApp Business</Link>
                </NelvyonDsButton>
                <NelvyonDsButton asChild variant="secondary" className="w-full justify-start">
                  <Link href="/saas/workflows">Workflows</Link>
                </NelvyonDsButton>
                <NelvyonDsButton asChild variant="secondary" className="w-full justify-start">
                  <Link href="/saas/formularios">Formularios</Link>
                </NelvyonDsButton>
                <NelvyonDsButton asChild variant="secondary" className="w-full justify-start">
                  <Link href="/saas/citas">Agenda y citas</Link>
                </NelvyonDsButton>
                <NelvyonDsButton asChild variant="secondary" className="w-full justify-start">
                  <Link href="/saas/billing">Facturación</Link>
                </NelvyonDsButton>
              </div>
              {hasNoJobs ? (
                <div className="mt-4">
                  <SaasEmptyState
                    title={SAAS_EMPTY_TITLE}
                    description="Conecta datos o crea el primer registro en CRM, campanas o workflows."
                  />
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
