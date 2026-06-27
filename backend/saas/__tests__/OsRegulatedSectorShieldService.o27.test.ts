/**
 * O27 — OsRegulatedSectorShieldService unit tests (mock db + ports)
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsRegulatedSectorShieldService,
  scanClaims,
  hasRequiredDisclaimer,
  computeShieldStatus,
  EU_DISCLAIMERS,
  type ShieldSectorPort,
  type ShieldQaPort,
} from "@nelvyon/saas";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return { query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)) } as unknown as SaasPostgresPort;
}
function sectorPort(regulated: boolean): ShieldSectorPort {
  return { isRegulated: async () => regulated };
}
const cleanQa: ShieldQaPort = { runVisualLegal: async () => ({ legal_passed: true, prohibited_terms: [] }) };

const DENTAL_DISCLAIMER = EU_DISCLAIMERS.dental!;

// ── scanClaims ───────────────────────────────────────────────────────────────────

describe("O27 — scanClaims", () => {
  it("detects a prohibited phrase", () => {
    const r = scanClaims("Ofrecemos curación garantizada para todos");
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it("detects rentabilidad garantizada", () => {
    expect(scanClaims("rentabilidad garantizada del 20%").ok).toBe(false);
  });

  it("clean text → ok", () => {
    const r = scanClaims("Servicio profesional con atención personalizada");
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });
});

// ── hasRequiredDisclaimer ────────────────────────────────────────────────────────

describe("O27 — hasRequiredDisclaimer", () => {
  it("dental with disclaimer → true", () => {
    expect(hasRequiredDisclaimer(DENTAL_DISCLAIMER, "dental")).toBe(true);
  });
  it("dental without disclaimer → false", () => {
    expect(hasRequiredDisclaimer("Ven a nuestra clínica dental", "dental")).toBe(false);
  });
  it("non-regulated sector with no template → true (n.a.)", () => {
    expect(hasRequiredDisclaimer("cualquier texto", "restaurant")).toBe(true);
  });
});

// ── computeShieldStatus ──────────────────────────────────────────────────────────

describe("O27 — computeShieldStatus", () => {
  it("regulated missing disclaimer → blocked", () => {
    expect(computeShieldStatus({ regulated: true, disclaimerOk: false, claimsOk: true })).toBe("blocked");
  });
  it("regulated failed claims → blocked", () => {
    expect(computeShieldStatus({ regulated: true, disclaimerOk: true, claimsOk: false })).toBe("blocked");
  });
  it("regulated all ok → passed", () => {
    expect(computeShieldStatus({ regulated: true, disclaimerOk: true, claimsOk: true })).toBe("passed");
  });
  it("non-regulated failed claims → warning", () => {
    expect(computeShieldStatus({ regulated: false, disclaimerOk: true, claimsOk: false })).toBe("warning");
  });
  it("non-regulated all ok → passed", () => {
    expect(computeShieldStatus({ regulated: false, disclaimerOk: true, claimsOk: true })).toBe("passed");
  });
});

// ── EU_DISCLAIMERS ───────────────────────────────────────────────────────────────

describe("O27 — EU_DISCLAIMERS", () => {
  it("has dental + legal keys", () => {
    expect(EU_DISCLAIMERS.dental).toBeTruthy();
    expect(EU_DISCLAIMERS.legal).toBeTruthy();
  });
  it("covers at least 8 regulated sectors", () => {
    expect(Object.keys(EU_DISCLAIMERS).length).toBeGreaterThanOrEqual(8);
  });
});

// ── evaluateShield ───────────────────────────────────────────────────────────────

describe("O27 — evaluateShield", () => {
  it("regulated + disclaimer + clean → passed", async () => {
    const svc = new OsRegulatedSectorShieldService(makeDb(() => []), sectorPort(true), cleanQa);
    const r = await svc.evaluateShield({ sectorId: "dental", htmlOrText: `Clínica dental top. ${DENTAL_DISCLAIMER}` });
    expect(r.status).toBe("passed");
    expect(r.regulated).toBe(true);
    expect(r.disclaimerOk).toBe(true);
    expect(r.claimsOk).toBe(true);
  });

  it("regulated missing disclaimer → blocked", async () => {
    const svc = new OsRegulatedSectorShieldService(makeDb(() => []), sectorPort(true), cleanQa);
    const r = await svc.evaluateShield({ sectorId: "dental", htmlOrText: "Clínica dental sin disclaimer" });
    expect(r.status).toBe("blocked");
    expect(r.disclaimerOk).toBe(false);
  });

  it("regulated prohibited claim → blocked", async () => {
    const svc = new OsRegulatedSectorShieldService(makeDb(() => []), sectorPort(true), cleanQa);
    const r = await svc.evaluateShield({ sectorId: "dental", htmlOrText: `curación garantizada. ${DENTAL_DISCLAIMER}` });
    expect(r.status).toBe("blocked");
    expect(r.claimsOk).toBe(false);
  });

  it("folds in visual QA legal violations", async () => {
    const qa: ShieldQaPort = { runVisualLegal: async () => ({ legal_passed: false, prohibited_terms: ["término_qa"] }) };
    const svc = new OsRegulatedSectorShieldService(makeDb(() => []), sectorPort(false), qa);
    const r = await svc.evaluateShield({ sectorId: "restaurant", htmlOrText: "texto limpio" });
    expect(r.claimsViolations).toContain("término_qa");
    expect(r.status).toBe("warning");
  });

  it("non-regulated includes checks array", async () => {
    const svc = new OsRegulatedSectorShieldService(makeDb(() => []), sectorPort(false), cleanQa);
    const r = await svc.evaluateShield({ sectorId: "restaurant", htmlOrText: "texto limpio" });
    expect(r.checks.length).toBe(3);
    expect(r.status).toBe("passed");
  });
});

// ── persist / evaluateAndPersist ─────────────────────────────────────────────────

describe("O27 — persistence", () => {
  it("evaluateAndPersist INSERTs and returns id", async () => {
    const sqls: string[] = [];
    const db = makeDb((sql) => { sqls.push(sql); return sql.includes("INSERT") ? [{ id: "audit-1" }] : []; });
    const svc = new OsRegulatedSectorShieldService(db, sectorPort(true), cleanQa);
    const r = await svc.evaluateAndPersist({ sectorId: "dental", htmlOrText: DENTAL_DISCLAIMER });
    expect(r.id).toBe("audit-1");
    expect(sqls.some((s) => s.includes("INSERT INTO os_sector_shield_audits"))).toBe(true);
  });

  it("evaluateAndPersist survives a persist failure", async () => {
    const db = makeDb((sql) => { if (sql.includes("INSERT")) throw new Error("db down"); return []; });
    const svc = new OsRegulatedSectorShieldService(db, sectorPort(true), cleanQa);
    const r = await svc.evaluateAndPersist({ sectorId: "dental", htmlOrText: DENTAL_DISCLAIMER });
    expect(r.id).toBeUndefined();
    expect(r.status).toBe("passed");
  });
});

// ── canPublishToPortal ───────────────────────────────────────────────────────────

describe("O27 — canPublishToPortal", () => {
  it("blocked metadata → not allowed", async () => {
    const svc = new OsRegulatedSectorShieldService(makeDb(() => []), sectorPort(true), cleanQa);
    const r = await svc.canPublishToPortal("dental", { shield_status: "blocked" });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  it("passed regulated → allowed", async () => {
    const svc = new OsRegulatedSectorShieldService(makeDb(() => []), sectorPort(true), cleanQa);
    const r = await svc.canPublishToPortal("dental", { shield_status: "passed" });
    expect(r.allowed).toBe(true);
  });

  it("non-regulated → allowed regardless", async () => {
    const svc = new OsRegulatedSectorShieldService(makeDb(() => []), sectorPort(false), cleanQa);
    const r = await svc.canPublishToPortal("restaurant", {});
    expect(r.allowed).toBe(true);
  });

  it("regulated pending shield → not allowed", async () => {
    const svc = new OsRegulatedSectorShieldService(makeDb(() => []), sectorPort(true), cleanQa);
    const r = await svc.canPublishToPortal("dental", { shield_status: "pending" });
    expect(r.allowed).toBe(false);
  });
});

// ── listAudits / getSummary ──────────────────────────────────────────────────────

describe("O27 — queries", () => {
  it("listAudits maps rows", async () => {
    const db = makeDb(() => [{
      id: "a1", pack_run_id: null, deliverable_ref: "NELVYON-LANDING", sector_id: "dental",
      status: "blocked", regulated: true, disclaimer_ok: false, claims_ok: true,
      disclaimer_text: "x", claims_violations: [], checks: [], metadata: {}, audited_at: "2026-06-01T00:00:00Z",
    }]);
    const list = await new OsRegulatedSectorShieldService(db, sectorPort(true), cleanQa).listAudits({ sectorId: "dental" });
    expect(list).toHaveLength(1);
    expect(list[0]!.status).toBe("blocked");
  });

  it("getSummary aggregates counts + violations", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("GROUP BY status")) return [
        { status: "blocked", count: "3", regulated_count: "3" },
        { status: "passed", count: "5", regulated_count: "2" },
      ];
      if (sql.includes("jsonb_array_elements_text")) return [{ violation: "curación garantizada", count: "2" }];
      return [];
    });
    const s = await new OsRegulatedSectorShieldService(db, sectorPort(true), cleanQa).getSummary();
    expect(s.total).toBe(8);
    expect(s.blocked).toBe(3);
    expect(s.passed).toBe(5);
    expect(s.regulatedAudits).toBe(5);
    expect(s.topViolations[0]!.violation).toBe("curación garantizada");
  });
});
