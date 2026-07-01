/**
 * O23 — OsDeliveryCertificateService
 * Issues a verifiable HTML delivery certificate per completed pack run, bundling
 * QA score, visual/lighthouse, legal, the seed used, agents/SKUs, the data provider
 * and a content hash. Persisted for audit and synced to the S50 Compliance Vault.
 *
 * Ports are injectable so vitest never touches live pack runs / QA / vault; the
 * production singleton lazy-loads them. v1 emits HTML only (no PDF binary).
 */
import { createHash } from "node:crypto";
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Ports ───────────────────────────────────────────────────────────────────────

export type CertPackRun = {
  id: string;
  pack_id: string;
  workspace_id: number | null;
  status: string;
  report: Record<string, unknown> | null;
};

export type PackRunPort = {
  getPackRun(packRunId: string): Promise<CertPackRun | null>;
};

export type CertQaAudit = {
  visual_score: number | null;
  lighthouse_score: number | null;
  legal_passed: boolean | null;
  content_hash: string | null;
};

export type QaAuditPort = {
  getLatestForPackRun(packRunId: string): Promise<CertQaAudit | null>;
};

export type VaultPort = {
  syncQaCertificate(tenantId: string, packRunId: string, certUrl: string, contentHash: string): Promise<void>;
};

// ── Types ───────────────────────────────────────────────────────────────────────

export type CertStatus = "pending" | "issued" | "failed";
export type AgentProvider = "semrush" | "dataforseo" | "mock" | "none";

export type DeliveryCertificate = {
  id: string;
  packRunId: string;
  packId: string;
  tenantId: string | null;
  workspaceId: number | null;
  status: CertStatus;
  qaScore: number | null;
  legalPassed: boolean | null;
  visualScore: number | null;
  lighthouseScore: number | null;
  seedId: string | null;
  seedSource: string | null;
  agentProvider: AgentProvider;
  agentsUsed: string[];
  contentHash: string | null;
  certUrl: string | null;
  htmlBody?: string | null;
  metadata: Record<string, unknown>;
  issuedAt: string | null;
  createdAt: string;
};

export type CertSummary = {
  total: number;
  issued: number;
  failed: number;
  avgQaScore: number;
  lastIssuedAt: string | null;
};

export type OsDeliveryCertErrorCode = "NOT_FOUND";

export class OsDeliveryCertError extends Error {
  constructor(public readonly code: OsDeliveryCertErrorCode, message: string) {
    super(message);
    this.name = "OsDeliveryCertError";
  }
}

type CertRow = {
  id: string;
  pack_run_id: string;
  pack_id: string;
  tenant_id: string | null;
  workspace_id: number | null;
  status: CertStatus;
  qa_score: string | null;
  legal_passed: boolean | null;
  visual_score: string | null;
  lighthouse_score: string | null;
  seed_id: string | null;
  seed_source: string | null;
  agent_provider: AgentProvider | null;
  agents_used: string[];
  content_hash: string | null;
  html_body: string | null;
  cert_url: string | null;
  metadata: Record<string, unknown>;
  issued_at: string | null;
  created_at: string;
};

