import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaasCeoBriefService, resetSaasCeoBriefServiceForTests } from "../SaasCeoBriefService";

const missingRelation = Object.assign(new Error('relation "saas_ceo_brief_settings" does not exist'), {
  code: "42P01",
});

describe("SaasCeoBriefService schema drift", () => {
  beforeEach(() => {
    resetSaasCeoBriefServiceForTests();
  });

  it("listTenantsForBrief falls back when settings table is missing", async () => {
    const db = {
      query: vi
        .fn()
        .mockRejectedValueOnce(missingRelation)
        .mockResolvedValueOnce([{ id: "tenant-1" }]),
    };
    const svc = new SaasCeoBriefService(db);
    const ids = await svc.listTenantsForBrief(7);
    expect(ids).toEqual(["tenant-1"]);
  });

  it("recordRun returns empty id when runs table is missing", async () => {
    const db = { query: vi.fn().mockRejectedValue(missingRelation) };
    const svc = new SaasCeoBriefService(db);
    const id = await svc.recordRun(
      "tenant-1",
      {
        tenantId: "tenant-1",
        summaryText: "test",
        metrics: {
          activeJobs: 0,
          completedJobs: 0,
          totalSpend: 0,
          contacts: 0,
          openDeals: 0,
          pipelineValue: 0,
          pendingInbox: 0,
          recentPackRuns: 0,
          avgQaScore: null,
          autonomyMode: "propose",
        },
        generatedAt: new Date().toISOString(),
      },
      ["stored"],
    );
    expect(id).toBe("");
  });

  it("getLatestBrief returns null when runs table is missing", async () => {
    const db = { query: vi.fn().mockRejectedValue(missingRelation) };
    const svc = new SaasCeoBriefService(db);
    await expect(svc.getLatestBrief("tenant-1")).resolves.toBeNull();
  });
});

describe("SaasCeoBriefService — a quien se le compone brief", () => {
  const missingRelation = Object.assign(new Error('relation "x" does not exist'), {
    code: "42P01",
  });

  /**
   * EL DERROCHE QUE ESTO IMPIDE
   * ---------------------------
   * `saas_ceo_brief_settings` esta vacia en produccion, asi que el fallback
   * dispara siempre. Filtraba solo por `onboarding_completed = TRUE`: 22
   * inquilinos, 20 de ellos sin workspace asignado y 21 sin nadie que pudiera
   * entrar a leer el resultado. 153 briefs en tres semanas para nadie.
   *
   * El criterio correcto es ACTIVIDAD —existe una pertenencia activa al
   * workspace—, no el dominio del correo: un inquilino real puede usar `.test`
   * en pruebas legitimas y uno de certificacion puede no usarlo.
   */
  it("el fallback exige una pertenencia ACTIVA, no solo onboarding completado", async () => {
    const db = {
      query: vi
        .fn()
        .mockRejectedValueOnce(missingRelation)
        .mockResolvedValueOnce([{ id: "tenant-alcanzable" }]),
    };
    const svc = new SaasCeoBriefService(db);
    const ids = await svc.listTenantsForBrief(7);

    const sql = db.query.mock.calls[1][0] as string;
    expect(sql).toContain("workspace_members");
    expect(sql).toContain("status = 'active'");
    expect(ids).toEqual(["tenant-alcanzable"]);
  });

  it("el fallback no repite brief a quien ya lo recibio hoy", async () => {
    const db = {
      query: vi.fn().mockRejectedValueOnce(missingRelation).mockResolvedValueOnce([]),
    };
    const svc = new SaasCeoBriefService(db);
    await svc.listTenantsForBrief(7);

    const sql = db.query.mock.calls[1][0] as string;
    expect(sql).toContain("saas_ceo_brief_runs");
    expect(sql).toContain("20 hours");
  });

  it("NO excluye por dominio del correo", async () => {
    const db = {
      query: vi.fn().mockRejectedValueOnce(missingRelation).mockResolvedValueOnce([]),
    };
    const svc = new SaasCeoBriefService(db);
    await svc.listTenantsForBrief(7);

    const sql = (db.query.mock.calls[1][0] as string).toLowerCase();
    expect(sql).not.toContain("nelvyon.test");
    expect(sql).not.toContain("email like");
  });

  it("la configuracion explicita sigue mandando sobre el fallback", async () => {
    const db = {
      query: vi.fn().mockResolvedValueOnce([{ tenant_id: "configurado" }]),
    };
    const svc = new SaasCeoBriefService(db);
    expect(await svc.listTenantsForBrief(9)).toEqual(["configurado"]);
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});
