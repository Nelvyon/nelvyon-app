/**
 * S59 — Deterministic GEO / AI Visibility checklist (0€, no LLM).
 * Audits schema.org, FAQ, llms.txt for ChatGPT/Perplexity citation readiness.
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { buildMinimalPdfFromText } from "./OsDeliveryCertificateService";

export type GeoCheckSeverity = "high" | "medium" | "low";
export type GeoCheckItem = {
  id: string;
  severity: GeoCheckSeverity;
  title: string;
  detail: string;
  passed: boolean;
};

export type GeoVisibilityRun = {
  id: string;
  tenantId: string;
  domain: string;
  status: "running" | "completed" | "failed";
  score: number | null;
  checklist: GeoCheckItem[];
  reportHtml: string | null;
  startedAt: string;
  completedAt: string | null;
};

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 512_000;

export function normalizeDomainInput(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(d)) {
    throw new Error("Dominio inválido");
  }
  return d;
}

/** Pure deterministic checklist from HTML + llms.txt body. */
export function deriveGeoChecklist(homeHtml: string, llmsTxt: string | null): GeoCheckItem[] {
  const html = homeHtml.toLowerCase();
  const items: GeoCheckItem[] = [];

  const hasJsonLd = html.includes("application/ld+json") || html.includes('"@type"');
  items.push({
    id: "schema_org",
    severity: "high",
    title: "Schema.org JSON-LD",
    detail: hasJsonLd ? "Detectado markup estructurado." : "Añade JSON-LD (Organization, LocalBusiness o Product).",
    passed: hasJsonLd,
  });

  const hasFaq = html.includes("faqpage") || html.includes('"@type":"question"') || html.includes("preguntas frecuentes");
  items.push({
    id: "faq_schema",
    severity: "high",
    title: "FAQ para AI Overviews",
    detail: hasFaq ? "FAQ o schema FAQPage detectado." : "Crea sección FAQ con schema FAQPage.",
    passed: hasFaq,
  });

  const hasMetaDesc = html.includes('name="description"') || html.includes("name='description'");
  items.push({
    id: "meta_description",
    severity: "medium",
    title: "Meta description",
    detail: hasMetaDesc ? "Meta description presente." : "Añade meta description única (120–160 chars).",
    passed: hasMetaDesc,
  });

  const hasH1 = /<h1[\s>]/i.test(homeHtml);
  items.push({
    id: "h1_present",
    severity: "medium",
    title: "H1 único",
    detail: hasH1 ? "H1 detectado." : "Un solo H1 claro con propuesta de valor.",
    passed: hasH1,
  });

  const llmsOk = llmsTxt != null && llmsTxt.trim().length >= 40;
  items.push({
    id: "llms_txt",
    severity: "high",
    title: "llms.txt",
    detail: llmsOk
      ? `llms.txt encontrado (${llmsTxt!.trim().length} chars).`
      : "Publica /llms.txt con resumen del negocio para crawlers IA.",
    passed: llmsOk,
  });

  const hasContact = html.includes("contact") || html.includes("contacto") || html.includes("tel:");
  items.push({
    id: "contact_signals",
    severity: "low",
    title: "Señales de contacto",
    detail: hasContact ? "Información de contacto detectada." : "Incluye teléfono/email visibles (E-E-A-T local).",
    passed: hasContact,
  });

  return items;
}

export function scoreGeoChecklist(items: GeoCheckItem[]): number {
  if (items.length === 0) return 0;
  const weights: Record<GeoCheckSeverity, number> = { high: 3, medium: 2, low: 1 };
  let earned = 0;
  let total = 0;
  for (const i of items) {
    const w = weights[i.severity];
    total += w;
    if (i.passed) earned += w;
  }
  return Math.round((earned / total) * 100);
}

export function geoChecklistToPdfLines(run: GeoVisibilityRun): string[] {
  return [
    "Nelvyon — GEO / AI Visibility Report",
    `Domain: ${run.domain}`,
    `Score: ${run.score ?? 0}/100`,
    `Generated: ${new Date().toISOString()}`,
    "",
    ...run.checklist.map(
      (c) => `${c.passed ? "[PASS]" : "[FAIL]"} ${c.title} — ${c.detail}`,
    ),
    "",
    "Este informe es determinístico (schema, FAQ, llms.txt). Sin coste LLM.",
  ];
}

