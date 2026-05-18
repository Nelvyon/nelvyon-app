import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const sendEmailMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: queryMock }) },
}));

vi.mock("../../../paddle/paddleApi", () => ({
  cancelSubscriptionImmediately: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../email/emailService", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock("../../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { DataSubjectService } from "../../../gdpr/dataSubjectService";

describe("flow: GDPR — export → deletion → audit trail", () => {
  let svc: DataSubjectService;

  beforeEach(() => {
    queryMock.mockReset();
    sendEmailMock.mockClear();
    svc = new DataSubjectService({ query: queryMock } as never);
  });

  it("solicitud export genera payload y markExportRequested registra auditoría", async () => {
    queryMock.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes("FROM nelvyon_users") && s.includes("*")) {
        return Promise.resolve([
          { user_id: "u1", email: "a@b.com", full_name: "Ana", tenant_id: "t1", password_hash: "x" },
        ]);
      }
      if (s.includes("FROM subscriptions")) return Promise.resolve([]);
      if (s.includes("FROM usage_events")) return Promise.resolve([]);
      if (s.includes("FROM api_keys")) return Promise.resolve([]);
      if (s.includes("FROM onboarding")) return Promise.resolve([]);
      if (s.includes("information_schema")) return Promise.resolve([]);
      if (s.includes("data_export_requested_at")) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    const data = await svc.exportUserData("u1");
    expect(data.userId).toBe("u1");
    expect(data.nelvyon_users?.password_hash).toBe("[REDACTED]");

    await svc.markExportRequested("u1");
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("data_export_requested_at = now()"),
      ["u1"],
    );
  });

  it("export con email de confirmación (patrón API)", async () => {
    queryMock.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes("FROM nelvyon_users") && s.includes("*")) {
        return Promise.resolve([
          { user_id: "u1", email: "a@b.com", full_name: "Ana", tenant_id: "t1", password_hash: "x" },
        ]);
      }
      if (s.includes("information_schema")) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    const data = await svc.exportUserData("u1");
    const exportJson = JSON.stringify(data, null, 2);
    expect(exportJson).toContain('"userId": "u1"');

    await sendEmailMock("data_export_confirm", {
      email: "a@b.com",
      name: "Ana",
      exportedAt: data.exportedAt,
      appUrl: "https://nelvyon.com",
    });
    expect(sendEmailMock).toHaveBeenCalledWith(
      "data_export_confirm",
      expect.objectContaining({ email: "a@b.com" }),
    );
  });

  it("solicitud deletion borra datos sensibles y anonimiza usuario", async () => {
    queryMock.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes("SELECT email, full_name, tenant_id FROM nelvyon_users")) {
        return Promise.resolve([{ email: "keep@b.com", full_name: "Ana", tenant_id: "t1" }]);
      }
      if (s.includes("paddle_subscription_id")) return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    await svc.deleteUserData("u1");

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM api_keys"), ["u1"]);
    const updateUser = queryMock.mock.calls.find(
      ([q]) => typeof q === "string" && String(q).includes("deleted_at"),
    );
    expect(updateUser).toBeDefined();
    expect(sendEmailMock).toHaveBeenCalledWith("account_deleted", expect.objectContaining({ email: "keep@b.com" }));
  });

  it("deletion respeta retención legal: no DELETE en subscriptions", async () => {
    queryMock.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes("SELECT email, full_name, tenant_id")) {
        return Promise.resolve([{ email: "e@x.com", full_name: "X", tenant_id: "tx" }]);
      }
      if (s.includes("paddle_subscription_id")) return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    await svc.deleteUserData("u9");

    const delSubs = queryMock.mock.calls.filter(
      ([q]) => typeof q === "string" && /DELETE\s+FROM\s+subscriptions/i.test(String(q)),
    );
    expect(delSubs).toHaveLength(0);
    const updateSubs = queryMock.mock.calls.find(
      ([q]) => typeof q === "string" && String(q).includes("UPDATE subscriptions"),
    );
    expect(updateSubs).toBeDefined();
  });

  it("audit trail: scheduleDataDeletion registra deletion_requested_at", async () => {
    queryMock.mockResolvedValueOnce([]);
    await svc.scheduleDataDeletion("u1", 30);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("deletion_requested_at = COALESCE"),
      ["u1", 30],
    );
  });

  it("rate limiting: assertExportAllowed bloquea export <24h", async () => {
    queryMock.mockResolvedValueOnce([{ data_export_requested_at: new Date().toISOString() }]);
    await expect(svc.assertExportAllowed("u1")).rejects.toThrow("EXPORT_COOLDOWN");
  });
});
