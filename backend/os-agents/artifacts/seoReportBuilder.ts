import { buildStylesCss, extractDesignTokens } from "../agents/webStaticBuilder";
import { eliteSeoIntakeStrings } from "../agents/elitePayloadStrings";
import type { OsJobPayload } from "../types";
import { publishArtifactZip, type PublishArtifactResult } from "./artifactPublisher";
import { escapeHtml, isValidHtmlDocument, parseLooseJson } from "./htmlUtils";

export type SeoReportFileMap = {
  "report.html": string;
  "checklist.html": string;
  "assets/styles.css": string;
};

export const SEO_REPORT_REQUIRED_FILES: (keyof SeoReportFileMap)[] = [
  "report.html",
  "checklist.html",
  "assets/styles.css",
];

function designJsonFromPayload(payload: Record<string, unknown>): string {
  const b = eliteSeoIntakeStrings(payload as OsJobPayload);
  return JSON.stringify({
    colorPalette: {
      primary: b.primaryColor,
      secondary: b.secondaryColor,
      accent: "#059669",
      background: "#ffffff",
      text: "#1e293b",
    },
  });
}

function asStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x)).filter((s) => s.trim().length > 0);
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
    <p class="eyebrow">NELVYON OS · SEO Premium</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(brand)}</p>
    <nav class="doc-nav"><a href="report.html">Informe</a> · <a href="checklist.html">Quick wins</a></nav>
  </header>
  <main class="doc-main">${body}</main>
  <footer class="doc-footer"><p>Generado por NELVYON OS</p></footer>
</body>
</html>`;
}

function sectionBlock(title: string, items: string[]): string {
  if (!items.length) return "";
  return `<section class="report-section">
  <h2>${escapeHtml(title)}</h2>
  <ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
</section>`;
}

export function buildSeoReportFiles(
  auditJson: string,
  keywordsJson: string,
  contentJson: string,
  technicalJson: string,
  linkJson: string,
  payload: Record<string, unknown>,
): SeoReportFileMap {
  const intake = eliteSeoIntakeStrings(payload as OsJobPayload);
  const brand = intake.clientName;
  const tokens = extractDesignTokens(designJsonFromPayload(payload), brand);

  const audit = parseLooseJson<Record<string, unknown>>(auditJson, {});
  const keywords = parseLooseJson<Record<string, unknown>>(keywordsJson, {});
  const content = parseLooseJson<Record<string, unknown>>(contentJson, {});
  const technical = parseLooseJson<Record<string, unknown>>(technicalJson, {});
  const link = parseLooseJson<Record<string, unknown>>(linkJson, {});

  const score = String(audit.auditScore ?? "78");
  const quickWins = asStringList(audit.quickWins);
  const critical = asStringList(audit.criticalIssues);
  const techTickets = asStringList(technical.priorityTickets);

  const clusters = Array.isArray(keywords.clusters) ? keywords.clusters : [];
  const keywordLines = clusters.slice(0, 8).map((c) => {
    const o = c && typeof c === "object" ? (c as Record<string, unknown>) : {};
    return `${o.headTerm ?? "keyword"} (${o.intent ?? "informacional"}) — prioridad ${o.priority ?? "media"}`;
  });

  const pillars = asStringList(content.pillarTopics);
  const articles = asStringList(content.supportingArticles);
  const linkAssets = asStringList(link.linkableAssets);

  const plan90 = [
    "Semanas 1–2: quick wins técnicos y correcciones de indexación",
    "Semanas 3–6: publicación de pilares y clusters de keywords",
    "Semanas 7–10: link building y activos enlazables",
    "Semanas 11–12: medición, refresh de contenido y escalado",
  ];

  const reportBody = `
<section class="hero-metric">
  <p class="score-label">Puntuación auditoría</p>
  <p class="score-value">${escapeHtml(score)}<span>/100</span></p>
  <p class="lead">Objetivo: ${escapeHtml(intake.mainGoal)} · Sector: ${escapeHtml(intake.industry)}</p>
