"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialPipelineSection } from "@/features/saas-deals/components/CommercialPipelineSection";
import { SAAS_EMPTY_DESCRIPTION, SAAS_EMPTY_TITLE } from "@/features/saas-shell/components/SaasEmptyState";
import { ActivationChecklist } from "@/features/saas-shell/components/ActivationChecklist";
import { AccountHealthScore } from "@/features/saas-shell/components/PlatformHealthBanner";
import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import {
  W3crmAvatar,
  W3crmCard,
  W3crmEmptyState,
  W3crmKpiTile,
  W3crmSectionTitle,
  W3crmStatCard,
  W3crmStatusBadge,
} from "@/features/saas-w3crm/components/W3crmUi";
import { trackEvent } from "@/lib/analytics";
import type { SaasTenantDto } from "../onboarding/components/types";

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
  degraded?: boolean;
  degraded_reason?: string;
};

type DashboardWidgetId =
  | "health"
  | "activation"
  | "competitorGap"
  | "geoVisibility"
  | "pipeline"
  | "modules"
  | "kpis"
  | "activity"
  | "quickActions";

const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  health: "Salud de cuenta",
  activation: "Checklist activación",
  competitorGap: "Competitor Gap",
  geoVisibility: "GEO / AI Visibility",
  pipeline: "Pipeline comercial",
  modules: "Módulos activos",
  kpis: "KPIs operaciones",
  activity: "Actividad reciente",
  quickActions: "Acciones rápidas",
};

type GapSummary = {
  gapScore: number | null;
  recommendedPackId: string | null;
  competitorDomain: string | null;
} | null;

type GeoSummary = {
  domain: string;
  score: number | null;
  id: string;
} | null;

