"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NelvyonDsButton, NelvyonDsStatusDot, type NelvyonDsStatus } from "@/design-system/components";
import { CommercialPipelineSection } from "@/features/saas-deals/components/CommercialPipelineSection";
import { SaasEmptyState, SAAS_EMPTY_DESCRIPTION, SAAS_EMPTY_TITLE } from "@/features/saas-shell/components/SaasEmptyState";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { SaasShellLayout, DarkCard, StatCard } from "@/features/saas-shell/components/SaasShellLayout";
import { ActivationChecklist } from "@/features/saas-shell/components/ActivationChecklist";
import { AccountHealthScore } from "@/features/saas-shell/components/PlatformHealthBanner";
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

type DashboardWidgetId =
  | "health"
  | "activation"
  | "pipeline"
  | "modules"
  | "kpis"
  | "activity"
  | "quickActions";

const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  health: "Salud de cuenta",
  activation: "Checklist activación",
  pipeline: "Pipeline comercial",
  modules: "Módulos activos",
  kpis: "KPIs operaciones",
  activity: "Actividad reciente",
  quickActions: "Acciones rápidas",
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
  const [widgets, setWidgets] = useState<DashboardWidgetId[]>([
    "health", "activation", "pipeline", "modules", "kpis", "activity", "quickActions",
  ]);
  const [showCustomize, setShowCustomize] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
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

        const layoutRes = await fetch("/api/saas/dashboard/layout", { credentials: "same-origin", cache: "no-store" });
        if (layoutRes.ok) {
          const layoutBody = (await layoutRes.json()) as { layout?: { widgets?: DashboardWidgetId[] } };
          if (Array.isArray(layoutBody.layout?.widgets) && layoutBody.layout.widgets.length > 0 && !cancelled) {
            setWidgets(layoutBody.layout.widgets);
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
  const show = (id: DashboardWidgetId) => widgets.includes(id);
  const orderedWidgets = widgets.filter((id) => id !== "health");
  const activityQuickAt = (() => {
    const a = orderedWidgets.indexOf("activity");
    const q = orderedWidgets.indexOf("quickActions");
    const idx = [a, q].filter((i) => i >= 0);
    return idx.length ? Math.min(...idx) : -1;
  })();

  async function persistLayout(next: DashboardWidgetId[]) {
    setWidgets(next);
    setSavingLayout(true);
    try {
      await fetch("/api/saas/dashboard/layout", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: { widgets: next } }),
      });
    } finally {
      setSavingLayout(false);
    }
  }

  async function toggleWidget(id: DashboardWidgetId) {
    const next = widgets.includes(id) ? widgets.filter((w) => w !== id) : [...widgets, id];
    if (next.length === 0) return;
    await persistLayout(next);
  }

  function moveWidget(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= widgets.length || to >= widgets.length) return;
    const next = [...widgets];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    void persistLayout(next);
  }

  return (
    <SaasShellLayout
      sidebar={
        <SaasSidebar
          activeId="dashboard"
          tenantCompany={tenant.companyName}
          tenantPlan={tenant.plan}
          showLanguageSelector
        />
      }
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0084ff]/70">SaaS Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold text-white">{t("dashboard.welcome", { company: tenant.companyName })}</h1>
          <p className="mt-0.5 text-sm text-white/40">{now}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:border-[#0084ff]/40 hover:text-white"
            onClick={() => setShowCustomize((v) => !v)}
          >
            {showCustomize ? "Cerrar widgets" : "Personalizar widgets"}
          </button>
          {show("health") ? <AccountHealthScore /> : null}
        </div>
      </div>

      {showCustomize && (
        <DarkCard>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
            Orden widgets (arrastra) {savingLayout ? "· guardando…" : ""}
          </p>
          <ul className="mb-4 space-y-1">
            {widgets.map((id, index) => (
              <li
                key={id}
                draggable
                onDragStart={() => { (window as unknown as { __dragIdx?: number }).__dragIdx = index; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const from = (window as unknown as { __dragIdx?: number }).__dragIdx;
                  if (typeof from === "number") moveWidget(from, index);
                }}
                className="flex cursor-grab items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70 active:cursor-grabbing"
              >
                <span>⋮⋮ {WIDGET_LABELS[id]}</span>
                <button type="button" className="text-xs text-white/30 hover:text-red-400" onClick={() => toggleWidget(id)}>Ocultar</button>
              </li>
            ))}
          </ul>
          <p className="mb-2 text-xs text-white/30">Añadir widget</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(WIDGET_LABELS) as DashboardWidgetId[])
              .filter((id) => !show(id))
              .map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleWidget(id)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/40 hover:border-[#0084ff]/40"
              >
                + {WIDGET_LABELS[id]}
              </button>
            ))}
          </div>
        </DarkCard>
      )}

      {orderedWidgets.map((id, idx) => {
        if (id === "activity" || id === "quickActions") {
          if (idx !== activityQuickAt) return null;
          if (!show("activity") && !show("quickActions")) return null;
          return (
            <section key="activity-quick" className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              {show("activity") && (
              <DarkCard>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">{t("dashboard.recent_activity")}</p>
                {summary.recentActivity.length === 0 ? (
                  <SaasEmptyState title={SAAS_EMPTY_TITLE} description="Cuando haya jobs o eventos del tenant aparecerán aquí." />
                ) : (
                  <ul className="space-y-3">
                    {summary.recentActivity.slice(0, 10).map((a) => (
                      <li key={a.id} className="flex items-start gap-3 border-b border-white/[0.05] pb-3 text-sm last:border-none">
                        <NelvyonDsStatusDot status={activityStatus(a.eventType)} label={a.eventType} />
                        <div className="min-w-0">
                          <p className="font-medium text-white/80">{a.description}</p>
                          <p className="text-white/35">{a.eventType} · {formatDate(a.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DarkCard>
              )}
              {show("quickActions") && (
              <DarkCard>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">{t("dashboard.quick_actions")}</p>
                <div className="space-y-1.5">
                  {[
                    { label: "🛒 Explorar packs", href: "/saas/packs" },
                    { label: "📋 Ver playbooks recomendados", href: "/saas/playbooks" },
                    { label: "🤝 Abrir Partner Zone", href: "/saas/partner" },
                    { label: "Abrir CRM", href: "/saas/crm" },
                    { label: "Ver pipeline", href: "/saas/crm?tab=pipeline" },
                    { label: "Campañas de email", href: "/saas/campanias" },
                    { label: "Workflows", href: "/saas/workflows" },
                    { label: "Formularios", href: "/saas/formularios" },
                    { label: "Agenda y citas", href: "/saas/citas" },
                    { label: "Facturación", href: "/saas/billing" },
                  ].map((a) => (
                    <Link
                      key={a.href}
                      href={a.href}
                      className="block rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white/60 transition-all hover:border-[#0084ff]/30 hover:bg-[#0084ff]/5 hover:text-white/90"
                    >
                      {a.label}
                    </Link>
                  ))}
                  <button
                    className="mt-2 w-full rounded-lg bg-gradient-to-r from-[#0084ff] to-[#0047ab] px-3 py-2 text-sm font-medium text-white shadow-[0_0_16px_rgba(0,132,255,0.3)] transition-all hover:shadow-[0_0_24px_rgba(0,132,255,0.4)] disabled:opacity-50"
                    disabled={exportingReport}
                    onClick={async () => {
                      setExportingReport(true);
                      try {
                        const res = await fetch("/api/saas/reports/generate", { method: "POST", credentials: "same-origin" });
                        if (res.status === 401) { router.replace(`/auth/login?next=${encodeURIComponent("/saas/dashboard")}`); return; }
                        if (!res.ok) return;
                        const body = (await res.json()) as { downloadUrl?: string };
                        if (body.downloadUrl) window.location.href = body.downloadUrl;
                      } finally { setExportingReport(false); }
                    }}
                  >
                    {exportingReport ? `${t("common.loading")}…` : "Exportar informe (ZIP)"}
                  </button>
                </div>
                {hasNoJobs && (
                  <div className="mt-4">
                    <SaasEmptyState title={SAAS_EMPTY_TITLE} description="Conecta datos o crea el primer registro." />
                  </div>
                )}
              </DarkCard>
              )}
            </section>
          );
        }

        if (!show(id)) return null;

        if (id === "activation") return <ActivationChecklist key={id} />;
        if (id === "pipeline") return show("pipeline") ? <CommercialPipelineSection key={id} /> : null;

        if (id === "modules" && summary.moduleStats) {
          return (
            <section key={id}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Módulos activos</p>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {[
                  { label: "Contactos CRM", value: summary.moduleStats.contacts, href: "/saas/crm", accent: true },
                  { label: "Campañas", value: summary.moduleStats.campaigns, href: "/saas/campanias", accent: false },
                  { label: "Workflows", value: summary.moduleStats.activeWorkflows, href: "/saas/workflows", accent: false },
                  { label: "Formularios", value: summary.moduleStats.forms, href: "/saas/formularios", accent: false },
                  { label: "Citas próximas", value: summary.moduleStats.upcomingAppointments, href: "/saas/citas", accent: false },
                ].map((s) => (
                  <StatCard key={s.label} label={s.label} value={s.value} href={s.href} accent={s.accent} />
                ))}
              </div>
            </section>
          );
        }

        if (id === "kpis") {
          return (
            <section key={id}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Operaciones</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((k, i) => (
                  <StatCard key={k.label} label={k.label} value={k.value} accent={i === 0} />
                ))}
              </div>
            </section>
          );
        }

        return null;
      })}
    </SaasShellLayout>
  );
}