function num(v: string | null): number | null {
  if (v === null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Minimal PDF 1.4 — plain text certificate without external deps. */
export function buildMinimalPdfFromText(lines: string[], title: string): Buffer {
  const safeTitle = escapePdfText(title.slice(0, 80));
  const body = lines
    .slice(0, 40)
    .map((l, i) => `BT /F1 10 Tf 50 ${780 - i * 16} Td (${escapePdfText(l.slice(0, 100))}) Tj ET`)
    .join("\n");
  const stream = `BT /F1 14 Tf 50 800 Td (${safeTitle}) Tj ET\n${body}`;
  const streamLen = Buffer.byteLength(stream, "utf8");
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${streamLen}>>stream
${stream}
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000115 00000 n 
0000000240 00000 n 
0000000${(320 + streamLen).toString().padStart(3, "0")} 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
${400 + streamLen}
%%EOF`;
  return Buffer.from(pdf, "utf8");
}

export function certificateToPdfLines(cert: DeliveryCertificate): string[] {
  return [
    `Pack: ${cert.packId}`,
    `Pack Run: ${cert.packRunId}`,
    `QA Score: ${cert.qaScore ?? "—"}/100`,
    `Visual: ${cert.visualScore ?? "—"} | Lighthouse: ${cert.lighthouseScore ?? "—"}`,
    `Legal: ${cert.legalPassed === true ? "PASS" : cert.legalPassed === false ? "FAIL" : "—"}`,
    `Seed: ${cert.seedId ?? "—"} (${cert.seedSource ?? "synthetic"})`,
    `Agents: ${cert.agentsUsed.join(", ") || "—"}`,
    `Hash: ${cert.contentHash ?? "—"}`,
    `Issued: ${cert.issuedAt ?? "pending"}`,
    `Nelvyon Delivery Certificate`,
  ];
}

function rowToCert(r: CertRow, includeHtml = false): DeliveryCertificate {
  const cert: DeliveryCertificate = {
    id: r.id,
    packRunId: r.pack_run_id,
    packId: r.pack_id,
    tenantId: r.tenant_id,
    workspaceId: r.workspace_id,
    status: r.status,
    qaScore: num(r.qa_score),
    legalPassed: r.legal_passed,
    visualScore: num(r.visual_score),
    lighthouseScore: num(r.lighthouse_score),
    seedId: r.seed_id,
    seedSource: r.seed_source,
    agentProvider: r.agent_provider ?? "none",
    agentsUsed: r.agents_used ?? [],
    contentHash: r.content_hash,
    certUrl: r.cert_url,
    metadata: r.metadata ?? {},
    issuedAt: r.issued_at,
    createdAt: r.created_at,
  };
  if (includeHtml) cert.htmlBody = r.html_body;
  return cert;
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// ── Default ports ────────────────────────────────────────────────────────────────

function defaultPackRunPort(db: SaasPostgresPort): PackRunPort {
  return {
    async getPackRun(packRunId) {
      const rows = await db.query<CertPackRun>(
        `SELECT id, pack_id, workspace_id, status, report FROM nelvyon_pack_runs WHERE id = $1`,
        [packRunId],
      );
      return rows[0] ?? null;
    },
  };
}

const defaultQaAuditPort: QaAuditPort = {
  async getLatestForPackRun(packRunId) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getOsVisualQaGateService } = require("../autonomous/qa/OsVisualQaGateService") as {
      getOsVisualQaGateService: () => { listAuditRuns(f: { packRunId?: string; limit?: number }): Promise<Array<{ visualScore: number; lighthouseScore: number; legalPassed: boolean; contentHash: string | null }>> };
    };
    const rows = await getOsVisualQaGateService().listAuditRuns({ packRunId, limit: 1 });
    const a = rows[0];
    if (!a) return null;
    return { visual_score: a.visualScore, lighthouse_score: a.lighthouseScore, legal_passed: a.legalPassed, content_hash: a.contentHash };
  },
};

const defaultVaultPort: VaultPort = {
  async syncQaCertificate(tenantId, packRunId) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSaasComplianceVaultService } = require("./SaasComplianceVaultService") as {
      getSaasComplianceVaultService: () => { syncFromPackRun(t: string, r: string): Promise<unknown> };
    };
    await getSaasComplianceVaultService().syncFromPackRun(tenantId, packRunId);
  },
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsDeliveryCertificateService | null = null;

export function getOsDeliveryCertificateService(): OsDeliveryCertificateService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    const db = DbClient.getInstance();
    _instance = new OsDeliveryCertificateService(db, defaultPackRunPort(db), defaultQaAuditPort, defaultVaultPort);
  }
  return _instance;
}

export function resetOsDeliveryCertificateServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsDeliveryCertificateService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly packRuns: PackRunPort,
    private readonly qa: QaAuditPort = defaultQaAuditPort,
    private readonly vault: VaultPort = defaultVaultPort,
  ) {}

  computeContentHash(payload: string): string {
    return createHash("sha256").update(payload.replace(/\s+/g, " ").trim()).digest("hex");
  }

  buildCertificateHtml(input: {
    packId: string;
    packRunId: string;
    qaScore: number | null;
    visualScore: number | null;
    lighthouseScore: number | null;
    legalPassed: boolean | null;
    seedId: string | null;
    seedSource: string | null;
    agentProvider: AgentProvider;
    agentsUsed: string[];
    contentHash: string | null;
    issuedAt: string;
  }): string {
    const legalBadge = input.legalPassed
      ? `<span style="color:#22c55e">✔ Legal aprobado</span>`
      : `<span style="color:#ef4444">✘ Legal no superado</span>`;
    const row = (k: string, v: string) =>
      `<tr><td style="padding:8px 14px;color:#7a8aa0">${esc(k)}</td><td style="padding:8px 14px;color:#e6edf6">${v}</td></tr>`;
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Certificado de entrega — ${esc(input.packId)}</title></head>
<body style="margin:0;background:#020817;color:#e6edf6;font-family:system-ui,Segoe UI,sans-serif">
<div style="max-width:680px;margin:0 auto;padding:32px 20px">
  <div style="border:1px solid rgba(255,255,255,0.1);border-radius:16px;background:rgba(255,255,255,0.03);padding:28px;box-shadow:0 0 32px rgba(0,132,255,0.12)">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="font-size:22px">🎖️</span>
      <h1 style="margin:0;font-size:18px;color:#fff">Certificado de entrega Nelvyon OS</h1>
    </div>
    <p style="color:#7a8aa0;font-size:12px;margin:0 0 20px">Documento verificable — generado automáticamente, no editable.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      ${row("Pack", esc(input.packId))}
      ${row("Run ID", `<code style="font-family:ui-monospace,monospace">${esc(input.packRunId)}</code>`)}
      ${row("Emitido", esc(input.issuedAt))}
      ${row("QA score", input.qaScore !== null ? `<b style="color:${input.qaScore >= 85 ? "#22c55e" : "#f59e0b"}">${input.qaScore}</b>` : "—")}
      ${row("Visual / Lighthouse", `${input.visualScore ?? "—"} / ${input.lighthouseScore ?? "—"}`)}
      ${row("Legal", legalBadge)}
      ${row("Seed", `${esc(input.seedId ?? "—")} <span style="color:#7a8aa0">(${esc(input.seedSource ?? "—")})</span>`)}
      ${row("Proveedor de datos", esc(input.agentProvider))}
      ${row("SKUs / agentes", input.agentsUsed.length ? esc(input.agentsUsed.join(", ")) : "—")}
      ${row("Content hash", `<code style="font-family:ui-monospace,monospace;font-size:11px;word-break:break-all">${esc(input.contentHash ?? "—")}</code>`)}
    </table>
    <p style="margin:22px 0 0;color:#7a8aa0;font-size:11px;text-align:center">Generado por Nelvyon OS — no editable · ${esc(input.issuedAt)}</p>
  </div>
</div></body></html>`;
  }

  /** Issue (or re-issue) the certificate for a pack run. Best-effort vault sync. */
  async issueCertificate(packRunId: string, opts: { tenantId?: string | null; force?: boolean } = {}): Promise<DeliveryCertificate> {
    const run = await this.packRuns.getPackRun(packRunId);
    if (!run) throw new OsDeliveryCertError("NOT_FOUND", `Pack run ${packRunId} no encontrado`);

    if (run.status !== "completed" && !opts.force) {
      // Record a pending placeholder without issuing the document.
      return this.upsert({
        packRunId,
        packId: run.pack_id,
        tenantId: opts.tenantId ?? null,
        workspaceId: run.workspace_id,
        status: "pending",
        qaScore: null, legalPassed: null, visualScore: null, lighthouseScore: null,
        seedId: null, seedSource: null, agentProvider: "none", agentsUsed: [],
        contentHash: null, htmlBody: null, certUrl: null, issuedAt: null,
        metadata: { reason: `status=${run.status}` },
      });
    }

    const report = run.report ?? {};
    const kpis = (report.kpis ?? {}) as Record<string, unknown>;
    const skuResults = (report.sku_results ?? []) as Array<Record<string, unknown>>;
    const agentsUsed = skuResults.map((s) => String(s.sku ?? "")).filter(Boolean);

    // QA audit (O18) best-effort
    let visualScore: number | null = null;
    let lighthouseScore: number | null = null;
    let legalPassed: boolean | null = null;
    let qaHash: string | null = null;
    try {
      const audit = await this.qa.getLatestForPackRun(packRunId);
      if (audit) {
        visualScore = audit.visual_score;
        lighthouseScore = audit.lighthouse_score;
        legalPassed = audit.legal_passed;
        qaHash = audit.content_hash;
      }
    } catch { /* QA audit optional */ }

    const qaScore = typeof kpis.avg_qa_score === "number" ? kpis.avg_qa_score : null;
    if (legalPassed === null) {
      legalPassed = skuResults.length > 0 && skuResults.every((s) => s.qa_legal_passed !== false);
    }

    // Seed + agent provider from report metadata
    const seedMeta = (report.seed_meta ?? report._seed ?? {}) as Record<string, unknown>;
    const firstSku = (skuResults[0] ?? {}) as Record<string, unknown>;
    const seedId = String(seedMeta.seed_id ?? firstSku.seed_id ?? (report.seed_id as string) ?? "") || null;
    const seedSource = String(seedMeta.source ?? (report.seed_source as string) ?? "synthetic") || null;
    const agentData = (report._agent_data ?? (report.brief as Record<string, unknown>)?._agent_data ?? {}) as Record<string, unknown>;
    const agentProvider = (["semrush", "dataforseo", "mock"].includes(String(agentData.provider))
      ? String(agentData.provider)
      : "none") as AgentProvider;

    const contentHash = qaHash ?? this.computeContentHash(JSON.stringify({ kpis, skus: agentsUsed, packRunId }));
    const issuedAt = new Date().toISOString();
    const html = this.buildCertificateHtml({
      packId: run.pack_id, packRunId, qaScore, visualScore, lighthouseScore, legalPassed,
      seedId, seedSource, agentProvider, agentsUsed, contentHash, issuedAt,
    });

    const cert = await this.upsert({
      packRunId,
      packId: run.pack_id,
      tenantId: opts.tenantId ?? null,
      workspaceId: run.workspace_id,
      status: "issued",
      qaScore, legalPassed, visualScore, lighthouseScore,
      seedId, seedSource, agentProvider, agentsUsed,
      contentHash, htmlBody: html, certUrl: null, issuedAt,
      metadata: {},
    });

    // cert_url points to the authenticated HTML viewer
    const certUrl = `/api/os/certificates/${cert.id}/html`;
    await this.db.query(`UPDATE os_delivery_certificates SET cert_url = $2, updated_at = NOW() WHERE id = $1`, [cert.id, certUrl]);
    cert.certUrl = certUrl;

    // Best-effort vault sync (S50) — never fatal
    if (opts.tenantId) {
      try {
        await this.vault.syncQaCertificate(opts.tenantId, packRunId, certUrl, contentHash);
      } catch { /* vault sync best-effort */ }
    }

    return cert;
  }

  private async upsert(c: {
    packRunId: string; packId: string; tenantId: string | null; workspaceId: number | null;
    status: CertStatus; qaScore: number | null; legalPassed: boolean | null;
    visualScore: number | null; lighthouseScore: number | null; seedId: string | null;
    seedSource: string | null; agentProvider: AgentProvider; agentsUsed: string[];
    contentHash: string | null; htmlBody: string | null; certUrl: string | null;
    issuedAt: string | null; metadata: Record<string, unknown>;
  }): Promise<DeliveryCertificate> {
    const rows = await this.db.query<CertRow>(
      `INSERT INTO os_delivery_certificates
         (pack_run_id, pack_id, tenant_id, workspace_id, status, qa_score, legal_passed,
          visual_score, lighthouse_score, seed_id, seed_source, agent_provider, agents_used,
          content_hash, html_body, cert_url, metadata, issued_at)
       VALUES ($1::uuid,$2,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17::jsonb,$18)
       ON CONFLICT (pack_run_id) DO UPDATE SET
         status = EXCLUDED.status, qa_score = EXCLUDED.qa_score, legal_passed = EXCLUDED.legal_passed,
         visual_score = EXCLUDED.visual_score, lighthouse_score = EXCLUDED.lighthouse_score,
         seed_id = EXCLUDED.seed_id, seed_source = EXCLUDED.seed_source,
         agent_provider = EXCLUDED.agent_provider, agents_used = EXCLUDED.agents_used,
         content_hash = EXCLUDED.content_hash, html_body = EXCLUDED.html_body,
         metadata = EXCLUDED.metadata, issued_at = EXCLUDED.issued_at, updated_at = NOW()
       RETURNING *`,
      [
        c.packRunId, c.packId, c.tenantId, c.workspaceId, c.status,
        c.qaScore, c.legalPassed, c.visualScore, c.lighthouseScore, c.seedId, c.seedSource,
        c.agentProvider, JSON.stringify(c.agentsUsed), c.contentHash, c.htmlBody, c.certUrl,
        JSON.stringify(c.metadata), c.issuedAt,
      ],
    );
    return rowToCert(rows[0]!, true);
  }

  async getCertificate(id: string): Promise<DeliveryCertificate> {
    const rows = await this.db.query<CertRow>(`SELECT * FROM os_delivery_certificates WHERE id = $1`, [id]);
    if (!rows[0]) throw new OsDeliveryCertError("NOT_FOUND", `Certificado ${id} no encontrado`);
    return rowToCert(rows[0], true);
  }

  async getByPackRun(packRunId: string): Promise<DeliveryCertificate | null> {
    const rows = await this.db.query<CertRow>(`SELECT * FROM os_delivery_certificates WHERE pack_run_id = $1`, [packRunId]);
    return rows[0] ? rowToCert(rows[0], true) : null;
  }

  async listCertificates(limit = 50, filters: { packId?: string } = {}): Promise<DeliveryCertificate[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.packId) { conditions.push(`pack_id = $${idx++}`); params.push(filters.packId); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await this.db.query<CertRow>(
      `SELECT * FROM os_delivery_certificates ${where} ORDER BY created_at DESC LIMIT $${idx}`,
      [...params, Math.min(Math.max(limit, 1), 200)],
    );
    return rows.map((r) => rowToCert(r, false));
  }

  async getSummary(): Promise<CertSummary> {
    const rows = await this.db.query<{ total: string; issued: string; failed: string; avg_qa: string | null; last_issued: string | null }>(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'issued') AS issued,
              COUNT(*) FILTER (WHERE status = 'failed') AS failed,
              AVG(qa_score) FILTER (WHERE status = 'issued') AS avg_qa,
              MAX(issued_at) AS last_issued
       FROM os_delivery_certificates`,
    );
    const r = rows[0];
    return {
      total: parseInt(r?.total ?? "0", 10),
      issued: parseInt(r?.issued ?? "0", 10),
      failed: parseInt(r?.failed ?? "0", 10),
      avgQaScore: r?.avg_qa ? Math.round(parseFloat(r.avg_qa)) : 0,
      lastIssuedAt: r?.last_issued ?? null,
    };
  }
}
