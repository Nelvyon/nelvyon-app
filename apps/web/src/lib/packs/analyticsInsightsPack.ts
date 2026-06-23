import { getGA4Service } from "../../../../../backend/integrations/GoogleAnalytics4Service";

import { buildGa4DemoFixture } from "@/lib/integrations/ga4/ga4DemoFixture";
import {
  computeMvpInsight,
  fetchGa4MvpMetrics,
  type Ga4MvpInsight,
  type Ga4MvpRawMetrics,
} from "@/lib/integrations/ga4/ga4Insights";
import { dbCreatePackDeliverable } from "@/lib/packs/packOsDb";
import {
  createPackRun,
  getPackRun,
  markStep,
  updatePackRun,
} from "@/lib/packs/packRunStore";
import type {
  AnalyticsInsightsPackIntake,
  GrowthPackIntakeBase,
  PackReport,
  PackReportSection,
  PackRunRecord,
  PackStep,
} from "@/lib/packs/types";
import {
  ANALYTICS_INSIGHTS_PACK_ID,
  ANALYTICS_INSIGHTS_STEP_DEFINITIONS,
} from "@/lib/packs/types";

export const ANALYTICS_INSIGHTS_META = {
  id: ANALYTICS_INSIGHTS_PACK_ID,
  name: "Analytics Insights",
  tagline: "Insight accionable desde tu GA4 en minutos",
  accent: "from-slate-500/10 via-card to-card",
  kickoffPath: "/os/packs/analytics-insights",
  reportPath: "/dashboard/analytics-insights",
};

function ga4DemoFallbackEnabled(): boolean {
  return process.env.GA4_DEMO_FALLBACK === "1" || process.env.NODE_ENV !== "production";
}

function buildReportSections(
  insight: Ga4MvpInsight,
  raw: Ga4MvpRawMetrics,
  provenance: PackReport["data_provenance"],
): PackReportSection[] {
  return [
    {
      id: "insight",
      title: "Insight principal",
      summary: insight.headline,
      bullets: insight.channel_breakdown.slice(0, 5).map(
        (c) => `${c.channel}: ${c.sessions.toLocaleString("es-ES")} sesiones (${c.share_pct}%)`,
      ),
      recommendations: insight.recommendations,
      metrics: [
        { label: "Sesiones totales", value: raw.total_sessions.toLocaleString("es-ES") },
        { label: "Conversiones", value: String(raw.total_conversions) },
        { label: "Ventana", value: `${raw.period_days} días` },
        { label: "Fuente", value: provenance === "ga4" ? "GA4 live" : "Demo fixture" },
      ],
    },
    {
      id: "channels",
      title: "Canales de adquisición",
      summary: "Distribución de sesiones por canal por defecto de GA4.",
      bullets: insight.channel_breakdown.map(
        (c) => `${c.channel} — ${c.share_pct}% del tráfico`,
      ),
      recommendations: [
        {
          action: "Comparar CPL/CPA por canal en Ads + CRM",
          impact: "Priorizar inversión en canales con mejor conversión",
          priority: "medium",
        },
      ],
    },
    {
      id: "landing",
      title: "Landing y conversión",
      summary: insight.landing_gap
        ? `La página ${insight.landing_gap.path} tiene gap de conversión frente a la media.`
        : "Ninguna landing supera el umbral de gap en este periodo.",
      bullets: insight.landing_gap
        ? [
            `Ruta: ${insight.landing_gap.path}`,
            `Sesiones: ${insight.landing_gap.sessions}`,
            `Conv. página: ${insight.landing_gap.conversion_rate_pct}%`,
            `Media sitio: ${insight.landing_gap.site_avg_conversion_rate_pct}%`,
          ]
        : ["Revisar cuando haya ≥100 sesiones por landing"],
      recommendations: insight.landing_gap
        ? [
            {
              action: `Test A/B en CTA de ${insight.landing_gap.path}`,
              impact: "Cerrar gap de conversión detectado",
              priority: "high",
            },
          ]
        : [],
    },
    {
      id: "events",
      title: "Eventos clave GA4",
      summary:
        insight.missing_events.length > 0
          ? `Faltan eventos: ${insight.missing_events.join(", ")}`
          : "Eventos clave detectados en la propiedad.",
      bullets: raw.key_events.map((e) => `${e.eventName}: ${e.eventCount} eventos`),
      recommendations:
        insight.missing_events.length > 0
          ? [
              {
                action: `Implementar ${insight.missing_events[0]} en GTM o gtag`,
                impact: "Medición fiable de leads/ventas",
                priority: "high",
              },
            ]
          : [
              {
                action: "Validar eventos en DebugView",
                impact: "QA de tracking antes de escalar ads",
                priority: "low",
              },
            ],
    },
  ];
}

