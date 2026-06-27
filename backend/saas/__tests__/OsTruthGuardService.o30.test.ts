/**
 * O30 — OsTruthGuardService unit tests
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsTruthGuardService,
  normalizeText,
  evaluateClaims,
  evaluateEmailSubject,
  evaluateAdsCopy,
  computeTruthStatus,
  DECEPTIVE_SUBJECT_PATTERNS,
  type TruthClaimsPort,
  type TruthLegalPort,
} from "../OsTruthGuardService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return { query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)) } as unknown as SaasPostgresPort;
}

const cleanClaims: TruthClaimsPort = { scan: () => ({ ok: true, violations: [] }) };
const badClaims: TruthClaimsPort = { scan: () => ({ ok: false, violations: ["resultados garantizados"] }) };
const cleanLegal: TruthLegalPort = { runLegal: async () => ({ ok: true, terms: [] }) };
const badLegal: TruthLegalPort = { runLegal: async () => ({ ok: false, terms: ["milagroso"] }) };

describe("O30 — normalizeText", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeText("  hola   mundo  ")).toBe("hola mundo");
  });
});

describe("O30 — evaluateClaims", () => {
  it("detects prohibited claims via scanFn", () => {
    const r = evaluateClaims("curación garantizada", badClaims.scan);
    expect(r.ok).toBe(false);
    expect(r.violations).toContain("resultados garantizados");
  });
});

describe("O30 — evaluateEmailSubject", () => {
  it("flags deceptive RE: ganaste", () => {
    const r = evaluateEmailSubject("RE: ganaste un premio");
    expect(r.ok).toBe(false);
  });

  it("accepts normal subject", () => {
    expect(evaluateEmailSubject("Newsletter marzo").ok).toBe(true);
  });
});

describe("O30 — DECEPTIVE_SUBJECT_PATTERNS", () => {
  it("matches URGENTE prefix", () => {
    expect(DECEPTIVE_SUBJECT_PATTERNS.some((re) => re.test("URGENTE: oferta"))).toBe(true);
  });
});

describe("O30 — evaluateAdsCopy", () => {
  it("fails when headline missing", () => {
    const r = evaluateAdsCopy("abc", "descripcion valida larga");
    expect(r.ok).toBe(false);
  });

  it("passes with valid headline and description", () => {
    const r = evaluateAdsCopy("Titulo ads", "Descripcion comercial valida para el anuncio");
    expect(r.ok).toBe(true);
  });
});

describe("O30 — computeTruthStatus", () => {
  it("blocked on claims fail", () => {
    expect(computeTruthStatus({ channel: "landing", claimsOk: false, legalOk: true, channelOk: true })).toBe("blocked");
  });

  it("blocked on landing legal fail", () => {
    expect(computeTruthStatus({ channel: "landing", claimsOk: true, legalOk: false, channelOk: true })).toBe("blocked");
  });

  it("warning on ads legal fail", () => {
    expect(computeTruthStatus({ channel: "ads", claimsOk: true, legalOk: false, channelOk: true })).toBe("warning");
  });

  it("passed when all ok", () => {
    expect(computeTruthStatus({ channel: "email", claimsOk: true, legalOk: true, channelOk: true })).toBe("passed");
  });
});

describe("O30 — OsTruthGuardService.evaluate", () => {
  it("landing blocked when legal fails", async () => {
    const svc = new OsTruthGuardService(makeDb(() => []), cleanClaims, badLegal);
    const r = await svc.evaluate({ channel: "landing", text: "Copy limpio profesional" });
    expect(r.status).toBe("blocked");
    expect(r.legalOk).toBe(false);
  });

  it("email blocked on deceptive subject", async () => {
    const svc = new OsTruthGuardService(makeDb(() => []), cleanClaims, cleanLegal);
    const r = await svc.evaluate({ channel: "email", subject: "URGENTE: actua ya", text: "Cuerpo normal" });
    expect(r.status).toBe("blocked");
    expect(r.channelOk).toBe(false);
  });

  it("ads blocked on short headline", async () => {
    const svc = new OsTruthGuardService(makeDb(() => []), cleanClaims, cleanLegal);
    const r = await svc.evaluate({ channel: "ads", headline: "Hi", description: "desc corta", text: "" });
    expect(r.status).toBe("blocked");
  });
});

describe("O30 — persist + list + summary", () => {
  it("evaluateAndPersist INSERT", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("INSERT INTO os_truth_guard_audits")) return [{ id: "audit-1" }];
      return [];
    });
    const svc = new OsTruthGuardService(db, cleanClaims, cleanLegal);
    const r = await svc.evaluateAndPersist({ channel: "landing", text: "Servicio profesional local" });
    expect(r.id).toBe("audit-1");
    expect(r.status).toBe("passed");
  });

  it("listAudits filters channel", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("SELECT * FROM os_truth_guard_audits")) {
        return [{
          id: "a1", channel: "email", pack_run_id: null, deliverable_ref: null, campania_id: null,
          tenant_id: null, workspace_id: null, sector_id: null, status: "passed", claims_ok: true,
          legal_ok: true, channel_ok: true, violations: [], checks: [], content_preview: "x",
          metadata: {}, audited_at: new Date().toISOString(),
        }];
      }
      return [];
    });
    const svc = new OsTruthGuardService(db, cleanClaims, cleanLegal);
    const rows = await svc.listAudits({ channel: "email" });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.channel).toBe("email");
  });

  it("getSummary counts", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("GROUP BY status")) return [{ status: "passed", count: "3" }, { status: "blocked", count: "1" }];
      if (sql.includes("GROUP BY channel")) return [{ channel: "landing", count: "2" }, { channel: "email", count: "2" }];
      if (sql.includes("jsonb_array_elements_text")) return [{ violation: "URGENTE", count: "2" }];
      return [];
    });
    const svc = new OsTruthGuardService(db, cleanClaims, cleanLegal);
    const s = await svc.getSummary();
    expect(s.total).toBe(4);
    expect(s.passed).toBe(3);
    expect(s.blocked).toBe(1);
    expect(s.byChannel.landing).toBe(2);
  });
});

describe("O30 — canPublish", () => {
  it("blocked when truth_status blocked", () => {
    const svc = new OsTruthGuardService(makeDb(() => []), cleanClaims, cleanLegal);
    const g = svc.canPublish("landing", { truth_status: "blocked" });
    expect(g.allowed).toBe(false);
  });

  it("passed when truth_status passed", () => {
    const svc = new OsTruthGuardService(makeDb(() => []), cleanClaims, cleanLegal);
    expect(svc.canPublish("landing", { truth_status: "passed" }).allowed).toBe(true);
  });
});
