import { describe, expect, it, vi } from "vitest";

import { SaasResultsService, saasResultsService, type ServiceResult } from "../SaasResultsService";

const row = (over: Partial<ServiceResult> = {}): ServiceResult => ({
  id: "00000000-0000-0000-0000-000000000001",
  userId: "u1",
  tenantId: "t1",
  jobId: "job-1",
  serviceId: "seo_premium",
  serviceName: "SEO Premium",
  summary: "Resultado OK",
  details: { score: 88 },
  assetUrls: ["https://asset/1.pdf"],
  status: "completed",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("SaasResultsService", () => {
  it("saveResult guarda y devuelve resultado completo", async () => {
    const saved = row();
    const query = vi.fn().mockResolvedValue([saved]);
    const svc = new SaasResultsService({ db: { query } });
    const out = await svc.saveResult({
      userId: "u1",
      tenantId: "t1",
      jobId: "job-1",
      serviceId: "seo_premium",
      serviceName: "SEO Premium",
      summary: "Resultado OK",
      details: { score: 88 },
      assetUrls: ["https://asset/1.pdf"],
      status: "completed",
    });
    expect(out).toEqual(saved);
    expect(String(query.mock.calls[0]?.[0])).toContain("INSERT INTO saas_service_results");
  });

  it("saveResult lanza si no retorna fila", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasResultsService({ db: { query } });
    await expect(
      svc.saveResult({
        userId: "u1",
        tenantId: "t1",
        serviceId: "seo_premium",
        serviceName: "SEO Premium",
        summary: "x",
        details: {},
        assetUrls: [],
        status: "completed",
      }),
    ).rejects.toThrow("no row");
  });

  it("getResults sin filtros devuelve todos los resultados del usuario", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ count: "2" }]).mockResolvedValueOnce([row(), row({ id: "2" })]);
    const svc = new SaasResultsService({ db: { query } });
    const out = await svc.getResults({ userId: "u1", tenantId: "t1" });
    expect(out.results).toHaveLength(2);
    expect(out.total).toBe(2);
  });

  it("getResults filtrado por serviceId devuelve solo ese servicio", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ count: "1" }]).mockResolvedValueOnce([row({ serviceId: "ads_premium" })]);
    const svc = new SaasResultsService({ db: { query } });
    await svc.getResults({ userId: "u1", tenantId: "t1", serviceId: "ads_premium" });
    const countSql = String(query.mock.calls[0]?.[0]);
    expect(countSql).toContain("service_id = $3");
    expect(query.mock.calls[0]?.[1]).toEqual(["u1", "t1", "ads_premium"]);
  });

  it("getResults filtrado por status devuelve solo ese estado", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ count: "1" }]).mockResolvedValueOnce([row({ status: "failed" })]);
    const svc = new SaasResultsService({ db: { query } });
    await svc.getResults({ userId: "u1", tenantId: "t1", status: "failed" });
    expect(String(query.mock.calls[0]?.[0])).toContain("status = $3");
    expect(query.mock.calls[0]?.[1]).toEqual(["u1", "t1", "failed"]);
  });

  it("getResults paginación con limit y offset funciona correctamente", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ count: "50" }]).mockResolvedValueOnce([]);
    const svc = new SaasResultsService({ db: { query } });
    await svc.getResults({ userId: "u1", tenantId: "t1", limit: 10, offset: 20 });
    const args = query.mock.calls[1]?.[1] as unknown[];
    expect(args.at(-2)).toBe(10);
    expect(args.at(-1)).toBe(20);
  });

  it("getResults devuelve total correcto", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ count: "7" }]).mockResolvedValueOnce([]);
    const svc = new SaasResultsService({ db: { query } });
    const out = await svc.getResults({ userId: "u1", tenantId: "t1" });
    expect(out.total).toBe(7);
  });

  it("getResults de otro usuario no devuelve resultados ajenos", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ count: "0" }]).mockResolvedValueOnce([]);
    const svc = new SaasResultsService({ db: { query } });
    const out = await svc.getResults({ userId: "otro", tenantId: "t1" });
    expect(out.results).toHaveLength(0);
    expect(query.mock.calls[0]?.[1]?.[0]).toBe("otro");
  });

  it("getResultById con id válido devuelve resultado", async () => {
    const query = vi.fn().mockResolvedValue([row()]);
    const svc = new SaasResultsService({ db: { query } });
    const out = await svc.getResultById("00000000-0000-0000-0000-000000000001", "u1");
    expect(out?.id).toBe("00000000-0000-0000-0000-000000000001");
    expect(String(query.mock.calls[0]?.[0])).toContain("id = $1::uuid");
  });

  it("getResultById con id de otro usuario devuelve null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasResultsService({ db: { query } });
    expect(await svc.getResultById("00000000-0000-0000-0000-000000000001", "u2")).toBeNull();
  });

  it("getResults acota limit máximo a 100", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ count: "0" }]).mockResolvedValueOnce([]);
    const svc = new SaasResultsService({ db: { query } });
    await svc.getResults({ userId: "u1", tenantId: "t1", limit: 999 });
    const args = query.mock.calls[1]?.[1] as unknown[];
    expect(args.at(-2)).toBe(100);
  });

  it("getResults acota offset mínimo a 0", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ count: "0" }]).mockResolvedValueOnce([]);
    const svc = new SaasResultsService({ db: { query } });
    await svc.getResults({ userId: "u1", tenantId: "t1", offset: -4 });
    const args = query.mock.calls[1]?.[1] as unknown[];
    expect(args.at(-1)).toBe(0);
  });

  it("saasResultsService singleton es instancia de SaasResultsService", () => {
    expect(saasResultsService).toBeInstanceOf(SaasResultsService);
  });
});
