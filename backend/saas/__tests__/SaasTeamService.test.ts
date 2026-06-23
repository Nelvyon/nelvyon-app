import { describe, it, expect, vi } from "vitest";
import { SaasTeamService } from "../SaasTeamService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-d";
const now = new Date();

const memberRow = {
  id: "m1", tenant_id: TENANT, user_id: null, email: "alice@example.com",
  name: "Alice", role: "user", status: "invited",
  last_active_at: null, created_at: now, updated_at: now,
};

describe("SaasTeamService", () => {
  it("list returns empty", async () => {
    const db = makeDb([[]]);
    const svc = new SaasTeamService(db);
    expect(await svc.list(TENANT)).toEqual([]);
  });

  it("invite rejects invalid email", async () => {
    const db = makeDb();
    const svc = new SaasTeamService(db);
    await expect(svc.invite(TENANT, { email: "notanemail" })).rejects.toThrow("email");
  });

  it("invite rejects invalid role", async () => {
    const db = makeDb();
    const svc = new SaasTeamService(db);
    await expect(svc.invite(TENANT, { email: "a@b.com", role: "superuser" as "admin" })).rejects.toThrow("role");
  });

  it("invite creates member with status invited", async () => {
    const db = makeDb([[memberRow]]);
    const svc = new SaasTeamService(db);
    const m = await svc.invite(TENANT, { email: "alice@example.com", name: "Alice" });
    expect(m.id).toBe("m1");
    expect(m.status).toBe("invited");
    expect(m.email).toBe("alice@example.com");
  });

  it("updateRole rejects invalid role", async () => {
    const db = makeDb();
    const svc = new SaasTeamService(db);
    await expect(svc.updateRole(TENANT, "m1", "ghost" as "admin")).rejects.toThrow("role");
  });

  it("remove throws FORBIDDEN for missing/owner", async () => {
    const db = makeDb([[]]);
    const svc = new SaasTeamService(db);
    await expect(svc.remove(TENANT, "owner-id")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
