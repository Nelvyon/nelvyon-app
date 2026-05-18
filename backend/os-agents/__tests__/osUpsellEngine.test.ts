import { describe, expect, it, vi } from "vitest";

import { OsUpsellEngine, osUpsellEngine } from "../upsell/OsUpsellEngine";

const TENANT = "00000000-0000-0000-0000-0000000000aa";
const CLIENT = "client-upsell-1";

function catalogRows() {
  return [
    { service_id: "web_premium", name: "Web Premium", description: "Sitio web de alto impacto" },
    { service_id: "seo_premium", name: "SEO Premium", description: "Posicionamiento orgánico" },
    { service_id: "ads_premium", name: "Ads Premium", description: "Campañas pagadas" },
  ];
}

describe("OsUpsellEngine", () => {
  it("analyzeClient con cliente sin servicios contratados recomienda un servicio del catálogo", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("os_service_contracts")) return [];
      if (sql.includes("os_service_catalog")) return catalogRows();
      if (sql.includes("os_job_results")) return [];
      if (sql.includes("INSERT INTO os_upsell_suggestions")) return [];
      return [];
    });
    const complete = vi.fn().mockResolvedValue(
      JSON.stringify({ serviceId: "seo_premium", reason: "Complementa alcance orgánico", score: 88 }),
    );
    const engine = new OsUpsellEngine({ db: { query }, llm: { complete } });
    const r = await engine.analyzeClient(CLIENT, TENANT);
    expect(r).toEqual({
      clientId: CLIENT,
      tenantId: TENANT,
      suggestedServiceId: "seo_premium",
      reason: "Complementa alcance orgánico",
      score: 88,
    });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("analyzeClient con cliente que ya tiene todos los servicios activos devuelve null", async () => {
    const contracted = catalogRows().map((c) => ({ service_id: c.service_id }));
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("os_service_contracts")) return contracted;
      if (sql.includes("os_service_catalog")) return catalogRows();
      if (sql.includes("os_job_results")) return [];
      return [];
    });
    const engine = new OsUpsellEngine({ db: { query }, llm: { complete: vi.fn() } });
    const r = await engine.analyzeClient(CLIENT, TENANT);
    expect(r).toBeNull();
  });

  it("analyzeClient con catálogo activo vacío devuelve null", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("os_service_contracts")) return [];
      if (sql.includes("os_service_catalog")) return [];
      if (sql.includes("os_job_results")) return [];
      return [];
    });
    const engine = new OsUpsellEngine({ db: { query }, llm: { complete: vi.fn() } });
    expect(await engine.analyzeClient(CLIENT, TENANT)).toBeNull();
  });

  it("analyzeClient con LLM que devuelve JSON inválido devuelve null sin crashear", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("os_service_contracts")) return [];
      if (sql.includes("os_service_catalog")) return catalogRows();
      if (sql.includes("os_job_results")) return [];
      return [];
    });
    const engine = new OsUpsellEngine({
      db: { query },
      llm: { complete: vi.fn().mockResolvedValue("esto no es json") },
    });
    await expect(engine.analyzeClient(CLIENT, TENANT)).resolves.toBeNull();
  });

  it("analyzeClient con LLM que sugiere servicio fuera del catálogo disponible devuelve null", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("os_service_contracts")) return [];
      if (sql.includes("os_service_catalog")) return catalogRows();
      if (sql.includes("os_job_results")) return [];
      return [];
    });
    const engine = new OsUpsellEngine({
      db: { query },
      llm: { complete: vi.fn().mockResolvedValue(JSON.stringify({ serviceId: "fantasma_xyz", reason: "x", score: 50 })) },
    });
    expect(await engine.analyzeClient(CLIENT, TENANT)).toBeNull();
  });

  it("analyzeClient persiste sugerencia en os_upsell_suggestions", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("os_service_contracts")) return [];
      if (sql.includes("os_service_catalog")) return catalogRows();
      if (sql.includes("os_job_results")) return [];
      if (sql.includes("INSERT INTO os_upsell_suggestions")) return [];
      return [];
    });
    const engine = new OsUpsellEngine({
      db: { query },
      llm: { complete: vi.fn().mockResolvedValue(JSON.stringify({ serviceId: "web_premium", reason: "Base digital", score: 72 })) },
    });
    await engine.analyzeClient(CLIENT, TENANT);
    const insertCall = query.mock.calls.find((c) => String(c[0]).includes("INSERT INTO os_upsell_suggestions"));
    expect(insertCall).toBeDefined();
    expect(insertCall?.[1]).toEqual([CLIENT, TENANT, "web_premium", "Base digital", 72]);
  });

  it("analyzeClient acepta JSON envuelto en fence markdown", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("os_service_contracts")) return [];
      if (sql.includes("os_service_catalog")) return catalogRows();
      if (sql.includes("os_job_results")) return [];
      if (sql.includes("INSERT INTO os_upsell_suggestions")) return [];
      return [];
    });
    const fenced = "```json\n" + JSON.stringify({ serviceId: "ads_premium", reason: "Amplificar", score: 61 }) + "\n```";
    const engine = new OsUpsellEngine({ db: { query }, llm: { complete: vi.fn().mockResolvedValue(fenced) } });
    const r = await engine.analyzeClient(CLIENT, TENANT);
    expect(r?.suggestedServiceId).toBe("ads_premium");
    expect(r?.score).toBe(61);
  });

  it("analyzeClient normaliza score al rango 0-100", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("os_service_contracts")) return [];
      if (sql.includes("os_service_catalog")) return catalogRows();
      if (sql.includes("os_job_results")) return [];
      if (sql.includes("INSERT INTO os_upsell_suggestions")) return [];
      return [];
    });
    const engine = new OsUpsellEngine({
      db: { query },
      llm: { complete: vi.fn().mockResolvedValue(JSON.stringify({ serviceId: "seo_premium", reason: "x", score: 999 })) },
    });
    const r = await engine.analyzeClient(CLIENT, TENANT);
    expect(r?.score).toBe(100);
    const insertCall = query.mock.calls.find((c) => String(c[0]).includes("INSERT INTO os_upsell_suggestions"));
    expect(insertCall?.[1]?.[4]).toBe(100);
  });

  it("analyzeClient excluye servicios ya contratados del conjunto disponible", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("os_service_contracts")) return [{ service_id: "web_premium" }];
      if (sql.includes("os_service_catalog")) return catalogRows();
      if (sql.includes("os_job_results")) return [];
      if (sql.includes("INSERT INTO os_upsell_suggestions")) return [];
      return [];
    });
    const complete = vi.fn().mockImplementation((prompt: string) => {
      expect(prompt).not.toContain("web_premium:");
      return Promise.resolve(JSON.stringify({ serviceId: "seo_premium", reason: "ok", score: 50 }));
    });
    const engine = new OsUpsellEngine({ db: { query }, llm: { complete } });
    await engine.analyzeClient(CLIENT, TENANT);
    expect(complete).toHaveBeenCalled();
  });

  it("getPendingSuggestions devuelve filas ordenadas por score DESC (consulta SQL)", async () => {
    const query = vi.fn().mockResolvedValue([
      { clientId: "a", tenantId: TENANT, suggestedServiceId: "seo_premium", reason: "r1", score: 90 },
      { clientId: "b", tenantId: TENANT, suggestedServiceId: "ads_premium", reason: "r2", score: 40 },
    ]);
    const engine = new OsUpsellEngine({ db: { query }, llm: { complete: vi.fn() } });
    await engine.getPendingSuggestions(TENANT);
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain("ORDER BY score DESC");
    expect(sql).toContain("status = 'pending'");
  });

  it("getPendingSuggestions mapea columnas a UpsellSuggestion", async () => {
    const rows = [
      { clientId: "c1", tenantId: TENANT, suggestedServiceId: "web_premium", reason: "x", score: 77 },
    ];
    const query = vi.fn().mockResolvedValue(rows);
    const engine = new OsUpsellEngine({ db: { query }, llm: { complete: vi.fn() } });
    const list = await engine.getPendingSuggestions(TENANT);
    expect(list).toEqual(rows);
    expect(query).toHaveBeenCalledWith(expect.any(String), [TENANT]);
  });

  it("osUpsellEngine singleton es instancia de OsUpsellEngine", () => {
    expect(osUpsellEngine).toBeInstanceOf(OsUpsellEngine);
  });

  it("analyzeClient consulta historial os_job_results limit 10", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("os_service_contracts")) return [];
      if (sql.includes("os_service_catalog")) return catalogRows();
      if (sql.includes("os_job_results")) {
        expect(sql).toContain("LIMIT 10");
        return [{ service_id: "web_premium", result_summary: "Entregado" }];
      }
      if (sql.includes("INSERT INTO os_upsell_suggestions")) return [];
      return [];
    });
    const complete = vi.fn().mockResolvedValue(JSON.stringify({ serviceId: "seo_premium", reason: "hist", score: 55 }));
    const engine = new OsUpsellEngine({ db: { query }, llm: { complete } });
    await engine.analyzeClient(CLIENT, TENANT);
    expect(complete).toHaveBeenCalledWith(expect.stringContaining("Entregado"));
  });
});
