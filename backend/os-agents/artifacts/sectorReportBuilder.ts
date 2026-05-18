import { buildStylesCss, extractDesignTokens } from "../agents/webStaticBuilder";
import type { OsJobPayload } from "../types";
import { publishArtifactZip, type PublishArtifactResult } from "./artifactPublisher";
import { escapeHtml, isValidHtmlDocument, parseLooseJson } from "./htmlUtils";

export type SectorReportFileMap = {
  "report.html": string;
  "assets/styles.css": string;
};

export const SECTOR_REPORT_REQUIRED_FILES: (keyof SectorReportFileMap)[] = [
  "report.html",
  "assets/styles.css",
];

const DEFAULT_TOKENS_JSON = JSON.stringify({
  colorPalette: {
    primary: "#0f172a",
    secondary: "#64748b",
    accent: "#059669",
    background: "#ffffff",
    text: "#1e293b",
  },
});

function brandFromPayload(payload: Record<string, unknown>): string {
  const candidates = [
    payload.clientName,
    payload.businessName,
    payload.brandName,
    payload.companyName,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "NELVYON";
}

function asStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => (typeof x === "string" ? x : String(x))).filter((s) => s.trim().length > 0);
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function sectionBlock(title: string, items: string[]): string {
  if (!items.length) return "";
  return `<section class="report-section">
  <h2>${escapeHtml(title)}</h2>
  <ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
</section>`;
}

function metricsGrid(entries: { label: string; value: string }[]): string {
  if (!entries.length) return "";
  return `<section class="metrics-grid">
  ${entries
    .map(
      (e) => `<div class="metric-card">
    <p class="metric-label">${escapeHtml(e.label)}</p>
    <p class="metric-value">${escapeHtml(e.value)}</p>
  </div>`,
    )
    .join("")}
</section>`;
}

function reportShell(title: string, brand: string, sectorLabel: string, body: string): string {
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
    <p class="eyebrow">NELVYON OS · ${escapeHtml(sectorLabel)}</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(brand)}</p>
  </header>
  <main class="doc-main">${body}</main>
  <footer class="doc-footer"><p>Generado por NELVYON OS</p></footer>