function buildAnalyticsReport(params: {
  intake: AnalyticsInsightsPackIntake;
  insight: Ga4MvpInsight;
  raw: Ga4MvpRawMetrics;
  provenance: PackReport["data_provenance"];
}): PackReport {
  const { intake, insight, raw, provenance } = params;
  return {
    pack_name: ANALYTICS_INSIGHTS_META.name,
    pack_id: ANALYTICS_INSIGHTS_PACK_ID,
    business_name: intake.business_name,
    sector: "analytics",
    completed_at: new Date().toISOString(),
    summary: insight.headline,
    data_provenance: provenance,
    live_insight: {
      headline: insight.headline,
      channel_breakdown: insight.channel_breakdown,
      landing_gap: insight.landing_gap,
      missing_events: insight.missing_events,
      period_days: raw.period_days,
      property_id: raw.property_id,
    },
    kpis: {
      deliverables_published: 2,
      avg_qa_score: provenance === "ga4" ? 100 : 92,
      skus_passed: 1,
      skus_total: 1,
      saas_client_id: null,
      saas_campaign_id: null,
    },
    sku_results: [
      {
        sku: "NELVYON-ANALYTICS",
        qa_score: provenance === "ga4" ? 100 : 92,
        passed: true,
        escalated: false,
        deliverable_ids: [],
      },
    ],
    sections: buildReportSections(insight, raw, provenance),
    next_steps: [
      provenance === "ga4"
        ? "Compartir informe con el cliente en portal"
        : "Conectar GA4 real en Integraciones para datos live",
      "Aplicar recomendación #1 esta semana",
      "Relanzar pack a 30 días para comparar evolución",
    ],
    portal_path: "/portal",
  };
}

export async function runAnalyticsInsightsPack(params: {
  workspaceId: number;
  userId: string;
  intake: AnalyticsInsightsPackIntake;
}): Promise<PackRunRecord> {
  const periodDays = params.intake.period_days ?? 28;
  let steps: PackStep[] = ANALYTICS_INSIGHTS_STEP_DEFINITIONS.map((s) => ({
    key: s.key,
    label: s.label,
    status: "pending",
  }));

  const run = await createPackRun({
    workspaceId: params.workspaceId,
    userId: params.userId,
    packId: ANALYTICS_INSIGHTS_PACK_ID,
    intake: {
      ...params.intake,
      sector: "analytics",
      city: "",
      value_proposition: "Analytics Insights GA4",
      primary_cta: "Ver informe",
    } as GrowthPackIntakeBase & { sector: string },
    stepDefinitions: ANALYTICS_INSIGHTS_STEP_DEFINITIONS,
  });

  const advance = async (
    key: string,
    status: "done" | "failed" | "skipped",
    detail?: string,
  ) => {
    steps = markStep(steps, key, status, detail);
    await updatePackRun(run.id, { steps });
  };

  try {
    const ga4 = getGA4Service();
    const creds = await ga4.getCredentials(params.userId);
    const useDemo =
      Boolean(params.intake.demo_mode) &&
      !creds &&
      ga4DemoFallbackEnabled();

    if (creds) {
      await advance("ga4_auth", "done", `Propiedad ${creds.propertyId}`);
    } else if (useDemo) {
      await advance("ga4_auth", "skipped", "Modo demo — sin OAuth GA4");
    } else {
      await advance("ga4_auth", "failed", "GA4 no conectado");
      await updatePackRun(run.id, {
        status: "needs_review",
        error_message: "Conecta Google Analytics 4 antes de lanzar, o usa demo_mode en staging.",
        completed_at: new Date().toISOString(),
      });
      return (await getPackRun(run.id))!;
    }

    let raw: Ga4MvpRawMetrics;
    let provenance: PackReport["data_provenance"];

    if (useDemo) {
      raw = buildGa4DemoFixture(periodDays);
      provenance = "demo";
      await advance("ga4_fetch", "done", "Fixture demo (staging)");
    } else {
      raw = await fetchGa4MvpMetrics({
        userId: params.userId,
        propertyId: params.intake.property_id,
        periodDays,
      });
      provenance = "ga4";
      await advance("ga4_fetch", "done", `${raw.total_sessions} sesiones`);
    }

    const insight = computeMvpInsight(raw);
    await advance("insight_compute", "done", insight.channel_breakdown[0]?.channel ?? "—");

    const report = buildAnalyticsReport({ intake: params.intake, insight, raw, provenance });
    await advance("report", "done");

    await dbCreatePackDeliverable({
      workspaceId: params.workspaceId,
      clientId: `analytics-${run.id.slice(0, 8)}`,
      projectId: run.id,
      title: "Informe Analytics Insights",
      type: "json",
      visibility: "client_visible",
      metadata: {
        pack_id: ANALYTICS_INSIGHTS_PACK_ID,
        pack_run_id: run.id,
        data_provenance: provenance,
        live_insight: report.live_insight,
      },
    });

    await advance("complete", "done");
    await updatePackRun(run.id, {
      status: "completed",
      report,
      completed_at: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Analytics pack failed";
    await updatePackRun(run.id, {
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    });
  }

  return (await getPackRun(run.id))!;
}

export function validateAnalyticsInsightsIntake(
  body: unknown,
): AnalyticsInsightsPackIntake | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  const business_name = String(o.business_name ?? "").trim();
  if (!business_name) return null;
  const periodRaw = Number(o.period_days ?? 28);
  const period_days = periodRaw === 7 || periodRaw === 90 ? periodRaw : 28;
  const parent = String(o.parent_pack_id ?? "").trim();
  const parent_pack_id =
    parent === "local-business-growth" ||
    parent === "ecommerce-growth" ||
    parent === "saas-b2b-growth"
      ? parent
      : undefined;
  return {
    business_name,
    property_id: o.property_id ? String(o.property_id) : undefined,
    landing_path: o.landing_path ? String(o.landing_path) : undefined,
    period_days,
    parent_pack_id,
    demo_mode: o.demo_mode === true || o.demo_mode === "true",
  };
}
