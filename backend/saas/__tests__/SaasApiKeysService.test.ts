import { describe, it, expect, vi } from "vitest";
import { SaasApiKeysService } from "../SaasApiKeysService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-c";
const USER = "user-1";

describe("SaasApiKeysService", () => {
  it("list returns empty", async () => {
    const db = makeDb([[]]);
    const svc = new SaasApiKeysService(db);
    expect(await svc.list(TENANT)).toEqual([]);
  });

  it("create rejects empty name", async () => {
    const db = makeDb();
    const svc = new SaasApiKeysService(db);
    await expect(svc.create(TENANT, USER, { name: "" })).rejects.toThrow("name is required");
  });

  it("create rejects invalid scopes", async () => {
    const db = makeDb();
    const svc = new SaasApiKeysService(db);
    await expect(svc.create(TENANT, USER, { name: "Test", scopes: ["invalid.scope"] })).rejects.toThrow("Invalid scopes");
  });

  it("create returns rawKey starting with nlv_", async () => {
    const now = new Date();
    const row = {
      id: "k1", tenant_id: TENANT, name: "My Key", key_prefix: "nlv_abc123",
      scopes: ["crm.read"], active: true, expires_at: null, last_used_at: null,
      requests_total: 0, created_by: USER, created_at: now,
    };
    const db = makeDb([[row]]);
    const svc = new SaasApiKeysService(db);
    const { key, rawKey } = await svc.create(TENANT, USER, { name: "My Key", scopes: ["crm.read"] });
    expect(rawKey).toMatch(/^nlv_[0-9a-f]{48}$/);
    expect(key.id).toBe("k1");
  });

  it("revoke throws NOT_FOUND for missing key", async () => {
    const db = makeDb([[]]);
    const svc = new SaasApiKeysService(db);
    await expect(svc.revoke(TENANT, "missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("verifyKey returns null for unknown key", async () => {
    const db = makeDb([[]]);
    const svc = new SaasApiKeysService(db);
    const result = await svc.verifyKey("nlv_nonexistent");
    expect(result).toBeNull();
  });
});
