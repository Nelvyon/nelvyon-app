/**
 * O23 — OsDeliveryCertificateService unit tests (mock db + injected ports)
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsDeliveryCertificateService,
  OsDeliveryCertError,
  type PackRunPort,
  type QaAuditPort,
  type VaultPort,
  type CertPackRun,
} from "@nelvyon/saas";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SaasPostgresPort;
}

function certRow(over: Record<string, unknown> = {}) {
  return {
    id: "cert-1", pack_run_id: "run-1", pack_id: "local-business-growth", tenant_id: null, workspace_id: 1,
    status: "issued", qa_score: "92", legal_passed: true, visual_score: "88", lighthouse_score: "95",
    seed_id: "dental_tpl_0", seed_source: "synthetic", agent_provider: "semrush", agents_used: ["NELVYON-SEO"],
    content_hash: "abc123", html_body: "<html>cert</html>", cert_url: null, metadata: {}, issued_at: "2026-06-01T00:00:00Z",
    created_at: "2026-06-01T00:00:00Z", ...over,
  };
}

const completedRun: CertPackRun = {
  id: "run-1",
  pack_id: "local-business-growth",
  workspace_id: 1,
  status: "completed",
  report: {
    kpis: { avg_qa_score: 92 },
    sku_results: [{ sku: "NELVYON-SEO", qa_legal_passed: true, seed_id: "dental_tpl_0" }, { sku: "NELVYON-LANDING", qa_legal_passed: true }],
    _agent_data: { provider: "semrush" },
    seed_meta: { seed_id: "dental_tpl_0", source: "synthetic" },
  },
};

function packRunPort(run: CertPackRun | null): PackRunPort {
  return { getPackRun: async () => run };
}
const qaPort: QaAuditPort = {
  getLatestForPackRun: async () => ({ visual_score: 88, lighthouse_score: 95, legal_passed: true, content_hash: "qahash123" }),
};
const noQaPort: QaAuditPort = { getLatestForPackRun: async () => null };

// Upsert-aware db: echoes inserted row.
function issueDb(extra?: (sql: string, params: unknown[]) => unknown[] | null): SaasPostgresPort {
  return makeDb((sql, params) => {
    const e = extra?.(sql, params);
    if (e) return e;
    if (sql.includes("INSERT INTO os_delivery_certificates") && sql.includes("RETURNING")) {
      const p = params as unknown[];
      return [certRow({
        pack_run_id: p[0], pack_id: p[1], tenant_id: p[2], workspace_id: p[3], status: p[4],
        qa_score: p[5], legal_passed: p[6], visual_score: p[7], lighthouse_score: p[8],
        seed_id: p[9], seed_source: p[10], agent_provider: p[11],
        agents_used: typeof p[12] === "string" ? JSON.parse(p[12] as string) : [],
        content_hash: p[13], html_body: p[14], issued_at: p[17],
      })];
    }
    return [];
  });
}

// ── computeContentHash ───────────────────────────────────────────────────────────

describe("OsDeliveryCertificateService — computeContentHash", () => {
  const svc = new OsDeliveryCertificateService(makeDb(() => []), packRunPort(null), noQaPort, { syncQaCertificate: async () => {} });
  it("is stable + 64 hex", () => {
    expect(svc.computeContentHash("a b")).toBe(svc.computeContentHash("a   b"));
    expect(svc.computeContentHash("x")).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ── buildCertificateHtml ─────────────────────────────────────────────────────────

describe("OsDeliveryCertificateService — buildCertificateHtml", () => {
  const svc = new OsDeliveryCertificateService(makeDb(() => []), packRunPort(null), noQaPort, { syncQaCertificate: async () => {} });
  it("includes seed_id, hash and legal badge", () => {
    const html = svc.buildCertificateHtml({
      packId: "local-business-growth", packRunId: "run-1", qaScore: 92, visualScore: 88, lighthouseScore: 95,
      legalPassed: true, seedId: "dental_tpl_0", seedSource: "synthetic", agentProvider: "semrush",
      agentsUsed: ["NELVYON-SEO"], contentHash: "abc123hash", issuedAt: "2026-06-01",
    });
    expect(html).toContain("dental_tpl_0");
    expect(html).toContain("abc123hash");
    expect(html).toContain("Legal aprobado");
    expect(html).toContain("local-business-growth");
  });
  it("shows legal not-passed badge when false", () => {
    const html = svc.buildCertificateHtml({
      packId: "p", packRunId: "r", qaScore: null, visualScore: null, lighthouseScore: null,
      legalPassed: false, seedId: null, seedSource: null, agentProvider: "none", agentsUsed: [],
      contentHash: null, issuedAt: "2026-06-01",
    });
    expect(html).toContain("Legal no superado");
  });
});

// ── issueCertificate ─────────────────────────────────────────────────────────────

describe("OsDeliveryCertificateService — issueCertificate", () => {
  it("completed run → issued + UPSERT + agents from sku_results", async () => {
    let synced: string[] = [];
    const vault: VaultPort = { syncQaCertificate: async (t, r, url, h) => { synced = [t, r, url, h]; } };
    const svc = new OsDeliveryCertificateService(issueDb(), packRunPort(completedRun), qaPort, vault);
    const cert = await svc.issueCertificate("run-1", { tenantId: "11111111-1111-1111-1111-111111111111" });
    expect(cert.status).toBe("issued");
    expect(cert.agentsUsed).toContain("NELVYON-SEO");
    expect(cert.qaScore).toBe(92);
    expect(cert.seedId).toBe("dental_tpl_0");
    expect(cert.agentProvider).toBe("semrush");
    expect(synced[2]).toContain("/api/os/certificates/");
  });

  it("uses QA audit content_hash when available", async () => {
    const svc = new OsDeliveryCertificateService(issueDb(), packRunPort(completedRun), qaPort, { syncQaCertificate: async () => {} });
    const cert = await svc.issueCertificate("run-1");
    expect(cert.contentHash).toBe("qahash123");
  });

  it("computes content hash when no QA audit", async () => {
    const svc = new OsDeliveryCertificateService(issueDb(), packRunPort(completedRun), noQaPort, { syncQaCertificate: async () => {} });
    const cert = await svc.issueCertificate("run-1");
    expect(cert.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("missing run → NOT_FOUND", async () => {
    const svc = new OsDeliveryCertificateService(makeDb(() => []), packRunPort(null), qaPort, { syncQaCertificate: async () => {} });
    await expect(svc.issueCertificate("nope")).rejects.toThrow(OsDeliveryCertError);
  });

  it("non-completed run without force → pending, no html", async () => {
    const running: CertPackRun = { ...completedRun, status: "running" };
    const svc = new OsDeliveryCertificateService(issueDb(), packRunPort(running), qaPort, { syncQaCertificate: async () => {} });
    const cert = await svc.issueCertificate("run-1");
    expect(cert.status).toBe("pending");
  });

  it("non-completed run WITH force → issued", async () => {
    const running: CertPackRun = { ...completedRun, status: "running" };
    const svc = new OsDeliveryCertificateService(issueDb(), packRunPort(running), qaPort, { syncQaCertificate: async () => {} });
    const cert = await svc.issueCertificate("run-1", { force: true });
    expect(cert.status).toBe("issued");
  });

  it("vault sync throwing does not fail issuance", async () => {
    const vault: VaultPort = { syncQaCertificate: async () => { throw new Error("vault down"); } };
    const svc = new OsDeliveryCertificateService(issueDb(), packRunPort(completedRun), qaPort, vault);
    const cert = await svc.issueCertificate("run-1", { tenantId: "11111111-1111-1111-1111-111111111111" });
    expect(cert.status).toBe("issued");
  });

  it("idempotent re-issue updates same pack_run (ON CONFLICT)", async () => {
    const sqls: string[] = [];
    const db = issueDb((sql) => { sqls.push(sql); return null; });
    const svc = new OsDeliveryCertificateService(db, packRunPort(completedRun), qaPort, { syncQaCertificate: async () => {} });
    await svc.issueCertificate("run-1");
    expect(sqls.some((s) => s.includes("ON CONFLICT (pack_run_id)"))).toBe(true);
  });
});

// ── getCertificate / getByPackRun / listCertificates ─────────────────────────────

describe("OsDeliveryCertificateService — queries", () => {
  it("getCertificate maps row with html", async () => {
    const db = makeDb(() => [certRow()]);
    const svc = new OsDeliveryCertificateService(db, packRunPort(null), qaPort, { syncQaCertificate: async () => {} });
    const c = await svc.getCertificate("cert-1");
    expect(c.htmlBody).toBe("<html>cert</html>");
  });

  it("getCertificate throws NOT_FOUND when absent", async () => {
    const svc = new OsDeliveryCertificateService(makeDb(() => []), packRunPort(null), qaPort, { syncQaCertificate: async () => {} });
    await expect(svc.getCertificate("x")).rejects.toThrow(OsDeliveryCertError);
  });

  it("listCertificates excludes html + applies packId filter", async () => {
    const db = makeDb(() => [certRow()]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new OsDeliveryCertificateService(db, packRunPort(null), qaPort, { syncQaCertificate: async () => {} });
    const list = await svc.listCertificates(50, { packId: "local-business-growth" });
    expect(list[0]!.htmlBody).toBeUndefined();
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(params).toContain("local-business-growth");
  });

  it("getSummary aggregates issued + avg qa", async () => {
    const db = makeDb(() => [{ total: "10", issued: "8", failed: "1", avg_qa: "90.4", last_issued: "2026-06-01T00:00:00Z" }]);
    const svc = new OsDeliveryCertificateService(db, packRunPort(null), qaPort, { syncQaCertificate: async () => {} });
    const s = await svc.getSummary();
    expect(s.total).toBe(10);
    expect(s.issued).toBe(8);
    expect(s.avgQaScore).toBe(90);
  });
});
