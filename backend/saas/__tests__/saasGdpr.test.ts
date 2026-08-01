import { describe, expect, it, vi } from "vitest";

import { SaasGdprService, saasGdprService, GDPR_USER_DATA_COVERAGE } from "../SaasGdprService";

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

function mockDb(handlers?: (sql: string, params: unknown[]) => unknown[] | undefined) {
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    const custom = handlers?.(sql, params);
    if (custom !== undefined) return custom;
    if (sql.includes("INSERT INTO saas_gdpr_requests")) return [{ ...requestRow }];
    return [];
  });
  return { query };
}

describe("SaasGdprService", () => {
  it("requestExport crea solicitud con status 'pending'", async () => {
    const db = mockDb();
    const svc = new SaasGdprService({ db });
    const out = await svc.requestExport("u1", "t1");
    expect(out.status).toBe("pending");
    expect(String(db.query.mock.calls[0]?.[0])).toContain("INSERT INTO saas_gdpr_requests");
  });

  it("exportUserData incluye profile + CRM atribuible al usuario", async () => {
    const db = mockDb((sql) => {
      if (sql.includes("FROM saas_client_profiles") && sql.includes("SELECT *")) {
        return [{ user_id: "u1", email: "ana@acme.test" }];
      }
      if (sql.includes("FROM saas_invoices")) return [{ id: "inv1" }];
      if (sql.includes("FROM saas_service_results")) return [{ id: "res1" }];
      if (sql.includes("FROM saas_notifications")) return [{ id: "not1" }];
      if (sql.includes("FROM saas_chat_messages")) return [{ id: "chat1" }];
      if (sql.includes("FROM os_assets")) return [{ id: "asset1" }];
      if (sql.includes("FROM saas_deals")) {
        return [{ id: "d1", owner_user_id: "u1", contact_id: "c1", tenant_id: "t1" }];
      }
      if (sql.includes("FROM saas_contacts")) {
        return [{ id: "c1", email: "ana@acme.test", tenant_id: "t1" }];
      }
      if (sql.includes("FROM saas_contact_activities")) return [{ id: "a1", contact_id: "c1" }];
      if (sql.includes("FROM saas_campania_recipients")) return [{ id: "r1", contact_id: "c1" }];
      if (sql.includes("FROM nelvyon_users")) return [{ email: "ana@acme.test" }];
      return undefined;
    });
    const svc = new SaasGdprService({ db });
    const out = await svc.exportUserData("u1", "t1");
    expect(out).toHaveProperty("invoices");
    expect(out).toHaveProperty("crm");
    expect((out.crm as { deals: unknown[] }).deals).toHaveLength(1);
    expect((out.crm as { contacts: unknown[] }).contacts).toHaveLength(1);
    expect(out.coverage).toEqual(GDPR_USER_DATA_COVERAGE);
    expect(GDPR_USER_DATA_COVERAGE.exportTables).toContain("saas_contacts");
    expect(GDPR_USER_DATA_COVERAGE.exportTables).toContain("saas_deals");
  });

  it("exportUserData CRM queries usan tenantId y userId", async () => {
    const db = mockDb();
    const svc = new SaasGdprService({ db });
    await svc.exportUserData("otro", "tenant-x");
    const dealCall = db.query.mock.calls.find((c) => String(c[0]).includes("FROM saas_deals"));
    expect(dealCall).toBeTruthy();
    expect(dealCall?.[1]).toEqual(["tenant-x", "otro"]);
  });

  it("requestDeletion crea solicitud de borrado", async () => {
    const db = mockDb((sql) => {
      if (sql.includes("INSERT INTO saas_gdpr_requests")) {
        return [{ ...requestRow, type: "delete" }];
      }
      return undefined;
    });
    const svc = new SaasGdprService({ db });
    const out = await svc.requestDeletion("u1", "t1");
    expect(out.type).toBe("delete");
    expect(out.status).toBe("pending");
  });

  it("deleteUserData borra datos de usuario y anonimiza CRM atribuible", async () => {
    const db = mockDb((sql) => {
      if (sql.includes("FROM saas_deals") && sql.includes("SELECT")) {
        return [{ id: "d1", owner_user_id: "u1", contact_id: "c1" }];
      }
      if (sql.includes("FROM saas_contacts") && sql.includes("SELECT")) {
        return [{ id: "c1", email: "ana@acme.test" }];
      }
      if (sql.includes("FROM saas_client_profiles") && sql.includes("SELECT email")) {
        return [{ email: "ana@acme.test" }];
      }
      return undefined;
    });
    const svc = new SaasGdprService({ db });
    await svc.deleteUserData("u1", "t1");
    const sqls = db.query.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => s.includes("DELETE FROM saas_chat_messages"))).toBe(true);
    expect(sqls.some((s) => s.includes("DELETE FROM saas_deals"))).toBe(true);
    expect(sqls.some((s) => s.includes("UPDATE saas_contacts") && s.includes("Anonimizado GDPR"))).toBe(true);
    expect(sqls.some((s) => s.includes("UPDATE saas_gdpr_requests SET status = 'completed'"))).toBe(true);
  });

  it("getRequests filtra por userId y tenantId", async () => {
    const db = mockDb(() => [{ ...requestRow }, { ...requestRow, id: "2" }]);
    const svc = new SaasGdprService({ db });
    const rows = await svc.getRequests("u1", "t1");
    expect(rows).toHaveLength(2);
    expect(String(db.query.mock.calls[0]?.[0])).toContain("tenant_id = $2");
    expect((db.query.mock.calls[0]?.[1] as unknown[])[1]).toBe("t1");
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
    const db = mockDb();
    const svc = new SaasGdprService({ db });
    await svc.deleteUserData("u1", "tenant-1");
    const tenantScoped = db.query.mock.calls.filter((c) => String(c[0]).includes("tenant_id = $2"));
    expect(tenantScoped.length).toBeGreaterThan(0);
    tenantScoped.forEach((c) => expect((c[1] as unknown[])[1]).toBe("tenant-1"));
  });

  it("saasGdprService singleton es instancia de SaasGdprService", () => {
    expect(saasGdprService).toBeInstanceOf(SaasGdprService);
  });
});
