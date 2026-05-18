import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../stripe/stripeApi", () => ({
  cancelSubscriptionImmediately: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../email/emailService", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendEmail } from "../../email/emailService";
import { DataSubjectService } from "../dataSubjectService";

describe("DataSubjectService", () => {
  let svc: DataSubjectService;

  beforeEach(() => {
    queryMock.mockReset();
    svc = new DataSubjectService({ query: queryMock });
    vi.mocked(sendEmail).mockClear();
    delete process.env.PADDLE_API_KEY;
  });

  it("exportUserData retorna estructura con secciones principales", async () => {
    queryMock.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes("FROM nelvyon_users") && s.includes("*") && s.includes("LIMIT 1")) {
        return Promise.resolve([
          { user_id: "u1", email: "a@b.com", full_name: "Ana", tenant_id: "t1", password_hash: "x" },
        ]);
      }
      if (s.includes("FROM subscriptions")) return Promise.resolve([{ id: "sub1" }]);
      if (s.includes("FROM usage_events")) return Promise.resolve([{ id: "evt1" }]);
      if (s.includes("FROM dunning_log")) return Promise.resolve([]);
      if (s.includes("FROM api_keys") && s.includes("SELECT id")) return Promise.resolve([{ id: "k1", provider: "openai" }]);
      if (s.includes("FROM onboarding")) return Promise.resolve([{ user_id: "u1" }]);
      if (s.includes("FROM os_jobs")) return Promise.resolve([{ job_id: "j1" }]);
      if (s.includes("FROM os_job_results")) return Promise.resolve([{ id: "jr1" }]);
      if (s.includes("saas_api_usage")) return Promise.resolve([]);
      if (s.includes("information_schema.columns")) {
        return Promise.resolve([{ table_name: "os_job_results" }]);
      }
      if (s.includes("information_schema.tables")) {
        return Promise.resolve([{ table_name: "os_job_results" }]);
      }
      return Promise.resolve([]);
    });

    const result = await svc.exportUserData("u1");

    expect(result.userId).toBe("u1");
    expect(result.tenantId).toBe("t1");
    expect(result.nelvyon_users?.password_hash).toBe("[REDACTED]");
    expect(result.subscriptions).toEqual([{ id: "sub1" }]);
    expect(result.usage_events).toEqual([{ id: "evt1" }]);
    expect(result.api_keys.length).toBe(1);
    expect(result.onboarding).toEqual({ user_id: "u1" });
    expect(result.os_jobs).toEqual([{ job_id: "j1" }]);
    expect(result.os_job_results).toEqual([{ id: "jr1" }]);
    expect(result.exportedAt).toBeDefined();
  });

  it("deleteUserData anonimiza email y marca deleted_at", async () => {
    queryMock.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes("SELECT email, full_name, tenant_id FROM nelvyon_users")) {
        return Promise.resolve([{ email: "keep@b.com", full_name: "Ana", tenant_id: "t1" }]);
      }
      if (s.includes("stripe_subscription_id")) return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    await svc.deleteUserData("user-uuid-1");

    const updateUser = queryMock.mock.calls.find(
      ([q]) => typeof q === "string" && String(q).includes("UPDATE nelvyon_users") && String(q).includes("deleted_at"),
    );
    expect(updateUser).toBeDefined();
    expect(String(updateUser![0])).toContain("Usuario eliminado");
    const anonEmail = (updateUser![1] as unknown[])[1];
    expect(String(anonEmail)).toMatch(/^user_[a-f0-9]{16}@deleted\.nelvyon\.com$/);
    expect(sendEmail).toHaveBeenCalledWith(
      "account_deleted",
      expect.objectContaining({
        email: "keep@b.com",
      }),
    );
  });

  it("deleteUserData no elimina filas de subscriptions", async () => {
    queryMock.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes("SELECT email, full_name, tenant_id FROM nelvyon_users")) {
        return Promise.resolve([{ email: "e@x.com", full_name: "X", tenant_id: "tx" }]);
      }
      if (s.includes("stripe_subscription_id")) return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    await svc.deleteUserData("u9");

    const delSubs = queryMock.mock.calls.filter(
      ([q]) => typeof q === "string" && /DELETE\s+FROM\s+subscriptions/i.test(String(q)),
    );
    expect(delSubs).toHaveLength(0);
  });

  it("scheduleDataDeletion guarda scheduled_deletion_at con intervalo de días", async () => {
    queryMock.mockResolvedValueOnce([]);
    await svc.scheduleDataDeletion("u1", 14);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("scheduled_deletion_at = now() + ($2::bigint * interval"),
      ["u1", 14],
    );
  });

  it("assertExportAllowed bloquea si export reciente (<24h)", async () => {
    const iso = new Date().toISOString();
    queryMock.mockResolvedValueOnce([{ data_export_requested_at: iso }]);
    await expect(svc.assertExportAllowed("u1")).rejects.toThrow("EXPORT_COOLDOWN");
  });

  it("assertExportAllowed permite si nunca hubo export", async () => {
    queryMock.mockResolvedValueOnce([{ data_export_requested_at: null }]);
    await expect(svc.assertExportAllowed("u1")).resolves.toBeUndefined();
  });
});