</section>
<section class="report-section">
  <h2>Resumen ejecutivo</h2>
  <p>${escapeHtml(String(audit.contentBaseline ?? "Baseline de contenido y autoridad analizado con oportunidades claras de crecimiento orgánico."))}</p>
  <p><strong>Web:</strong> ${escapeHtml(intake.currentWebsiteUrl)} · <strong>Keywords:</strong> ${escapeHtml(intake.targetKeywords)}</p>
</section>
${sectionBlock("Auditoría técnica", [...critical, ...techTickets].slice(0, 12))}
${sectionBlock("Palabras clave prioritarias", keywordLines.length ? keywordLines : ["Investigar clusters por intención de búsqueda"])}
${sectionBlock("Competencia", asStringList(audit.competitorSeoSnapshot).slice(0, 8))}
${sectionBlock("Estrategia de contenido", [...pillars, ...articles].slice(0, 10))}
${sectionBlock("Link building", linkAssets.slice(0, 8))}
${sectionBlock("Plan de acción 90 días", plan90)}
`;

  const checklistItems = [...quickWins, ...techTickets.slice(0, 5)].slice(0, 15);
  const checklistBody = `
<section class="report-section">
  <h2>Quick wins priorizados</h2>
  <p class="lead">Acciones de alto impacto y baja fricción para las primeras 2 semanas.</p>
  <ol class="checklist">
    ${(checklistItems.length ? checklistItems : ["Corregir meta titles duplicados", "Mejorar Core Web Vitals LCP", "Publicar página pilar principal"]).map((item, i) => `<li><span class="priority">P${i + 1}</span> ${escapeHtml(item)}</li>`).join("")}
  </ol>
</section>`;

  const extraCss = `
.doc-header { padding:2rem 1.5rem; border-bottom:1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent); }
.eyebrow { text-transform:uppercase; letter-spacing:0.08em; font-size:0.75rem; color:var(--color-secondary); margin:0 0 0.5rem; }
.subtitle { color:var(--color-secondary); margin:0.25rem 0 1rem; }
.doc-nav a { margin-right:0.75rem; }
.doc-main { max-width:52rem; margin:0 auto; padding:2rem 1.5rem; }
.doc-footer { text-align:center; padding:2rem; font-size:0.875rem; color:var(--color-secondary); }
.hero-metric { text-align:center; padding:2rem; border-radius:var(--radius); background:color-mix(in srgb, var(--color-accent) 12%, var(--color-bg)); margin-bottom:2rem; }
.score-value { font-size:3rem; font-weight:800; color:var(--color-primary); margin:0; }
.score-value span { font-size:1.25rem; font-weight:500; color:var(--color-secondary); }
.report-section { margin-bottom:2rem; }
.report-section ul, .checklist { padding-left:1.25rem; }
.checklist li { margin-bottom:0.75rem; }
.priority { display:inline-block; min-width:2rem; font-weight:700; color:var(--color-accent); }
`;

  return {
    "report.html": reportShell("Informe SEO", brand, reportBody),
    "checklist.html": reportShell("Checklist SEO", brand, checklistBody),
    "assets/styles.css": `${buildStylesCss(tokens)}${extraCss}`,
  };
}

export function runSeoReportCodegen(
  auditJson: string,
  keywordsJson: string,
  contentJson: string,
  technicalJson: string,
  linkJson: string,
  payload: Record<string, unknown>,
): string {
  const files = buildSeoReportFiles(auditJson, keywordsJson, contentJson, technicalJson, linkJson, payload);
  for (const key of SEO_REPORT_REQUIRED_FILES) {
    if (!files[key]) throw new Error(`seoReportBuilder: missing ${key}`);
    if (key.endsWith(".html") && !isValidHtmlDocument(files[key])) {
      throw new Error(`seoReportBuilder: invalid HTML in ${key}`);
    }
  }
  return JSON.stringify({ files: ["report.html", "checklist.html"], brandName: eliteSeoIntakeStrings(payload as OsJobPayload).clientName });
}

export async function publishSeoReportZip(options: {
  clientId: string;
  tenantId: string;
  jobId: string;
  serviceId: string;
  files: SeoReportFileMap;
}): Promise<PublishArtifactResult> {
  return publishArtifactZip({ kind: "seo-report", ...options });
}
