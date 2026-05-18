import { describe, expect, it, vi } from "vitest";

import { SaasGdprService, saasGdprService } from "../SaasGdprService";

const requestRow = {
  id: "00000000-0000-0000-0000-000000000001",
  userId: "u1",
  tenantId: "t1",
  type: "export" as const,
  status: "pending" as const,
  dataUrl: null,
  completedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("SaasGdprService", () => {
  it("requestExport crea solicitud con status 'pending'", async () => {
    const query = vi.fn().mockResolvedValue([{ ...requestRow }]);
    const svc = new SaasGdprService({ db: { query } });
    const out = await svc.requestExport("u1", "t1");
    expect(out.status).toBe("pending");
    expect(String(query.mock.calls[0]?.[0])).toContain("INSERT INTO saas_gdpr_requests");
  });

  it("exportUserData devuelve todos los datos del usuario", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ user_id: "u1" }])
      .mockResolvedValueOnce([{ id: "inv1" }])
      .mockResolvedValueOnce([{ id: "res1" }])
      .mockResolvedValueOnce([{ id: "not1" }])
      .mockResolvedValueOnce([{ id: "chat1" }])
      .mockResolvedValueOnce([{ id: "asset1" }]);
    const svc = new SaasGdprService({ db: { query } });
    const out = await svc.exportUserData("u1", "t1");
    expect(out).toHaveProperty("invoices");
    expect(out).toHaveProperty("serviceResults");
    expect(out).toHaveProperty("notifications");
    expect(out).toHaveProperty("chatHistory");
    expect(out).toHaveProperty("assets");
  });

  it("exportUserData incluye profile, invoices, chatHistory, assets", async () => {
    const profile = [{ full_name: "Ana" }];
    const invoices = [{ id: "i1" }];
    const chat = [{ id: "c1" }];
    const assets = [{ id: "a1" }];
    const query = vi
      .fn()
      .mockResolvedValueOnce(profile)
      .mockResolvedValueOnce(invoices)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(chat)
      .mockResolvedValueOnce(assets);
    const svc = new SaasGdprService({ db: { query } });
    const out = await svc.exportUserData("u1", "t1");
    expect(out.profile).toEqual(profile[0]);
    expect(out.invoices).toEqual(invoices);
    expect(out.chatHistory).toEqual(chat);
    expect(out.assets).toEqual(assets);
  });

  it("requestDeletion crea solicitud de borrado", async () => {
    const query = vi.fn().mockResolvedValue([{ ...requestRow, type: "delete" }]);
    const svc = new SaasGdprService({ db: { query } });
    const out = await svc.requestDeletion("u1", "t1");
    expect(out.type).toBe("delete");
    expect(out.status).toBe("pending");
  });

  it("deleteUserData borra datos de todas las tablas", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasGdprService({ db: { query } });
    await svc.deleteUserData("u1", "t1");
    const sqls = query.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => s.includes("DELETE FROM saas_chat_messages"))).toBe(true);
    expect(sqls.some((s) => s.includes("DELETE FROM saas_notifications"))).toBe(true);
    expect(sqls.some((s) => s.includes("DELETE FROM saas_service_results"))).toBe(true);
    expect(sqls.some((s) => s.includes("DELETE FROM saas_invoices"))).toBe(true);
    expect(sqls.some((s) => s.includes("DELETE FROM saas_client_profiles"))).toBe(true);
    expect(sqls.some((s) => s.includes("DELETE FROM os_assets"))).toBe(true);
  });

  it("deleteUserData marca la solicitud como 'completed'", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasGdprService({ db: { query } });
    await svc.deleteUserData("u1", "t1");
    const sqls = query.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => s.includes("UPDATE saas_gdpr_requests SET status = 'completed'"))).toBe(true);
  });

  it("getRequests devuelve historial de solicitudes GDPR", async () => {
    const query = vi.fn().mockResolvedValue([{ ...requestRow }, { ...requestRow, id: "2" }]);
    const svc = new SaasGdprService({ db: { query } });
    const rows = await svc.getRequests("u1");
    expect(rows).toHaveLength(2);
    expect(String(query.mock.calls[0]?.[0])).toContain("ORDER BY created_at DESC");
  });

  it("exportUserData no devuelve datos de otro usuario (usa params userId/tenantId)", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const svc = new SaasGdprService({ db: { query } });
    await svc.exportUserData("otro", "tenant-x");
    query.mock.calls.forEach((c) => {
      const params = c[1] as unknown[];
      expect(params[0]).toBe("otro");
    });
  });

  it("requestExport lanza si INSERT no retorna fila", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasGdprService({ db: { query } });
    await expect(svc.requestExport("u1", "t1")).rejects.toThrow("no row");
  });

  it("requestDeletion lanza si INSERT no retorna fila", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasGdprService({ db: { query } });
    await expect(svc.requestDeletion("u1", "t1")).rejects.toThrow("no row");
  });

  it("deleteUserData aplica filtros por tenantId en tablas multi-tenant", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasGdprService({ db: { query } });
    await svc.deleteUserData("u1", "tenant-1");
    const tenantScoped = query.mock.calls.filter((c) => String(c[0]).includes("tenant_id = $2"));
    expect(tenantScoped.length).toBeGreaterThan(0);
    tenantScoped.forEach((c) => expect((c[1] as unknown[])[1]).toBe("tenant-1"));
  });

  it("saasGdprService singleton es instancia de SaasGdprService", () => {
    expect(saasGdprService).toBeInstanceOf(SaasGdprService);
  });
});
