/**
 * S46 — SaasDeliverablesHubService unit tests
 */
import { describe, expect, it, vi } from "vitest";
import {
  SaasDeliverablesHubService,
  SaasDeliverablesHubError,
} from "../SaasDeliverablesHubService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

// ── DB mock helper ─────────────────────────────────────────────────────────────

function makeDb(responses: unknown[]): SaasPostgresPort {
  let call = 0;
  return {
    query: vi.fn().mockImplementation(async () => {
      const res = responses[call] ?? [];
      call++;
      return res;
    }),
  } as unknown as SaasPostgresPort;
}

// ── Fixtures ───────────────────────────────────────────────────────────────────

const TENANT_ROW = [{ workspace_id: 42 }];
const NO_WORKSPACE = [{ workspace_id: null }];

const OS_ROW = {
  id: "os-1",
  type: "landing",
  title: "Landing ACME",
  status: "approved",
  file_url: "https://cdn.nelvyon.com/landing-acme.zip",
  metadata: { qa_score: 91, pack_id: "local-business-growth" },
  created_at: "2026-06-01T10:00:00Z",
  approved_at: "2026-06-02T10:00:00Z",
};

const RECURRING_ROW = {
  id: "rec-1",
  service_type: "seo_report",
  month: "2026-06",
  status: "delivered",
  payload: { qa_score: 88, download_url: "https://cdn.nelvyon.com/seo-june.pdf" },
  created_at: "2026-06-15T00:00:00Z",
};

