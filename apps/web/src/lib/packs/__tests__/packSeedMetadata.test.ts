/**
 * O7 — Verifies that packOrchestrator injects seed_id + source into
 * every deliverable metadata produced by runSkuPipeline.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- DB mock ---------------------------------------------------------------
const mockQuery = vi.fn();
vi.mock("../../../../../../backend/db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: mockQuery }) },
}));

vi.mock("@/lib/platformDbFallback", () => ({
  platformDbFallbackEnabled: () => true,
  dbCreateClient: vi.fn().mockResolvedValue({ id: 1 }),
  dbCreateCampaign: vi.fn().mockResolvedValue({ id: 1 }),
}));

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

vi.mock("../../../../../../backend/autonomous/simulator", () => ({
  simulateAutonomousJob: ({ sku }: { sku: string }) => ({
    project: { qa: { score: 90, passed: true }, project_id: "proj-1", sku, artifacts: {}, os_refs: {} },
    escalated: false,
    os_publish: null,
    simulation_mode: "production",
  }),
}));

vi.mock("../../../../../../backend/email/emailService", () => ({
  sendEmailViaService: vi.fn().mockResolvedValue({}),
}));

// ---------------------------------------------------------------------------

import { runGrowthPack } from "@/lib/packs/packOrchestrator";
import type { GrowthPackRunConfig } from "@/lib/packs/packOrchestrator";
import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import type { GrowthPackIntakeBase, PackReport } from "@/lib/packs/types";
import { LOCAL_GROWTH_PACK_ID } from "@/lib/packs/types";

type TestIntake = GrowthPackIntakeBase & { sector: string };

const FAKE_RUN = {
  id: "run-seed",
  steps: [],
  status: "running" as const,
  os_client_id: "client-seed",
  os_project_id: "project-seed",
};

const BASE_REPORT: PackReport = {
  pack_id: LOCAL_GROWTH_PACK_ID,
  pack_name: "Seed Test Pack",
  business_name: "Restaurante Pepe",
  sector: "restaurantes",
  completed_at: new Date().toISOString(),
  summary: "OK",
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

function makeConfig(sector = "restaurantes"): GrowthPackRunConfig<TestIntake> {
  const meta = { ...PACK_REGISTRY[LOCAL_GROWTH_PACK_ID], skuSequence: ["NELVYON-LANDING" as const] };
  return {
    meta,
    intake: {
      business_name: "Restaurante Pepe",
      sector,
      city: "Sevilla",
      value_proposition: "Cocina tradicional",
      primary_cta: "Reservar",
      contact_email: "pepe@test.com",
      contact_name: "Pepe",
    },
    buildBrief: () => ({ company_name: "Restaurante Pepe" }),
    primaryCampaign: () => ({
      platform: "google",
      campaign_type: "search",
      name: "Test",
      content: "Test",
      target_audience: "local",
      status: "active",
    }),
    buildReport: () => BASE_REPORT,
    projectDescription: () => "Test",
  };
}

describe("packOrchestrator — O7 seed metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue([{ id: "deliverable-seed" }]);
    mockCreatePackRun.mockResolvedValue({ ...FAKE_RUN });
    mockUpdatePackRun.mockImplementation(
      (_id: string, patch: Record<string, unknown>) =>
        Promise.resolve({ ...FAKE_RUN, ...patch }),
    );
    mockGetPackRun.mockResolvedValue({ ...FAKE_RUN, status: "completed" });
    (mockMarkStep as ReturnType<typeof vi.fn>).mockImplementation((steps: unknown[]) => steps);
  });

  function findDeliverableMetadata(calls: Array<[string, unknown[]]>, sector: string): Record<string, unknown> {
    // packOsDb inserts into os_deliverables; metadata is JSON.stringify'd at param index 9 ($10)
    const insertCall = calls.find(
      ([sql]) => typeof sql === "string" && sql.includes("INSERT INTO os_deliverables"),
    );
    expect(insertCall).toBeDefined();
    const params = insertCall?.[1] ?? [];
    // param index 9 = $10 = metadata JSON string
    const metadataStr = params[9] as string;
    expect(typeof metadataStr).toBe("string");
    const meta = JSON.parse(metadataStr) as Record<string, unknown>;
    return meta;
  }

  it("deliverable metadata includes seed_id and source:synthetic for restaurantes", async () => {
    await runGrowthPack({ workspaceId: 1, userId: "user-1", config: makeConfig("restaurantes") });
    const meta = findDeliverableMetadata(mockQuery.mock.calls as Array<[string, unknown[]]>, "restaurantes");
    expect(meta.seed_id).toBe("restaurantes_tpl_0");
    expect(meta.source).toBe("synthetic");
  });

  it("seed_id reflects the sector — ecommerce pack gets ecommerce_tpl_0", async () => {
    await runGrowthPack({ workspaceId: 1, userId: "user-1", config: makeConfig("ecommerce") });
    const meta = findDeliverableMetadata(mockQuery.mock.calls as Array<[string, unknown[]]>, "ecommerce");
    expect(meta.seed_id).toBe("ecommerce_tpl_0");
    expect(meta.source).toBe("synthetic");
  });
});
