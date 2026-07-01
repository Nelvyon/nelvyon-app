import { describe, expect, it, vi } from "vitest";
import { OsQaReviewQueueService } from "../OsQaReviewQueueService";
import { buildMinimalPdfFromText, certificateToPdfLines } from "../OsDeliveryCertificateService";

describe("OsQaReviewQueueService", () => {
  it("enqueues pending review", async () => {
    const db = {
      query: vi.fn().mockResolvedValue([{
        id: "q1",
        tenant_id: null,
        pack_run_id: "run-1",
        deliverable_id: null,
        qa_score: 72,
        status: "pending",
        reviewer_notes: null,
        created_at: new Date().toISOString(),
        reviewed_at: null,
      }]),
    };
    const svc = new OsQaReviewQueueService(db as never);
    const item = await svc.enqueue({ packRunId: "run-1", qaScore: 72 });
    expect(item.qaScore).toBe(72);
    expect(item.status).toBe("pending");
  });

  it("reviews pending item", async () => {
    const db = {
      query: vi.fn().mockResolvedValue([{
        id: "q1",
        tenant_id: null,
        pack_run_id: "run-1",
        deliverable_id: null,
        qa_score: 72,
        status: "approved",
        reviewer_notes: "ok",
        created_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
      }]),
    };
    const svc = new OsQaReviewQueueService(db as never);
    const item = await svc.review("q1", "approved", "ok");
    expect(item.status).toBe("approved");
  });
});

describe("buildMinimalPdfFromText", () => {
  it("returns PDF magic bytes", () => {
    const pdf = buildMinimalPdfFromText(["Line 1", "Line 2"], "Test Cert");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("certificateToPdfLines includes pack id", () => {
    const lines = certificateToPdfLines({
      id: "c1",
      packRunId: "run-1",
      packId: "local-business-growth",
      tenantId: null,
      workspaceId: null,
      status: "issued",
      qaScore: 88,
      legalPassed: true,
      visualScore: 90,
      lighthouseScore: 85,
      seedId: "dental_tpl_0",
      seedSource: "envato",
      agentProvider: "mock",
      agentsUsed: ["seo"],
      contentHash: "abc",
      certUrl: null,
      metadata: {},
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    expect(lines.some((l) => l.includes("local-business-growth"))).toBe(true);
  });
});