</body>
</html>`;
}

function markdownToHtmlBlocks(md: string): string {
  const lines = md.split(/\r?\n/);
  const parts: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    parts.push(`<ul>${listItems.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushList();
      parts.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      flushList();
      parts.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("# ")) {
      flushList();
      parts.push(`<h2>${escapeHtml(trimmed.slice(2))}</h2>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
    } else {
      flushList();
      parts.push(`<p>${escapeHtml(trimmed)}</p>`);
    }
  }
  flushList();
  return parts.join("\n");
}

function looksLikeMarkdown(text: string): boolean {
  const t = text.trim();
  return t.includes("\n## ") || t.includes("\n### ") || /^#\s/.test(t) || /^[-*]\s/m.test(t);
}

function tryParseOutput(raw: string): { parsed: Record<string, unknown>; isJson: boolean } {
  try {
    const trimmed = raw.trim();
    if (!trimmed) return { parsed: {}, isJson: false };
    const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
    const payload = fenced?.[1] ? fenced[1].trim() : trimmed;
    if (payload.startsWith("{") || payload.startsWith("[")) {
      const parsed = parseLooseJson<Record<string, unknown>>(payload, {});
      return { parsed, isJson: true };
    }
  } catch {
    /* generic fallback */
  }
  return { parsed: {}, isJson: false };
}

function mergeStepOutputs(outputs: string[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const raw of outputs) {
    if (!raw?.trim()) continue;
    const { parsed, isJson } = tryParseOutput(raw);
    if (isJson && Object.keys(parsed).length > 0) {
      Object.assign(merged, parsed);
    } else if (raw.trim()) {
      merged._markdownSections = merged._markdownSections
        ? `${String(merged._markdownSections)}\n\n${raw.trim()}`
        : raw.trim();
    }
  }
  return merged;
}

function buildStructuredBody(data: Record<string, unknown>): string {
  const summary = pickString(data, [
    "executiveSummary",
    "resumenEjecutivo",
    "resumen",
    "summary",
    "result",
    "content",
    "analysis",
    "analisis",
  ]);

  const scoreRaw = data.score ?? data.auditScore ?? data.puntuacion;
  const score =
    typeof scoreRaw === "number" || typeof scoreRaw === "string" ? String(scoreRaw) : "";

  const recommendations = [
    ...asStringList(data.recommendations),
    ...asStringList(data.recommendedActions),
    ...asStringList(data.improvements),
    ...asStringList(data.quickWins),
  ];

  const insights = asStringList(data.insights);
  const keywords = asStringList(data.keywords);
  const metrics = asStringList(data.metrics);
  const actionPlan = [
    ...asStringList(data.actionPlan),
    ...asStringList(data.planDeAccion),
    ...asStringList(data.nextSteps),
    ...asStringList(data.proximosPasos),
  ];

  const metricCards: { label: string; value: string }[] = [];
  if (score) metricCards.push({ label: "Puntuación", value: score });
  if (keywords.length) metricCards.push({ label: "Keywords clave", value: keywords.slice(0, 3).join(", ") });
  if (insights.length) metricCards.push({ label: "Insights", value: String(insights.length) });

  const markdownBlock =
    typeof data._markdownSections === "string" && data._markdownSections.trim()
      ? `<section class="report-section"><h2>Entregable</h2>${markdownToHtmlBlocks(data._markdownSections)}</section>`
      : "";

  return `
${score ? `<section class="hero-metric"><p class="score-label">Resultado</p><p class="score-value">${escapeHtml(score)}</p></section>` : ""}
${metricsGrid(metricCards)}
${summary ? `<section class="report-section"><h2>Resumen ejecutivo</h2><p>${escapeHtml(summary)}</p></section>` : ""}
${sectionBlock("Análisis e insights", [...insights, ...asStringList(data.criticalIssues)].slice(0, 12))}
${sectionBlock("Recomendaciones", recommendations.slice(0, 15))}
${sectionBlock("Métricas y KPIs", metrics.slice(0, 12))}
${sectionBlock("Palabras clave", keywords.slice(0, 12))}
${sectionBlock(
    "Plan de acción",
    (actionPlan.length ? actionPlan : [
      "Priorizar quick wins de alto impacto",
      "Medir KPIs semanalmente",
      "Iterar según resultados",
    ]).slice(0, 10),
  )}
${markdownBlock}`;
}

function buildGenericBody(text: string): string {
  if (looksLikeMarkdown(text)) {
    return `<section class="report-section"><h2>Informe ejecutivo</h2>${markdownToHtmlBlocks(text)}</section>`;
  }
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
  return `<section class="report-section"><h2>Informe ejecutivo</h2>${paragraphs || `<p>${escapeHtml("Análisis sectorial completado.")}</p>`}</section>`;
}

/** Combines one or more agent step outputs (JSON or Markdown) into report files. */
export function buildSectorReportFiles(
  agentOutput: string | string[] | Record<string, unknown>,
  payload: Record<string, unknown> = {},
): SectorReportFileMap {
  try {
    const brand = brandFromPayload(payload);
    const sectorLabel = String(payload.sector ?? payload.industry ?? "Sector OS");
    const tokens = extractDesignTokens(DEFAULT_TOKENS_JSON, brand);

    let body = "";
    if (typeof agentOutput === "string") {
      const { parsed, isJson } = tryParseOutput(agentOutput);
      body = isJson && Object.keys(parsed).length > 0 ? buildStructuredBody(parsed) : buildGenericBody(agentOutput);
    } else if (Array.isArray(agentOutput)) {
      const merged = mergeStepOutputs(agentOutput);
      body =
        Object.keys(merged).length > 0 ? buildStructuredBody(merged) : buildGenericBody(agentOutput.join("\n\n"));
    } else {
      body = buildStructuredBody(agentOutput);
    }

    if (!body.trim()) {
      body = buildGenericBody("Informe sectorial generado con recomendaciones accionables.");
    }

    const extraCss = `
.doc-header { padding:2rem 1.5rem; border-bottom:1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent); }
.eyebrow { text-transform:uppercase; letter-spacing:0.08em; font-size:0.75rem; color:var(--color-secondary); margin:0 0 0.5rem; }
.subtitle { color:var(--color-secondary); margin:0.25rem 0 1rem; }
.doc-main { max-width:52rem; margin:0 auto; padding:2rem 1.5rem; }
.doc-footer { text-align:center; padding:2rem; font-size:0.875rem; color:var(--color-secondary); }
.hero-metric { text-align:center; padding:2rem; border-radius:var(--radius); background:color-mix(in srgb, var(--color-accent) 12%, var(--color-bg)); margin-bottom:2rem; }
.score-value { font-size:2.5rem; font-weight:800; color:var(--color-primary); margin:0; }
.score-label { font-size:0.875rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-secondary); }
.report-section { margin-bottom:2rem; }
.report-section ul { padding-left:1.25rem; }
.metrics-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(10rem,1fr)); gap:1rem; margin-bottom:2rem; }
.metric-card { padding:1rem; border-radius:var(--radius); border:1px solid color-mix(in srgb, var(--color-secondary) 20%, transparent); }
.metric-label { font-size:0.75rem; color:var(--color-secondary); margin:0 0 0.25rem; }
.metric-value { font-size:1.25rem; font-weight:700; margin:0; color:var(--color-primary); }
`;

    return {
      "report.html": reportShell("Informe sectorial", brand, sectorLabel, body),
      "assets/styles.css": `${buildStylesCss(tokens)}${extraCss}`,
    };
  } catch {
    const brand = brandFromPayload(payload);
    const tokens = extractDesignTokens(DEFAULT_TOKENS_JSON, brand);
    return {
      "report.html": reportShell(
        "Informe sectorial",
        brand,
        "Sector OS",
        buildGenericBody(String(agentOutput ?? "Informe disponible.")),
      ),
      "assets/styles.css": buildStylesCss(tokens),
    };
  }
}

export function collectStepOutputs(stepResults: Record<string, string>): string[] {
  return Object.values(stepResults).filter((s) => typeof s === "string" && s.trim().length > 0);
}

export function runSectorReportCodegen(
  agentOutput: string | string[] | Record<string, unknown>,
  payload: Record<string, unknown>,
): string {
  const files = buildSectorReportFiles(agentOutput, payload);
  for (const key of SECTOR_REPORT_REQUIRED_FILES) {
    if (!files[key]) throw new Error(`sectorReportBuilder: missing ${key}`);
    if (key.endsWith(".html") && !isValidHtmlDocument(files[key])) {
      throw new Error(`sectorReportBuilder: invalid HTML in ${key}`);
    }
  }
  return JSON.stringify({
    files: SECTOR_REPORT_REQUIRED_FILES,
    brandName: brandFromPayload(payload),
  });
}

export async function publishSectorReportZip(options: {
  clientId: string;
  tenantId: string;
  jobId: string;
  serviceId: string;
  files: SectorReportFileMap;
}): Promise<PublishArtifactResult> {
  return publishArtifactZip({ kind: "sector-report", ...options });
}
