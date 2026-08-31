/**
 * O27 — OsRegulatedSectorShieldService unit tests (mock db + ports)
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsRegulatedSectorShieldService,
  TODOS_LOS_INQUILINOS,
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
  it("sector sin aviso definido → false (no verificable, no «n.a.»)", () => {
    /**
     * Antes esto esperaba `true` con el nombre «n.a.». Ese `true` significaba
     * dos cosas a la vez —«no hace falta aviso» y «no se sabe que aviso hace
     * falta»— y por la segunda se colaba un sector regulado sin comprobar nada.
     *
     * La funcion responde ahora solo lo que puede verificar. Quien sabe si hace
     * falta es `evaluateShield`, que ni la llama cuando el sector no esta
     * regulado.
     */
    expect(hasRequiredDisclaimer("cualquier texto", "restaurant")).toBe(false);
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

const TENANT = "11111111-1111-1111-1111-111111111111";
const OTRO_TENANT = "22222222-2222-2222-2222-222222222222";

// ── persist / evaluateAndPersist ─────────────────────────────────────────────────

describe("O27 — persistence", () => {
  it("evaluateAndPersist INSERTs and returns id", async () => {
    const sqls: string[] = [];
    const db = makeDb((sql) => { sqls.push(sql); return sql.includes("INSERT") ? [{ id: "audit-1" }] : []; });
    const svc = new OsRegulatedSectorShieldService(db, sectorPort(true), cleanQa);
    const r = await svc.evaluateAndPersist({ sectorId: "dental", htmlOrText: DENTAL_DISCLAIMER }, { tenantId: TENANT });
    expect(r.id).toBe("audit-1");
    expect(sqls.some((s) => s.includes("INSERT INTO os_sector_shield_audits"))).toBe(true);
  });

  it("evaluateAndPersist survives a persist failure", async () => {
    const db = makeDb((sql) => { if (sql.includes("INSERT")) throw new Error("db down"); return []; });
    const svc = new OsRegulatedSectorShieldService(db, sectorPort(true), cleanQa);
    const r = await svc.evaluateAndPersist({ sectorId: "dental", htmlOrText: DENTAL_DISCLAIMER }, { tenantId: TENANT });
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
    const list = await new OsRegulatedSectorShieldService(db, sectorPort(true), cleanQa).listAudits({ tenantId: TENANT }, { sectorId: "dental" });
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
    const s = await new OsRegulatedSectorShieldService(db, sectorPort(true), cleanQa).getSummary({ tenantId: TENANT });
    expect(s.total).toBe(8);
    expect(s.blocked).toBe(3);
    expect(s.passed).toBe(5);
    expect(s.regulatedAudits).toBe(5);
    expect(s.topViolations[0]!.violation).toBe("curación garantizada");
  });
});

// ── Aislamiento entre inquilinos ────────────────────────────────────────────────
//
// Estas cuatro nacen de tres defectos encadenados encontrados en este servicio:
//
//   1. `persistAudit` no escribia `tenant_id` ni `workspace_id`. Las 2.761 filas
//      que hay en produccion tienen los dos a NULL: no se sabe de quien es
//      ninguna, y por eso no se puede activar RLS sobre la tabla.
//   2. `listAudits` y `getSummary` no filtraban por nadie. La ruta
//      `/api/os/shield` solo exige SESION —`requirePlatformClaims` autentica, no
//      autoriza—, la tabla no tiene RLS y la conexion del lado web es
//      superusuario: cualquier usuario autenticado de cualquier inquilino veia
//      los incumplimientos de los demas.
//   3. `evaluateAndPersist` hacia `catch { /* best-effort */ }`. Un fallo al
//      guardar devolvia el resultado como si estuviera guardado.
//
// Se comprueba el SQL que sale, no lo que el servicio dice hacer.

describe("O27 — aislamiento entre inquilinos", () => {
  it("persistAudit atribuye la auditoria a su dueño", async () => {
    const params: unknown[][] = [];
    const db = makeDb((sql, p) => { params.push((p ?? []) as unknown[]); return sql.includes("INSERT") ? [{ id: "a1" }] : []; });
    const svc = new OsRegulatedSectorShieldService(db, sectorPort(true), cleanQa);
    await svc.evaluateAndPersist({ sectorId: "dental", htmlOrText: DENTAL_DISCLAIMER }, { tenantId: TENANT });
    expect(params.some((ps) => ps.includes(TENANT))).toBe(true);
  });

  it("persistAudit se niega a guardar una auditoria sin dueño", async () => {
    const svc = new OsRegulatedSectorShieldService(makeDb(() => []), sectorPort(true), cleanQa);
    // @ts-expect-error se comprueba el guardia en tiempo de ejecucion, no el tipo
    await expect(svc.persistAudit({ claimsViolations: [], checks: [], metadata: {} }, undefined))
      .rejects.toThrow();
  });

  it("listAudits acota por inquilino en el SQL que sale", async () => {
    let sql = "";
    const params: unknown[] = [];
    const db = makeDb((q, p) => { sql = q; params.push(...((p ?? []) as unknown[])); return []; });
    await new OsRegulatedSectorShieldService(db, sectorPort(true), cleanQa)
      .listAudits({ tenantId: OTRO_TENANT }, { limit: 10 });
    expect(sql).toContain("tenant_id =");
    expect(params).toContain(OTRO_TENANT);
  });

  it("getSummary acota por inquilino en el SQL que sale", async () => {
    const sqls: string[] = [];
    const db = makeDb((q) => { sqls.push(q); return []; });
    await new OsRegulatedSectorShieldService(db, sectorPort(true), cleanQa).getSummary({ tenantId: TENANT });
    // las DOS consultas del resumen: el recuento y el top de violaciones
    expect(sqls.filter((q) => q.includes("os_sector_shield_audits")).every((q) => q.includes("tenant_id ="))).toBe(true);
  });

  it("lo global sigue siendo posible, pero hay que escribirlo", async () => {
    // EL CONTROL. Los crons de la plataforma necesitan la foto de todos, y
    // romperlos para cerrar el agujero seria cambiar un fallo por otro. Lo que
    // cambia es que ahora se ve en el codigo quien pide acceso global.
    let sql = "";
    const db = makeDb((q) => { sql = q; return []; });
    await new OsRegulatedSectorShieldService(db, sectorPort(true), cleanQa)
      .listAudits(TODOS_LOS_INQUILINOS, { limit: 5 });
    expect(sql).not.toContain("tenant_id =");
  });

  it("un fallo al guardar deja de parecer un exito", async () => {
    const db = makeDb((sql) => { if (sql.includes("INSERT")) throw new Error("db down"); return []; });
    const svc = new OsRegulatedSectorShieldService(db, sectorPort(true), cleanQa);
    const r = await svc.evaluateAndPersist({ sectorId: "dental", htmlOrText: DENTAL_DISCLAIMER }, { tenantId: TENANT });
    expect(r.persistError).toBeTruthy();
    // y la evaluacion sigue siendo util: el veredicto vale aunque no se guardara
    expect(r.status).toBe("passed");
  });
});
