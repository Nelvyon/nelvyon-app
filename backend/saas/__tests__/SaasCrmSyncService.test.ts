import { describe, expect, it, vi } from "vitest";
import { SaasCrmSyncService } from "../SaasCrmSyncService";

describe("SaasCrmSyncService", () => {
  it("getState returns idle defaults when no row", async () => {
    const db = { query: vi.fn().mockResolvedValue([]) };
    const svc = new SaasCrmSyncService(db as never);
    const state = await svc.getState("tenant-1", "pipedrive");
    expect(state.status).toBe("idle");
    expect(state.contactsSynced).toBe(0);
  });

  it("runSync pulls pipedrive persons into CRM", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/persons")) {
        return new Response(JSON.stringify({
          data: [{ id: 1, name: "Ana", email: [{ value: "ana@test.com" }] }],
        }), { status: 200 });
      }
      if (url.includes("/deals")) {
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("INSERT INTO saas_crm_sync_state") && sql.includes("running")) return [];
        if (sql.includes("UPDATE saas_contacts")) return [];
        if (sql.includes("INSERT INTO saas_contacts")) return [];
        if (sql.includes("UPDATE saas_crm_sync_state SET last_sync_at")) return [];
        if (sql.includes("SELECT * FROM saas_crm_sync_state")) {
          return [{ contacts_synced: 1, deals_synced: 0, status: "ok", contacts_pushed: 0, last_sync_at: new Date(), error_message: null }];
        }
        return [];
      }),
    };
    const svc = new SaasCrmSyncService(db as never);
    const state = await svc.runSync("tenant-1", "pipedrive", "tok");
    expect(state.contactsSynced).toBe(1);
    vi.unstubAllGlobals();
  });
});
