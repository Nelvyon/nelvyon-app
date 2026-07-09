import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaasCeoBriefService, resetSaasCeoBriefServiceForTests } from "../SaasCeoBriefService";

const missingRelation = Object.assign(new Error('relation "saas_ceo_brief_settings" does not exist'), {
  code: "42P01",
});

describe("SaasCeoBriefService schema drift", () => {
  beforeEach(() => {
    resetSaasCeoBriefServiceForTests();
  });

  it("listTenantsForBrief falls back when settings table is missing", async () => {
    const db = {
      query: vi
        .fn()
        .mockRejectedValueOnce(missingRelation)
        .mockResolvedValueOnce([{ id: "tenant-1" }]),
    };
    const svc = new SaasCeoBriefService(db);
    const ids = await svc.listTenantsForBrief(7);
    expect(ids).toEqual(["tenant-1"]);
  });

  it("recordRun returns empty id when runs table is missing", async () => {
    const db = { query: vi.fn().mockRejectedValue(missingRelation) };
    const svc = new SaasCeoBriefService(db);
    const id = await svc.recordRun(
      "tenant-1",
      {
        tenantId: "tenant-1",
        summaryText: "test",
        metrics: {
          activeJobs: 0,
          completedJobs: 0,
          totalSpend: 0,
          contacts: 0,
          openDeals: 0,
          pipelineValue: 0,
          pendingInbox: 0,
          recentPackRuns: 0,
          avgQaScore: null,
          autonomyMode: "propose",
        },
        generatedAt: new Date().toISOString(),
      },
      ["stored"],
    );
    expect(id).toBe("");
  });

  it("getLatestBrief returns null when runs table is missing", async () => {
    const db = { query: vi.fn().mockRejectedValue(missingRelation) };
    const svc = new SaasCeoBriefService(db);
    await expect(svc.getLatestBrief("tenant-1")).resolves.toBeNull();
  });
});
