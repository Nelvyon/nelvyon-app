import { describe, expect, it, vi, beforeEach } from "vitest";

const query = vi.hoisted(() => vi.fn());

vi.mock("../../../../../../backend/db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query }),
  },
}));

describe("packRunStore idempotency", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("createPackRun returns existing row on duplicate key", async () => {
    const existing = {
      id: "run-existing",
      workspace_id: 1,
      user_id: "u1",
      pack_id: "local-business-growth",
      status: "completed",
      intake: { business_name: "X", sector: "restaurant", city: "Madrid", value_proposition: "v", primary_cta: "c" },
      saas_client_id: null,
      saas_campaign_id: null,
      os_client_id: null,
      os_project_id: null,
      steps: [],
      report: null,
      error_message: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      completed_at: "2026-01-01T00:00:00Z",
    };
    query.mockResolvedValueOnce([existing]);
    const { createPackRun } = await import("@/lib/packs/packRunStore");
    const out = await createPackRun({
      workspaceId: 1,
      userId: "u1",
      packId: "local-business-growth",
      intake: { business_name: "X", sector: "restaurant", city: "Madrid", value_proposition: "v", primary_cta: "c" },
      stepDefinitions: [{ key: "brief", label: "Brief" }],
      idempotencyKey: "key-abc",
    });
    expect(out.created).toBe(false);
    expect(out.run.id).toBe("run-existing");
  });
});
