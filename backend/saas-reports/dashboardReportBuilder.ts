import { buildStylesCss, extractDesignTokens } from "../os-agents/agents/webStaticBuilder";
import {
  formatBenchmarkComparison,
  getBenchmark,
  resolveIndustryKey,
} from "../os-agents/benchmarks/industryBenchmarks";
import {
  createArtifactZip,
  publishArtifactZip,
  type PublishArtifactResult,
} from "../os-agents/artifacts/artifactPublisher";
import { escapeHtml, isValidHtmlDocument, parseLooseJson } from "../os-agents/artifacts/htmlUtils";
import type {
  ConversionChartData,
  MRRChartData,
  ROIChartData,
  TrafficChartData,
} from "../saas/DashboardMetricsService";

export type DashboardReportFileMap = {
  "report.html": string;
  "assets/styles.css": string;
};

export const DASHBOARD_REPORT_REQUIRED_FILES: (keyof DashboardReportFileMap)[] = [
  "report.html",
  "assets/styles.css",
];

export interface DashboardReportChartSeries {
  label: string;
  points: Array<Record<string, unknown>>;
}

export interface DashboardReportInput {
  companyName: string;
  industry?: string;
  plan?: string;
  generatedAt?: string;
  activeJobs?: number;
  completedJobs?: number;
  totalSpend?: number;
  metrics?: {
    roi?: ROIChartData[];
    traffic?: TrafficChartData[];
    conversions?: ConversionChartData[];
    mrr?: MRRChartData[];
  };
  charts?: DashboardReportChartSeries[];
  aiRecommendations?: string[];
  nextSteps?: string[];
}

const DEFAULT_TOKENS_JSON = JSON.stringify({
  colorPalette: {
    primary: "#0f172a",
    secondary: "#64748b",
    accent: "#2563eb",
    background: "#ffffff",
    text: "#1e293b",
  },
});

function asList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => (typeof x === "string" ? x : String(x))).filter((s) => s.trim().length > 0);
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function sectionBlock(title: string, items: string[]): string {
  if (!items.length) return "";
  return `<section class="report-section">
  <h2>${escapeHtml(title)}</h2>
  <ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
</section>`;
}

function metricsGrid(entries: { label: string; value: string; hint?: string }[]): string {
  if (!entries.length) return "";
  return `<section class="metrics-grid">
  ${entries
    .map(
      (e) => `<div class="metric-card">
    <p class="metric-label">${escapeHtml(e.label)}</p>
    <p class="metric-value">${escapeHtml(e.value)}</p>
    ${e.hint ? `<p class="metric-hint">${escapeHtml(e.hint)}</p>` : ""}
  </div>`,
    )
    .join("")}
</section>`;
}

function reportShell(title: string, brand: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — ${escapeHtml(brand)}</title>
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <header class="doc-header">
    <p class="eyebrow">NELVYON SaaS · Informe ejecutivo</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(brand)}</p>
  </header>
  <main class="doc-main">${body}</main>
  <footer class="doc-footer"><p>Generado por NELVYON SaaS</p></footer>