export function buildGeoReportHtml(run: GeoVisibilityRun): string {
  const rows = run.checklist
    .map(
      (c) =>
        `<tr><td>${c.passed ? "✅" : "❌"}</td><td>${c.title}</td><td>${c.detail}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>GEO Report — ${run.domain}</title></head>
<body style="font-family:sans-serif;max-width:720px;margin:2rem auto">
<h1>GEO / AI Visibility — ${run.domain}</h1>
<p>Score: <strong>${run.score ?? 0}/100</strong></p>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
<thead><tr><th>OK</th><th>Check</th><th>Detalle</th></tr></thead><tbody>${rows}</tbody></table>
<p style="color:#666;font-size:12px">Nelvyon — informe determinístico para citación en motores IA.</p>
</body></html>`;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "Nelvyon-GEO-Audit/1.0 (+https://nelvyon.com)" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) return null;
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  } catch {
    return null;
  }
}

export class SaasGeoVisibilityReportService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async analyze(tenantId: string, domainInput: string): Promise<GeoVisibilityRun> {
    const domain = normalizeDomainInput(domainInput);
    const homeUrl = `https://${domain}/`;
    const llmsUrl = `https://${domain}/llms.txt`;

    const [homeHtml, llmsTxt] = await Promise.all([
      fetchText(homeUrl),
      fetchText(llmsUrl),
    ]);

    if (!homeHtml) {
      const failed: GeoCheckItem[] = [{
        id: "fetch_failed",
        severity: "high",
        title: "Sitio no accesible",
        detail: `No se pudo obtener ${homeUrl}`,
        passed: false,
      }];
      return this.persist(tenantId, domain, failed, 0, "failed");
    }

    const checklist = deriveGeoChecklist(homeHtml, llmsTxt);
    const score = scoreGeoChecklist(checklist);
    return this.persist(tenantId, domain, checklist, score, "completed");
  }

  private async persist(
    tenantId: string,
    domain: string,
    checklist: GeoCheckItem[],
    score: number,
    status: "completed" | "failed",
  ): Promise<GeoVisibilityRun> {
    const run: GeoVisibilityRun = {
      id: "",
      tenantId,
      domain,
      status,
      score,
      checklist,
      reportHtml: null,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    run.reportHtml = buildGeoReportHtml(run);

    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO saas_geo_visibility_runs
         (tenant_id, domain, status, score, checklist, report_html, completed_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
       RETURNING id`,
      [tenantId, domain, status, score, JSON.stringify(checklist), run.reportHtml],
    );
    run.id = rows[0]?.id ?? run.id;
    return run;
  }

  async getRun(tenantId: string, runId: string): Promise<GeoVisibilityRun | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_geo_visibility_runs WHERE id = $1::uuid AND tenant_id = $2 LIMIT 1`,
      [runId, tenantId],
    );
    if (!rows[0]) return null;
    return this.mapRow(rows[0]);
  }

  async listRuns(tenantId: string, limit = 10): Promise<GeoVisibilityRun[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_geo_visibility_runs WHERE tenant_id = $1 ORDER BY started_at DESC LIMIT $2`,
      [tenantId, limit],
    );
    return rows.map((r) => this.mapRow(r));
  }

  toPdf(run: GeoVisibilityRun): Buffer {
    return buildMinimalPdfFromText(geoChecklistToPdfLines(run), `GEO Report — ${run.domain}`);
  }

  private mapRow(r: Record<string, unknown>): GeoVisibilityRun {
    const checklist = Array.isArray(r.checklist) ? (r.checklist as GeoCheckItem[]) : [];
    return {
      id: String(r.id),
      tenantId: String(r.tenant_id),
      domain: String(r.domain),
      status: String(r.status) as GeoVisibilityRun["status"],
      score: r.score != null ? Number(r.score) : null,
      checklist,
      reportHtml: r.report_html != null ? String(r.report_html) : null,
      startedAt: String(r.started_at),
      completedAt: r.completed_at != null ? String(r.completed_at) : null,
    };
  }
}

let _svc: SaasGeoVisibilityReportService | undefined;
export function getSaasGeoVisibilityReportService(): SaasGeoVisibilityReportService {
  _svc ??= new SaasGeoVisibilityReportService();
  return _svc;
}
export function resetSaasGeoVisibilityReportServiceForTests(): void {
  _svc = undefined;
}
