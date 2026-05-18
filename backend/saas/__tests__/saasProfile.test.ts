import { describe, expect, it, vi } from "vitest";

import { SaasProfileService, saasProfileService } from "../SaasProfileService";

const profileRow = (over: Partial<Record<string, unknown>> = {}) => ({
  userId: "u1",
  tenantId: "t1",
  fullName: "Ana",
  company: "ACME",
  website: "https://acme.test",
  phone: "+34000",
  sector: "Retail",
  timezone: "Europe/Madrid",
  language: "es",
  updatedAt: "2026-01-15T12:00:00.000Z",
  ...over,
});

describe("SaasProfileService", () => {
  it("getProfile con usuario existente devuelve perfil", async () => {
    const p = profileRow();
    const query = vi.fn().mockResolvedValue([p]);
    const svc = new SaasProfileService({ db: { query } });
    const out = await svc.getProfile("u1", "t1");
    expect(out).toEqual(p);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("FROM saas_client_profiles"), ["u1", "t1"]);
  });

  it("getProfile con usuario inexistente devuelve null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasProfileService({ db: { query } });
    expect(await svc.getProfile("x", "y")).toBeNull();
  });

  it("upsertProfile crea perfil nuevo correctamente", async () => {
    const created = profileRow({ fullName: "Bob", company: "Beta" });
    const query = vi
      .fn()
      .mockResolvedValueOnce([]) // getProfile
      .mockResolvedValueOnce([created]) // upsert RETURNING
      .mockResolvedValue([]); // changelog inserts
    const svc = new SaasProfileService({ db: { query } });
    const out = await svc.upsertProfile("u1", "t1", { fullName: "Bob", company: "Beta" });
    expect(out).toEqual(created);
    expect(String(query.mock.calls[1]?.[0])).toContain("INSERT INTO saas_client_profiles");
  });

  it("upsertProfile actualiza sin borrar campos no enviados (COALESCE en SQL)", async () => {
    const current = profileRow();
    const updated = profileRow({ company: "NEWCO", fullName: "Ana" });
    const query = vi
      .fn()
      .mockResolvedValueOnce([current])
      .mockResolvedValueOnce([updated])
      .mockResolvedValue([]); // changelog + any follow-up
    const svc = new SaasProfileService({ db: { query } });
    await svc.upsertProfile("u1", "t1", { company: "NEWCO" });
    const sqlUpsert = query.mock.calls.map((c) => String(c[0])).find((s) => s.includes("INSERT INTO saas_client_profiles"));
    expect(sqlUpsert).toBeDefined();
    expect(sqlUpsert).toContain("COALESCE(EXCLUDED.company");
    expect(sqlUpsert).toContain("ON CONFLICT (user_id, tenant_id)");
  });

  it("upsertProfile registra cambios en saas_profile_changelog", async () => {
    const current = profileRow({ fullName: "Old", company: "C1" });
    const updated = profileRow({ fullName: "New", company: "C1" });
    const query = vi
      .fn()
      .mockResolvedValueOnce([current])
      .mockResolvedValueOnce([updated])
      .mockResolvedValue([]); // each changelog insert
    const svc = new SaasProfileService({ db: { query } });
    await svc.upsertProfile("u1", "t1", { fullName: "New" });
    const changelogCalls = query.mock.calls.filter((c) => String(c[0]).includes("INSERT INTO saas_profile_changelog"));
    expect(changelogCalls.length).toBeGreaterThanOrEqual(1);
    expect(changelogCalls[0]?.[1]).toEqual(["u1", "fullName", "Old", "New"]);
  });

  it("upsertProfile no registra changelog si el valor no cambió", async () => {
    const current = profileRow({ fullName: "Same", company: "C1" });
    const updated = profileRow({ fullName: "Same", company: "C1" });
    const query = vi.fn().mockResolvedValueOnce([current]).mockResolvedValueOnce([updated]);
    const svc = new SaasProfileService({ db: { query } });
    await svc.upsertProfile("u1", "t1", { fullName: "Same" });
    const changelogCalls = query.mock.calls.filter((c) => String(c[0]).includes("saas_profile_changelog"));
    expect(changelogCalls).toHaveLength(0);
  });

  it("getChangeLog devuelve historial ordenado por fecha DESC", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasProfileService({ db: { query } });
    await svc.getChangeLog("u1", 10);
    expect(String(query.mock.calls[0]?.[0])).toContain("ORDER BY changed_at DESC");
  });

  it("getChangeLog respeta el límite", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasProfileService({ db: { query } });
    await svc.getChangeLog("u1", 5);
    expect(query.mock.calls[0]?.[1]).toEqual(["u1", 5]);
  });

  it("getChangeLog acota límite a rango 1-100", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasProfileService({ db: { query } });
    await svc.getChangeLog("u1", 500);
    expect(query.mock.calls[0]?.[1]).toEqual(["u1", 100]);
    query.mockClear();
    await svc.getChangeLog("u1", 0);
    expect(query.mock.calls[0]?.[1]).toEqual(["u1", 1]);
  });

  it("saasProfileService singleton es instancia de SaasProfileService", () => {
    expect(saasProfileService).toBeInstanceOf(SaasProfileService);
  });

  it("upsertProfile lanza si upsert no devuelve fila", async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const svc = new SaasProfileService({ db: { query } });
    await expect(svc.upsertProfile("u1", "t1", { company: "X" })).rejects.toThrow("no row");
  });

  it("upsertProfile en alta registra changelog para campos enviados", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([]) // no current
      .mockResolvedValueOnce([profileRow({ fullName: "N", company: "Co" })])
      .mockResolvedValue([]);
    const svc = new SaasProfileService({ db: { query } });
    await svc.upsertProfile("u1", "t1", { fullName: "N", company: "Co" });
    const inserts = query.mock.calls.filter((c) => String(c[0]).includes("saas_profile_changelog"));
    expect(inserts.length).toBe(2);
  });

  it("getChangeLog usa LIMIT con segundo parámetro", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasProfileService({ db: { query } });
    await svc.getChangeLog("u9", 20);
    expect(String(query.mock.calls[0]?.[0])).toMatch(/LIMIT\s+\$2/i);
  });
});