</body>
</html>`;
}

function tableFromRows(headers: string[], rows: string[][]): string {
  if (!rows.length) return `<p class="muted">Sin datos disponibles para este periodo.</p>`;
  return `<div class="table-wrap"><table>
  <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
  <tbody>${rows
    .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody>
</table></div>`;
}

function aggregateRoi(roi: ROIChartData[] | undefined): {
  revenue: number;
  spend: number;
  roiPct: number;
} {
  if (!roi?.length) return { revenue: 0, spend: 0, roiPct: 0 };
  const revenue = roi.reduce((a, r) => a + num(r.revenue), 0);
  const spend = roi.reduce((a, r) => a + num(r.spend), 0);
  const roiPct = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
  return { revenue, spend, roiPct };
}

function aggregateTraffic(traffic: TrafficChartData[] | undefined): {
  sessions: number;
  users: number;
  conversions: number;
} {
  if (!traffic?.length) return { sessions: 0, users: 0, conversions: 0 };
  return {
    sessions: traffic.reduce((a, t) => a + num(t.sessions), 0),
    users: traffic.reduce((a, t) => a + num(t.users), 0),
    conversions: traffic.reduce((a, t) => a + num(t.conversions), 0),
  };
}

function defaultRecommendations(input: DashboardReportInput): string[] {
  const rec: string[] = [];
  const { revenue, spend, roiPct } = aggregateRoi(input.metrics?.roi);
  const traffic = aggregateTraffic(input.metrics?.traffic);
  const convRate = traffic.sessions > 0 ? traffic.conversions / traffic.sessions : 0;

  if (spend > 0 && roiPct < 0) {
    rec.push("Revisar asignación de presupuesto por canal: el ROI agregado del periodo es negativo.");
  } else if (roiPct > 50) {
    rec.push("Escalar inversión en los canales con mejor ROAS manteniendo controles de atribución.");
  }
  if (traffic.sessions > 0 && convRate < 0.02) {
    rec.push("Optimizar embudos de conversión y landing pages vinculadas a campañas activas.");
  }
  if ((input.completedJobs ?? 0) === 0 && (input.activeJobs ?? 0) === 0) {
    rec.push("Activar agentes OS para generar primeras entregas medibles en CRM y campañas.");
  }
  const lastMrr = input.metrics?.mrr?.slice(-1)[0];
  if (lastMrr && num(lastMrr.growth) < 0) {
    rec.push("Analizar churn y upsell: el MRR muestra contracción en el último mes registrado.");
  }
  if (!rec.length) {
    rec.push("Consolidar métricas semanales y fijar 2–3 KPIs norte para el próximo ciclo.");
  }
  return rec.slice(0, 6);
}

function defaultNextSteps(input: DashboardReportInput): string[] {
  return [
    "Conectar o validar integraciones de campañas (Google Ads, Meta, GA4) para enriquecer el informe.",
    "Definir objetivo trimestral y umbral de ROI aceptable por canal.",
    "Programar revisión ejecutiva quincenal con este informe como plantilla base.",
    input.industry
      ? `Comparar conversión frente al benchmark de ${input.industry} en la próxima iteración.`
      : "Seleccionar industria en el perfil para activar benchmarks sectoriales.",
  ].slice(0, 5);
}

function buildBenchmarkLines(input: DashboardReportInput): string[] {
  try {
    const industry = resolveIndustryKey({ industry: input.industry });
    const lines: string[] = [];
    const traffic = aggregateTraffic(input.metrics?.traffic);
    const convRate = traffic.sessions > 0 ? traffic.conversions / traffic.sessions : 0;
    const benchConv = getBenchmark("googleAds", "averageConversionRate", industry);
    if (benchConv !== null && traffic.sessions > 0) {
      lines.push(formatBenchmarkComparison(convRate, benchConv, "tasa de conversión", { asRate: true }));
    }
    const { roiPct } = aggregateRoi(input.metrics?.roi);
    if (Number.isFinite(roiPct) && traffic.sessions > 0) {
      lines.push(
        `ROI agregado del periodo: ${roiPct.toFixed(1)}% (referencia interna; comparar con objetivo de negocio).`,
      );
    }
    const benchCtr = getBenchmark("googleAds", "averageCTR", industry);
    if (benchCtr !== null) {
      lines.push(
        `CTR de referencia sectorial (Search): ${(benchCtr * 100).toFixed(2)}% — útil para evaluar creatividades y keywords.`,
      );
    }
    return lines.slice(0, 5);
  } catch {
    return [];
  }
}

function buildExecutiveSummary(input: DashboardReportInput): string {
  const { revenue, spend, roiPct } = aggregateRoi(input.metrics?.roi);
  const traffic = aggregateTraffic(input.metrics?.traffic);
  const parts: string[] = [];
  parts.push(
    `Informe consolidado para ${input.companyName || "su organización"} con datos de campañas y operaciones conectadas en NELVYON.`,
  );
  if (input.generatedAt) {
    parts.push(`Periodo de corte: ${input.generatedAt}.`);
  }
  if (spend > 0 || revenue > 0) {
    parts.push(
      `Inversión publicitaria registrada: ${spend.toFixed(2)} EUR · Ingresos atribuidos: ${revenue.toFixed(2)} EUR · ROI: ${roiPct.toFixed(1)}%.`,
    );
  }
  if (traffic.sessions > 0) {
    parts.push(
      `Tráfico: ${traffic.sessions.toLocaleString("es-ES")} sesiones, ${traffic.conversions.toLocaleString("es-ES")} conversiones.`,
    );
  }
  if (typeof input.activeJobs === "number" || typeof input.completedJobs === "number") {
    parts.push(
      `Operaciones OS: ${input.activeJobs ?? 0} trabajos activos, ${input.completedJobs ?? 0} completados.`,
    );
  }
  return parts.join(" ");
}

/** Genera report.html + assets/styles.css a partir de métricas de dashboard (tolerante a datos parciales). */
export function buildDashboardReportFiles(input: DashboardReportInput): DashboardReportFileMap {
  try {
    const brand = input.companyName?.trim() || "NELVYON Client";
    const industry = input.industry?.trim() || "general";
    const tokens = extractDesignTokens(DEFAULT_TOKENS_JSON, brand);
    const metrics = input.metrics ?? {};
    const { revenue, spend, roiPct } = aggregateRoi(metrics.roi);
    const traffic = aggregateTraffic(metrics.traffic);

    const kpiCards: { label: string; value: string; hint?: string }[] = [];
    if (spend > 0 || revenue > 0) {
      kpiCards.push({ label: "ROI periodo", value: `${roiPct.toFixed(1)}%` });
      kpiCards.push({ label: "Ingresos", value: `${revenue.toFixed(0)} EUR` });
      kpiCards.push({ label: "Inversión", value: `${spend.toFixed(0)} EUR` });
    }
    if (traffic.sessions > 0) {
      kpiCards.push({ label: "Sesiones", value: traffic.sessions.toLocaleString("es-ES") });
      kpiCards.push({
        label: "Conversiones",
        value: traffic.conversions.toLocaleString("es-ES"),
        hint:
          traffic.sessions > 0
            ? `CR ${((traffic.conversions / traffic.sessions) * 100).toFixed(2)}%`
            : undefined,
      });
    }
    if (typeof input.totalSpend === "number" && input.totalSpend > 0) {
      kpiCards.push({ label: "Gasto OS", value: `${input.totalSpend.toFixed(2)} EUR` });
    }
    const lastMrr = metrics.mrr?.slice(-1)[0];
    if (lastMrr) {
      kpiCards.push({
        label: "MRR",
        value: `${num(lastMrr.mrr).toFixed(0)} EUR`,
        hint: `Δ ${num(lastMrr.growth).toFixed(1)}%`,
      });
    }
    if (!kpiCards.length) {
      kpiCards.push({ label: "Estado", value: "Sin métricas", hint: "Conecta campañas para poblar el informe" });
    }

    const roiRows = (metrics.roi ?? []).slice(-14).map((r) => [
      r.date,
      `${num(r.revenue).toFixed(0)} EUR`,
      `${num(r.spend).toFixed(0)} EUR`,
      `${num(r.roi).toFixed(1)}%`,
    ]);

    const trafficRows = (metrics.traffic ?? []).slice(-14).map((t) => [
      t.date,
      String(t.sessions),
      String(t.users),
      String(t.conversions),
    ]);

    const channelRows = (metrics.conversions ?? []).map((c) => [
      c.name,
      String(c.value),
      `${num(c.percentage).toFixed(1)}%`,
    ]);

    const mrrRows = (metrics.mrr ?? []).map((m) => [
      m.month,
      `${num(m.mrr).toFixed(0)} EUR`,
      `${num(m.growth).toFixed(1)}%`,
    ]);

    const recommendations = asList(input.aiRecommendations).length
      ? asList(input.aiRecommendations)
      : defaultRecommendations(input);
    const nextSteps = asList(input.nextSteps).length ? asList(input.nextSteps) : defaultNextSteps(input);
    const benchmarks = buildBenchmarkLines(input);

    const chartNotes =
      input.charts
        ?.map((c) => `${c.label}: ${c.points.length} puntos`)
        .filter(Boolean)
        .slice(0, 6) ?? [];

    const body = `
<section class="report-section meta-line">
  <p><strong>Industria:</strong> ${escapeHtml(industry)} · <strong>Plan:</strong> ${escapeHtml(input.plan ?? "—")}</p>
</section>
<section class="report-section">
  <h2>Resumen ejecutivo</h2>
  <p>${escapeHtml(buildExecutiveSummary(input))}</p>
</section>
<section class="report-section">
  <h2>Métricas principales</h2>
</section>
${metricsGrid(kpiCards)}
${sectionBlock("Comparativa vs benchmarks de industria", benchmarks)}
<section class="report-section">
  <h2>Rendimiento por canal</h2>
  <h3>ROI diario</h3>
  ${tableFromRows(["Fecha", "Ingresos", "Gasto", "ROI"], roiRows)}
  <h3>Tráfico</h3>
  ${tableFromRows(["Fecha", "Sesiones", "Usuarios", "Conversiones"], trafficRows)}
  <h3>Conversiones por tipo</h3>
  ${tableFromRows(["Canal / tipo", "Volume", "%"], channelRows)}
  <h3>MRR</h3>
  ${tableFromRows(["Mes", "MRR", "Crecimiento"], mrrRows)}
</section>
${sectionBlock("Tendencias (series conectadas)", chartNotes)}
${sectionBlock("Recomendaciones IA", recommendations)}
${sectionBlock("Próximos pasos", nextSteps)}
`;

    const extraCss = `
.doc-header { padding:2rem 1.5rem; border-bottom:1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent); }
.eyebrow { text-transform:uppercase; letter-spacing:0.08em; font-size:0.75rem; color:var(--color-secondary); margin:0 0 0.5rem; }
.subtitle { color:var(--color-secondary); margin:0.25rem 0 1rem; }
.doc-main { max-width:56rem; margin:0 auto; padding:2rem 1.5rem; }
.doc-footer { text-align:center; padding:2rem; font-size:0.875rem; color:var(--color-secondary); }
.report-section { margin-bottom:2rem; }
.report-section ul { padding-left:1.25rem; }
.meta-line p { margin:0; font-size:0.9rem; color:var(--color-secondary); }
.metrics-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(9rem,1fr)); gap:1rem; margin-bottom:2rem; }
.metric-card { padding:1rem; border-radius:var(--radius); border:1px solid color-mix(in srgb, var(--color-secondary) 20%, transparent); background:color-mix(in srgb, var(--color-accent) 6%, var(--color-bg)); }
.metric-label { font-size:0.75rem; color:var(--color-secondary); margin:0 0 0.25rem; text-transform:uppercase; letter-spacing:0.05em; }
.metric-value { font-size:1.35rem; font-weight:700; margin:0; color:var(--color-primary); }
.metric-hint { font-size:0.8rem; color:var(--color-secondary); margin:0.35rem 0 0; }
.table-wrap { overflow-x:auto; margin:1rem 0; }
table { width:100%; border-collapse:collapse; font-size:0.875rem; }
th, td { padding:0.5rem 0.75rem; text-align:left; border-bottom:1px solid color-mix(in srgb, var(--color-secondary) 18%, transparent); }
th { font-weight:600; color:var(--color-primary); }
.muted { color:var(--color-secondary); font-style:italic; }
h3 { font-size:1rem; margin:1.25rem 0 0.5rem; color:var(--color-primary); }
`;

    return {
      "report.html": reportShell("Informe de dashboard", brand, body),
      "assets/styles.css": `${buildStylesCss(tokens)}${extraCss}`,
    };
  } catch {
    const brand = input.companyName?.trim() || "NELVYON Client";
    const tokens = extractDesignTokens(DEFAULT_TOKENS_JSON, brand);
    return {
      "report.html": reportShell(
        "Informe de dashboard",
        brand,
        `<section class="report-section"><p>${escapeHtml("Informe generado con datos parciales del cliente.")}</p></section>`,
      ),
      "assets/styles.css": buildStylesCss(tokens),
    };
  }
}

export function runDashboardReportCodegen(input: DashboardReportInput | string): string {
  const parsedInput: DashboardReportInput =
    typeof input === "string"
      ? (parseLooseJson<Record<string, unknown>>(input, { companyName: "Cliente" }) as unknown as DashboardReportInput)
      : input;
  const files = buildDashboardReportFiles(parsedInput);
  for (const key of DASHBOARD_REPORT_REQUIRED_FILES) {
    if (!files[key]) throw new Error(`dashboardReportBuilder: missing ${key}`);
    if (key.endsWith(".html") && !isValidHtmlDocument(files[key])) {
      throw new Error(`dashboardReportBuilder: invalid HTML in ${key}`);
    }
  }
  return JSON.stringify({ files: DASHBOARD_REPORT_REQUIRED_FILES, companyName: parsedInput.companyName });
}

export async function publishDashboardReportZip(options: {
  tenantId: string;
  userId: string;
  reportId: string;
  files: DashboardReportFileMap;
}): Promise<PublishArtifactResult> {
  return publishArtifactZip({
    kind: "saas-dashboard-report",
    clientId: options.tenantId,
    tenantId: options.tenantId,
    jobId: options.reportId,
    serviceId: "saas_dashboard_report",
    files: options.files,
    zipFileName: "nelvyon-saas-dashboard-report.zip",
  });
}

export { createArtifactZip };