function activityStatus(type: string): string {
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
  const [gapSummary, setGapSummary] = useState<GapSummary>(null);
  const [geoSummary, setGeoSummary] = useState<GeoSummary>(null);
  const [geoAnalyzing, setGeoAnalyzing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/saas/dashboard", { credentials: "same-origin", cache: "no-store" });
        if (res.status === 401) {
          router.replace(`/auth/login?next=${encodeURIComponent("/saas/dashboard")}`);
          return;
        }
        // New auth users have JWT but no saas_tenants row until onboarding.
        if (res.status === 404) {
          router.replace("/saas/onboarding");
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
      } catch {
        if (!cancelled) setError(t("common.error"));
      } finally {
        // Primary payload only — never leave the shell blocked on secondary widgets.
        if (!cancelled) setLoading(false);
      }

      if (cancelled) return;

      try {
        const layoutRes = await fetch("/api/saas/dashboard/layout", { credentials: "same-origin", cache: "no-store" });
        if (layoutRes.ok) {
          const layoutBody = (await layoutRes.json()) as { layout?: { widgets?: DashboardWidgetId[] } };
          if (Array.isArray(layoutBody.layout?.widgets) && layoutBody.layout.widgets.length > 0 && !cancelled) {
            setWidgets(layoutBody.layout.widgets);
          }
        }
      } catch {
        /* non-fatal widget layout */
      }

      try {
        const gapRes = await fetch("/api/saas/competitor-gap", { credentials: "same-origin", cache: "no-store" });
        if (gapRes.ok && !cancelled) {
          const gapBody = (await gapRes.json()) as { summary?: GapSummary };
          setGapSummary(gapBody.summary ?? null);
        }
      } catch {
        /* non-fatal */
      }

      try {
        const geoRes = await fetch("/api/saas/geo-visibility", { credentials: "same-origin", cache: "no-store" });
        if (geoRes.ok && !cancelled) {
          const geoBody = (await geoRes.json()) as { runs?: Array<{ id: string; domain: string; score: number | null }> };
          const latest = geoBody.runs?.[0];
          if (latest) {
            setGeoSummary({ id: latest.id, domain: latest.domain, score: latest.score });
          }
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, t]);

  if (loading) {
    return (
      <SaasW3crmShell>
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-center py-5" role="status">
            <div className="spinner-border text-primary me-3" aria-hidden="true" />
            <span className="text-muted">{t("common.loading")}…</span>
          </div>
        </div>
      </SaasW3crmShell>
    );
  }

  if (!summary) {
    return (
      <SaasW3crmShell>
        <div className="container-fluid">
          <W3crmCard>
            <W3crmEmptyState title={SAAS_EMPTY_TITLE} description={error ?? SAAS_EMPTY_DESCRIPTION} />
          </W3crmCard>
        </div>
      </SaasW3crmShell>
    );
  }

  const { tenant } = summary;
  if (!tenant.onboardingCompleted) {
    return null;
  }

  const kpis = [
    { label: t("dashboard.active_jobs"), value: summary.activeJobs, icon: "⚙️" },
    { label: t("dashboard.completed_jobs"), value: summary.completedJobs, icon: "✅" },
    { label: t("dashboard.total_spend"), value: `${summary.totalSpend.toFixed(2)} EUR`, icon: "💶" },
    { label: t("dashboard.current_plan"), value: tenant.plan, icon: "📦" },
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
    <SaasW3crmShell>
      <div className="container-fluid">
        {/* Cabecera de página — patrón `page-titles` de W3CRM */}
        <div className="row page-titles mx-0">
          <div className="col-sm-6 p-md-0">
            <div className="welcome-text">
              <span className="d-block text-primary fs-13 fw-bold text-uppercase">SaaS Dashboard</span>
              <h4 className="mb-0">{t("dashboard.welcome", { company: tenant.companyName })}</h4>
              <span className="text-muted fs-14">{now}</span>
            </div>
          </div>
          <div className="col-sm-6 p-md-0 d-flex justify-content-sm-end align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => setShowCustomize((v) => !v)}
            >
              {showCustomize ? "Cerrar widgets" : "Personalizar widgets"}
            </button>
            {show("health") ? <AccountHealthScore /> : null}
          </div>
        </div>

        {summary.degraded ? (
          <div className="alert alert-warning" role="status">
            Algunas métricas pueden estar incompletas o en cero por un fallo parcial de datos
            {summary.degraded_reason ? ` (${summary.degraded_reason})` : ""}. No interpretes estos valores como KPIs reales.
          </div>
        ) : null}

        {showCustomize && (
          <W3crmCard title={`Orden widgets (arrastra)${savingLayout ? " · guardando…" : ""}`}>
            <ul className="list-group mb-4">
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
                  className="list-group-item d-flex align-items-center justify-content-between"
                  style={{ cursor: "grab" }}
                >
                  <span>⋮⋮ {WIDGET_LABELS[id]}</span>
                  <button type="button" className="btn btn-link btn-sm text-danger p-0" onClick={() => toggleWidget(id)}>
                    Ocultar
                  </button>
                </li>
              ))}
            </ul>
            <p className="mb-2 text-muted fs-14">Añadir widget</p>
            <div className="d-flex flex-wrap gap-2">
              {(Object.keys(WIDGET_LABELS) as DashboardWidgetId[])
                .filter((id) => !show(id))
                .map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleWidget(id)}
                    className="btn btn-outline-primary btn-xs"
                  >
                    + {WIDGET_LABELS[id]}
                  </button>
                ))}
            </div>
          </W3crmCard>
        )}

        {orderedWidgets.map((id, idx) => {
          if (id === "activity" || id === "quickActions") {
            if (idx !== activityQuickAt) return null;
            if (!show("activity") && !show("quickActions")) return null;
            return (
              <div key="activity-quick" className="row">
                {show("activity") && (
                  <div className="col-xl-8 col-lg-7">
                    <W3crmCard title={t("dashboard.recent_activity")}>
                      {summary.recentActivity.length === 0 ? (
                        <W3crmEmptyState
                          title={SAAS_EMPTY_TITLE}
                          description="Cuando haya jobs o eventos del tenant aparecerán aquí."
                        />
                      ) : (
                        <ul className="list-unstyled mb-0">
                          {summary.recentActivity.slice(0, 10).map((a) => (
                            <li key={a.id} className="d-flex align-items-start gap-3 border-bottom py-3">
                              <W3crmAvatar seed={a.id} label={a.eventType} />
                              <div className="flex-grow-1 min-w-0">
                                <div className="d-flex align-items-center">
                                  <W3crmStatusBadge status={activityStatus(a.eventType)} label={a.eventType} />
                                  <span className="fw-medium">{a.description}</span>
                                </div>
                                <p className="mb-0 text-muted fs-13">
                                  {a.eventType} · {formatDate(a.createdAt)}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </W3crmCard>
                  </div>
                )}
                {show("quickActions") && (
                  <div className="col-xl-4 col-lg-5">
                    <W3crmCard title={t("dashboard.quick_actions")}>
                      <div className="list-group list-group-flush">
                        {[
                          { label: "Explorar packs", href: "/saas/packs" },
                          { label: "Ver playbooks recomendados", href: "/saas/playbooks" },
                          { label: "Abrir Partner Zone", href: "/saas/partner" },
                          { label: "Abrir CRM", href: "/saas/crm" },
                          { label: "Ver pipeline", href: "/saas/crm?tab=pipeline" },
                          { label: "Campañas de email", href: "/saas/campanias" },
                          { label: "Workflows", href: "/saas/workflows" },
                          { label: "Formularios", href: "/saas/formularios" },
                          { label: "Agenda y citas", href: "/saas/citas" },
                          { label: "Facturación", href: "/saas/billing" },
                        ].map((a) => (
                          <Link key={a.href} href={a.href} className="list-group-item list-group-item-action">
                            {a.label}
                          </Link>
                        ))}
                      </div>
                      <button
                        className="btn btn-primary w-100 mt-3"
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
                      {hasNoJobs && (
                        <div className="mt-4">
                          <W3crmEmptyState title={SAAS_EMPTY_TITLE} description="Conecta datos o crea el primer registro." />
                        </div>
                      )}
                    </W3crmCard>
                  </div>
                )}
              </div>
            );
          }

          if (!show(id)) return null;

          if (id === "activation") return <ActivationChecklist key={id} />;
          if (id === "competitorGap") {
            return (
              <W3crmCard key={id} title="Competitor Gap (semanal)">
                {gapSummary ? (
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-4">
                    <div>
                      <h2 className="mb-0">{gapSummary.gapScore ?? "—"}</h2>
                      <p className="mb-0 text-muted">vs {gapSummary.competitorDomain ?? "competidor"}</p>
                      {gapSummary.recommendedPackId && (
                        <p className="mb-0 text-primary fs-13">Pack recomendado: {gapSummary.recommendedPackId}</p>
                      )}
                    </div>
                    <Link href="/saas/brief-to-launch" className="btn btn-primary">
                      Lanzar pack →
                    </Link>
                  </div>
                ) : (
                  <p className="mb-0 text-muted">Configura tu dominio en ajustes y ejecuta un análisis de gap.</p>
                )}
              </W3crmCard>
            );
          }
          if (id === "geoVisibility") {
            return (
              <W3crmCard key={id} title="GEO / AI Visibility">
                {geoSummary ? (
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-4">
                    <div>
                      <h2 className="mb-0">
                        {geoSummary.score ?? "—"}
                        <span className="fs-16 text-muted">/100</span>
                      </h2>
                      <p className="mb-0 text-muted">{geoSummary.domain}</p>
                      <p className="mb-0 text-muted fs-13">Schema · FAQ · llms.txt — 0€ sin LLM</p>
                    </div>
                    <div className="d-flex flex-column gap-2">
                      <a href={`/api/saas/geo-visibility/${geoSummary.id}/pdf`} className="btn btn-outline-primary">
                        PDF informe
                      </a>
                      <Link href="/saas/setup" className="btn btn-primary">
                        Re-analizar →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-4">
                    <p className="mb-0 text-muted">Audita citación en ChatGPT/Perplexity (determinístico).</p>
                    <button
                      type="button"
                      disabled={geoAnalyzing}
                      onClick={async () => {
                        setGeoAnalyzing(true);
                        try {
                          const res = await fetch("/api/saas/geo-visibility", { method: "POST", credentials: "same-origin" });
                          if (res.ok) {
                            const body = (await res.json()) as { run?: { id: string; domain: string; score: number | null } };
                            if (body.run) setGeoSummary({ id: body.run.id, domain: body.run.domain, score: body.run.score });
                          }
                        } finally {
                          setGeoAnalyzing(false);
                        }
                      }}
                      className="btn btn-primary"
                    >
                      {geoAnalyzing ? "Analizando…" : "Analizar GEO"}
                    </button>
                  </div>
                )}
              </W3crmCard>
            );
          }
          if (id === "pipeline") return show("pipeline") ? <CommercialPipelineSection key={id} /> : null;

          if (id === "modules" && summary.moduleStats) {
            return (
              <section key={id}>
                <W3crmSectionTitle title="Módulos activos" />
                <div className="row">
                  {[
                    { label: "Contactos CRM", value: summary.moduleStats.contacts, href: "/saas/crm", accent: true },
                    { label: "Campañas", value: summary.moduleStats.campaigns, href: "/saas/campanias", accent: false },
                    { label: "Workflows", value: summary.moduleStats.activeWorkflows, href: "/saas/workflows", accent: false },
                    { label: "Formularios", value: summary.moduleStats.forms, href: "/saas/formularios", accent: false },
                    { label: "Citas próximas", value: summary.moduleStats.upcomingAppointments, href: "/saas/citas", accent: false },
                  ].map((s) => (
                    <div key={s.label} className="col-xl-3 col-lg-4 col-sm-6">
                      <W3crmStatCard label={s.label} value={s.value} href={s.href} accent={s.accent} />
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (id === "kpis") {
            return (
              <section key={id}>
                <W3crmSectionTitle title="Operaciones" />
                <div className="row">
                  {kpis.map((k, i) => (
                    <div key={k.label} className="col-xl-3 col-lg-6 col-sm-6">
                      <W3crmKpiTile icon={k.icon} label={k.label} value={k.value} accent={i === 0} />
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          return null;
        })}
      </div>
    </SaasW3crmShell>
  );
}