const PACK_RUN_ROW = {
  id: "pr-1",
  pack_id: "local-business-growth",
  status: "completed",
  report: { qa_score: 95, legal_passed: true, download_url: null },
  metadata: {},
  created_at: "2026-06-10T08:00:00Z",
  completed_at: "2026-06-10T09:00:00Z",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("SaasDeliverablesHubService — listDeliverables", () => {
  it("merges os + recurring + pack_run into single sorted list", async () => {
    // Query order: [tenantRow, osRows, recurringRows, packRunRows]
    const db = makeDb([TENANT_ROW, [OS_ROW], [RECURRING_ROW], [PACK_RUN_ROW]]);
    const svc = new SaasDeliverablesHubService(db);

    const items = await svc.listDeliverables("tenant-1");

    expect(items).toHaveLength(3);
    const sources = items.map((d) => d.source);
    expect(sources).toContain("os");
    expect(sources).toContain("recurring");
    expect(sources).toContain("pack_run");
  });

  it("maps OS deliverable fields correctly", async () => {
    const db = makeDb([TENANT_ROW, [OS_ROW], [], []]);
    const svc = new SaasDeliverablesHubService(db);

    const items = await svc.listDeliverables("tenant-1");
    const d = items.find((x) => x.source === "os")!;

    expect(d.type).toBe("landing");
    expect(d.title).toBe("Landing ACME");
    expect(d.status).toBe("approved");
    expect(d.qaScore).toBe(91);
    expect(d.packId).toBe("local-business-growth");
    expect(d.downloadUrl).toBe("https://cdn.nelvyon.com/landing-acme.zip");
    expect(d.approvedAt).toBe("2026-06-02T10:00:00Z");
  });

  it("maps recurring deliverable as seo type + title with month", async () => {
    const db = makeDb([TENANT_ROW, [], [RECURRING_ROW], []]);
    const svc = new SaasDeliverablesHubService(db);

    const items = await svc.listDeliverables("tenant-1");
    const d = items[0]!;

    expect(d.source).toBe("recurring");
    expect(d.type).toBe("seo");
    expect(d.title).toMatch(/seo.report.*2026-06/i);
    expect(d.qaScore).toBe(88);
    expect(d.downloadUrl).toBe("https://cdn.nelvyon.com/seo-june.pdf");
  });

  it("maps pack_run to delivered status with qaScore from report", async () => {
    const db = makeDb([TENANT_ROW, [], [], [PACK_RUN_ROW]]);
    const svc = new SaasDeliverablesHubService(db);

    const items = await svc.listDeliverables("tenant-1");
    const d = items[0]!;

    expect(d.source).toBe("pack_run");
    expect(d.status).toBe("delivered");
    expect(d.qaScore).toBe(95);
    expect(d.legalPassed).toBe(true);
    expect(d.packId).toBe("local-business-growth");
    expect(d.approvedAt).toBe("2026-06-10T09:00:00Z");
  });

  it("returns empty array when tenant has no workspace_id (no OS/pack)", async () => {
    // workspace_id null → skip OS and pack_run queries; recurring may still exist
    const db = makeDb([NO_WORKSPACE, [RECURRING_ROW]]);
    const svc = new SaasDeliverablesHubService(db);

    const items = await svc.listDeliverables("tenant-new");
    expect(items).toHaveLength(1);
    expect(items[0]!.source).toBe("recurring");
  });

  it("returns empty array when tenant has nothing at all", async () => {
    const db = makeDb([NO_WORKSPACE, []]);
    const svc = new SaasDeliverablesHubService(db);

    const items = await svc.listDeliverables("tenant-fresh");
    expect(items).toHaveLength(0);
  });

  it("filters by type=seo (excludes landing and pack_run)", async () => {
    const db = makeDb([TENANT_ROW, [OS_ROW], [RECURRING_ROW], []]);
    const svc = new SaasDeliverablesHubService(db);

    const items = await svc.listDeliverables("tenant-1", { type: "seo" });
    // OS_ROW is landing → excluded; RECURRING_ROW is seo → included
    expect(items.every((d) => d.type === "seo")).toBe(true);
  });

  it("filters by status=approved", async () => {
    const db = makeDb([TENANT_ROW, [OS_ROW], [RECURRING_ROW], []]);
    const svc = new SaasDeliverablesHubService(db);

    const items = await svc.listDeliverables("tenant-1", { status: "approved" });
    // OS_ROW is approved; RECURRING_ROW is delivered → excluded
    expect(items.every((d) => d.status === "approved")).toBe(true);
  });

  it("tenant isolation: passes workspace_id in query param (not another tenant's)", async () => {
    const db = makeDb([TENANT_ROW, [], [], []]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasDeliverablesHubService(db);

    await svc.listDeliverables("tenant-A");

    // First call: SELECT workspace_id WHERE id = $1 → must use tenant-A
    const firstCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(firstCall[1][0]).toBe("tenant-A");
    // Second call: os_deliverables WHERE workspace_id = $1 → must be 42
    const secondCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(secondCall[1][0]).toBe(42);
  });

  it("sorts results by createdAt DESC", async () => {
    const older = { ...OS_ROW, id: "os-old", created_at: "2026-05-01T00:00:00Z" };
    const newer = { ...OS_ROW, id: "os-new", created_at: "2026-06-20T00:00:00Z" };
    const db = makeDb([TENANT_ROW, [older, newer], [], []]);
    const svc = new SaasDeliverablesHubService(db);

    const items = await svc.listDeliverables("tenant-1");
    expect(items[0]!.id).toBe("os-new");
    expect(items[1]!.id).toBe("os-old");
  });
});

describe("SaasDeliverablesHubService — getDeliverable", () => {
  it("returns OS deliverable by id", async () => {
    // Queries: tenantRow, osRow found → done
    const db = makeDb([TENANT_ROW, [OS_ROW]]);
    const svc = new SaasDeliverablesHubService(db);

    const d = await svc.getDeliverable("tenant-1", "os-1");
    expect(d.id).toBe("os-1");
    expect(d.source).toBe("os");
  });

  it("falls back to recurring when OS not found", async () => {
    // Queries: tenantRow, osRows=[], recurringRow found
    const db = makeDb([TENANT_ROW, [], [RECURRING_ROW]]);
    const svc = new SaasDeliverablesHubService(db);

    const d = await svc.getDeliverable("tenant-1", "rec-1");
    expect(d.id).toBe("rec-1");
    expect(d.source).toBe("recurring");
  });

  it("falls back to pack_run when OS+recurring not found", async () => {
    // Queries: tenantRow, osRows=[], recurringRows=[], packRunRow
    const db = makeDb([TENANT_ROW, [], [], [PACK_RUN_ROW]]);
    const svc = new SaasDeliverablesHubService(db);

    const d = await svc.getDeliverable("tenant-1", "pr-1");
    expect(d.id).toBe("pr-1");
    expect(d.source).toBe("pack_run");
  });

  it("throws NOT_FOUND when id not in any source", async () => {
    const db = makeDb([TENANT_ROW, [], [], []]);
    const svc = new SaasDeliverablesHubService(db);

    await expect(svc.getDeliverable("tenant-1", "no-such-id")).rejects.toThrow(
      SaasDeliverablesHubError,
    );
  });

  it("NOT_FOUND error has code NOT_FOUND", async () => {
    const db = makeDb([TENANT_ROW, [], [], []]);
    const svc = new SaasDeliverablesHubService(db);

    try {
      await svc.getDeliverable("tenant-1", "ghost");
    } catch (e) {
      expect((e as SaasDeliverablesHubError).code).toBe("NOT_FOUND");
    }
  });
});

describe("SaasDeliverablesHubService — getSummary", () => {
  it("counts total, pendingReview, approved, avgQaScore", async () => {
    const inReviewRow = { ...OS_ROW, id: "os-2", status: "in_review", metadata: { qa_score: 70 } };
    // getSummary calls listDeliverables which itself calls makeDb × 4
    const db = makeDb([TENANT_ROW, [OS_ROW, inReviewRow], [RECURRING_ROW], []]);
    const svc = new SaasDeliverablesHubService(db);

    const summary = await svc.getSummary("tenant-1");
    expect(summary.total).toBe(3); // 2 OS + 1 recurring
    expect(summary.pendingReview).toBe(1); // inReviewRow
    expect(summary.approved).toBeGreaterThanOrEqual(1); // OS_ROW is approved
    expect(summary.avgQaScore).not.toBeNull();
  });

  it("byType and byStatus maps are populated", async () => {
    const db = makeDb([TENANT_ROW, [OS_ROW], [RECURRING_ROW], []]);
    const svc = new SaasDeliverablesHubService(db);

    const summary = await svc.getSummary("tenant-1");
    expect(summary.byType).toHaveProperty("landing");
    expect(summary.byType).toHaveProperty("seo");
    expect(summary.byStatus).toHaveProperty("approved");
    expect(summary.byStatus).toHaveProperty("delivered");
  });

  it("avgQaScore is null when no deliverables have qa scores", async () => {
    const noQaRow = { ...OS_ROW, metadata: {} };
    const db = makeDb([TENANT_ROW, [noQaRow], [], []]);
    const svc = new SaasDeliverablesHubService(db);

    const summary = await svc.getSummary("tenant-1");
    expect(summary.avgQaScore).toBeNull();
  });

  it("returns zero counts for fresh tenant with no data", async () => {
    const db = makeDb([NO_WORKSPACE, []]);
    const svc = new SaasDeliverablesHubService(db);

    const summary = await svc.getSummary("tenant-fresh");
    expect(summary.total).toBe(0);
    expect(summary.pendingReview).toBe(0);
    expect(summary.approved).toBe(0);
    expect(summary.avgQaScore).toBeNull();
  });

  it("social_calendar recurring maps to social_calendar type in byType", async () => {
    const socialRow = { ...RECURRING_ROW, id: "rec-social", service_type: "social_calendar" };
    const db = makeDb([NO_WORKSPACE, [socialRow]]);
    const svc = new SaasDeliverablesHubService(db);

    const summary = await svc.getSummary("tenant-1");
    expect(summary.byType).toHaveProperty("social_calendar");
  });
});
