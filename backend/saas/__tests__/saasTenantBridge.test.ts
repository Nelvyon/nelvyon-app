import { afterEach, describe, expect, it } from "vitest";

import {
  SaasTenantBridgeService,
  SaasTenantBridgeError,
  resetSaasTenantBridgeServiceForTests,
} from "../SaasTenantBridgeService";
import type { SaasTenantRow } from "../saasTenantMapper";

type WorkspaceRow = { id: number; user_id: string };

function makeBridgeDb() {
  const tenants = new Map<string, SaasTenantRow & { pk: string }>();
  const workspaces: WorkspaceRow[] = [
    { id: 10, user_id: "user-a" },
    { id: 20, user_id: "user-b" },
  ];

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();

    if (s.includes("FROM saas_tenants WHERE workspace_id = $1")) {
      const wid = Number(params[0]);
      const row = [...tenants.values()].find((t) => t.workspace_id === wid);
      return (row ? [row] : []) as T[];
    }
    if (s.startsWith("SELECT workspace_id FROM saas_tenants WHERE id = $1")) {
      const row = tenants.get(String(params[0]));
      return (row ? [{ workspace_id: row.workspace_id }] : []) as T[];
    }
    if (s.includes("UPDATE saas_tenants st") && s.includes("linkPrimaryWorkspace")) {
      return [] as T[];
    }
    if (s.includes("UPDATE saas_tenants st") && s.includes("sub.wid")) {
      const userId = String(params[0]);
      const tenantId = String(params[1]);
      const row = tenants.get(tenantId);
      const ws = workspaces.filter((w) => w.user_id === userId).sort((a, b) => a.id - b.id)[0];
      if (!row || row.workspace_id != null || !ws) return [] as T[];
      row.workspace_id = ws.id;
      return [{ workspace_id: ws.id }] as T[];
    }
    if (s.includes("SELECT w.id FROM workspaces w") && s.includes("WHERE w.id = $1 AND w.user_id")) {
      const ws = workspaces.find((w) => w.id === Number(params[0]) && w.user_id === String(params[1]));
      return (ws ? [{ id: ws.id }] : []) as T[];
    }
    if (s.startsWith("UPDATE saas_tenants") && s.includes("SET workspace_id = $2")) {
      const tenantId = String(params[0]);
      const wid = Number(params[1]);
      const row = tenants.get(tenantId);
      if (!row) return [] as T[];
      row.workspace_id = wid;
      return [row] as T[];
    }
    return [] as T[];
  }

  function seedTenant(id: string, userId: string, workspaceId: number | null = null) {
    tenants.set(id, {
      pk: id,
      id,
      user_id: userId,
      workspace_id: workspaceId,
      company_name: "Co",
      industry: "Tech",
      plan: "starter",
      website: null,
      phone: null,
      employees: null,
      goals: [],
      onboarding_completed: true,
      onboarding_step: 4,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  return { query, seedTenant };
}

describe("SaasTenantBridgeService", () => {
  afterEach(() => {
    resetSaasTenantBridgeServiceForTests();
  });

  it("getTenantByWorkspaceId resuelve tenant por workspace_id", async () => {
    const { query, seedTenant } = makeBridgeDb();
    seedTenant("tenant-1", "user-a", 10);
    const svc = new SaasTenantBridgeService({ query });
    const t = await svc.getTenantByWorkspaceId(10);
    expect(t?.id).toBe("tenant-1");
    expect(t?.workspaceId).toBe(10);
  });

  it("getWorkspaceIdForTenant devuelve workspace vinculado", async () => {
    const { query, seedTenant } = makeBridgeDb();
    seedTenant("tenant-1", "user-a", 10);
    const svc = new SaasTenantBridgeService({ query });
    await expect(svc.getWorkspaceIdForTenant("tenant-1")).resolves.toBe(10);
  });

  it("linkPrimaryWorkspace asigna el workspace de menor id", async () => {
    const { query, seedTenant } = makeBridgeDb();
    seedTenant("tenant-1", "user-a", null);
    const svc = new SaasTenantBridgeService({ query });
    const wid = await svc.linkPrimaryWorkspace("user-a", "tenant-1");
    expect(wid).toBe(10);
  });

  it("linkWorkspace rechaza workspace ajeno", async () => {
    const { query, seedTenant } = makeBridgeDb();
    seedTenant("tenant-1", "user-a", null);
    const svc = new SaasTenantBridgeService({ query });
    await expect(svc.linkWorkspace("user-a", "tenant-1", 20)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rechaza workspaceId inválido", async () => {
    const { query } = makeBridgeDb();
    const svc = new SaasTenantBridgeService({ query });
    await expect(svc.getTenantByWorkspaceId(0)).rejects.toBeInstanceOf(SaasTenantBridgeError);
  });
});
