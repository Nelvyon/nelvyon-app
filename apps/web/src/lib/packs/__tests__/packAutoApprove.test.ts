/**
 * Tests for the auto-approve path in packOrchestrator.
 * Verifies QA ≥ 85 triggers dbAutoApprovePackDeliverables,
 * and QA < 85 leaves status as "needs_review" (no auto-approve).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- DB mock ---------------------------------------------------------------
const mockQuery = vi.fn();
vi.mock("../../../../../../backend/db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: mockQuery }) },
}));

// --- platformDbFallback mock -----------------------------------------------
vi.mock("@/lib/platformDbFallback", () => ({
  platformDbFallbackEnabled: () => true,
  dbCreateClient: vi.fn().mockResolvedValue({ id: 1 }),
  dbCreateCampaign: vi.fn().mockResolvedValue({ id: 1 }),
}));

// --- Pack store mock --------------------------------------------------------
const mockCreatePackRun = vi.fn();
const mockUpdatePackRun = vi.fn();
const mockGetPackRun = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockMarkStep: (...args: any[]) => any = vi.fn((steps: unknown[]) => steps);

vi.mock("@/lib/packs/packRunStore", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createPackRun: (...args: any[]) => mockCreatePackRun(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updatePackRun: (...args: any[]) => mockUpdatePackRun(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPackRun: (...args: any[]) => mockGetPackRun(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markStep: (...args: any[]) => mockMarkStep(...args),
}));

// --- Simulator mock — QA 90 passing ----------------------------------------
const mockSimulate = vi.fn(({ sku }: { sku: string }) => ({
  project: { qa: { score: 90, passed: true }, project_id: "proj-1", sku, artifacts: {}, os_refs: {} },
  escalated: false,
  os_publish: {
    deliverables: [
      { id: "d-1", type: "landing_page", title: "Landing", visibility: "client", content: "<h1>Test</h1>", metadata: {} },
    ],
  },
  simulation_mode: "production",
}));
vi.mock("../../../../../../backend/autonomous/simulator", () => ({
  simulateAutonomousJob: (args: unknown) => mockSimulate(args as { sku: string }),
}));

// --- Email mock -------------------------------------------------------------
vi.mock("../../../../../../backend/email/emailService", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

// --- Visual QA mock — always passes for orchestrator tests ------------------
vi.mock("../../../../../../backend/autonomous/qa/visualQaEngine", () => ({
  runVisualQa: vi.fn(() => ({ score: 95, legal_passed: true, checks: { contrast_passes_aa: true } })),
}));

// ---------------------------------------------------------------------------

import { runGrowthPack } from "@/lib/packs/packOrchestrator";
import type { GrowthPackRunConfig } from "@/lib/packs/packOrchestrator";
import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import type { GrowthPackIntakeBase, PackReport } from "@/lib/packs/types";
import { LOCAL_GROWTH_PACK_ID } from "@/lib/packs/types";

type TestIntake = GrowthPackIntakeBase & { sector: string };

const BASE_INTAKE: TestIntake = {
  business_name: "Test Biz QA",
  sector: "restaurant",
  city: "Madrid",
  value_proposition: "Cocina mediterránea",
  primary_cta: "Reservar mesa",
  contact_email: "portal@test.nelvyon",
  contact_name: "Test Cliente",
};

const BASE_REPORT: PackReport = {
  pack_id: LOCAL_GROWTH_PACK_ID,
  pack_name: "Test Pack",
  business_name: "Test Biz QA",
  sector: "restaurant",
  completed_at: new Date().toISOString(),
  summary: "Test",
  portal_path: "/portal",
  kpis: {
    deliverables_published: 1,
    avg_qa_score: 90,
    skus_passed: 1,
    skus_total: 1,
    saas_client_id: 1,
    saas_campaign_id: 1,
  },
  sku_results: [],
  next_steps: [],
};

function makeConfig(
  overrides: Partial<GrowthPackRunConfig<TestIntake>> = {},
): GrowthPackRunConfig<TestIntake> {
  const meta = { ...PACK_REGISTRY[LOCAL_GROWTH_PACK_ID], skuSequence: ["NELVYON-LANDING" as const] };
  return {
    meta,
    intake: BASE_INTAKE,
    buildBrief: () => ({ company_name: "Test Biz QA" }),
    primaryCampaign: () => ({
      platform: "google",
      campaign_type: "search",
      name: "Test Campaign",
      content: "Test",
      target_audience: "local",
      status: "active",
    }),
    buildReport: () => BASE_REPORT,
    projectDescription: () => "Test project",
    ...overrides,
  };
}

const FAKE_RUN = {
  id: "run-1",
  steps: [],
  status: "running" as const,
  os_client_id: "client-1",
  os_project_id: "project-1",
};

describe("packOrchestrator — auto-approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue([{ id: "deliverable-1" }]);
    mockCreatePackRun.mockResolvedValue({ ...FAKE_RUN });
    mockUpdatePackRun.mockImplementation(
      (_id: string, patch: Record<string, unknown>) =>
        Promise.resolve({ ...FAKE_RUN, ...patch }),
    );
    mockGetPackRun.mockResolvedValue({ ...FAKE_RUN, status: "completed" });
    (mockMarkStep as ReturnType<typeof vi.fn>).mockImplementation((steps: unknown[]) => steps);
  });

  it("llama dbAutoApprovePackDeliverables cuando QA ≥ 85", async () => {
    await runGrowthPack({ workspaceId: 1, userId: "user-1", config: makeConfig() });

    const approveUpdates = (mockQuery.mock.calls as unknown[][]).filter(
      (args) => typeof args[0] === "string" && (args[0] as string).includes("approved_by_client") && (args[0] as string).includes("UPDATE"),
    );
    expect(approveUpdates.length).toBeGreaterThan(0);
  });

  it("status = completed cuando todo QA ≥ 85", async () => {
    await runGrowthPack({ workspaceId: 1, userId: "user-1", config: makeConfig() });

    const completedCall = (mockUpdatePackRun.mock.calls as unknown[][]).find(
      (args) => {
        const patch = args[1] as Record<string, unknown>;
        return patch.status === "completed";
      },
    );
    expect(completedCall).toBeDefined();
  });

  it("status = needs_review y sin auto-approve cuando QA < 85", async () => {
    mockSimulate.mockReturnValueOnce({
      project: { qa: { score: 70, passed: false }, project_id: "proj-low", sku: "NELVYON-LANDING", artifacts: {}, os_refs: {} },
      escalated: false,
      os_publish: null,
      simulation_mode: "production",
    });

    await runGrowthPack({ workspaceId: 1, userId: "user-1", config: makeConfig() });

    const reviewCall = (mockUpdatePackRun.mock.calls as unknown[][]).find(
      (args) => {
        const patch = args[1] as Record<string, unknown>;
        return patch.status === "needs_review";
      },
    );
    expect(reviewCall).toBeDefined();

    const approveUpdates = (mockQuery.mock.calls as unknown[][]).filter(
      (args) => typeof args[0] === "string" && (args[0] as string).includes("approved_by_client") && (args[0] as string).includes("UPDATE"),
    );
    expect(approveUpdates.length).toBe(0);
  });
});
