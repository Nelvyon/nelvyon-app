// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: vi.fn(),
  },
}));

import { LlmClient } from "../LlmClient";
import { PredictiveRoiService, resetPredictiveRoiServiceForTests } from "../PredictiveRoiService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const PRED_ID = "00000000-0000-0000-0000-0000000000bb";

const llmJson =
  '{"predictedRoi":45,"predictedRevenue":4500,"predictedConversions":30,"confidenceScore":78,"reasoning":"test"}';

describe("PredictiveRoiService", () => {
  beforeEach(() => {
    resetPredictiveRoiServiceForTests();
    vi.clearAllMocks();
  });

  it("predictCampaignRoi con historial", async () => {
    const llm = { complete: vi.fn().mockResolvedValue(llmJson) };
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ type: "conversion", payload: { revenue: 1000 }, created_at: new Date() }])
      .mockResolvedValueOnce([
        {
          id: PRED_ID,
          userId: USER_ID,
          campaignParams: { budget: 1000, channel: "meta_ads", targetAudience: "b2b", duration: 30, industry: "saas", objective: "leads" },
          predictedRoi: "45",
          predictedRevenue: "4500",
          predictedConversions: 30,
          confidenceScore: "78",
          reasoning: "test",
          modelVersion: "v1",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]);
    const svc = new PredictiveRoiService({ db: { query } });
    const out = await svc.predictCampaignRoi(USER_ID, {
      budget: 1000,
      channel: "meta_ads",
      targetAudience: "b2b",
      duration: 30,
      industry: "saas",
      objective: "leads",
    });
    expect(out.predictedRoi).toBe(45);
    expect(llm.complete).toHaveBeenCalledWith(expect.any(String), { model: "gpt-4o", temperature: 0.1, maxTokens: 1000 });
  });

  it("predictCampaignRoi sin historial previo", async () => {
    const llm = { complete: vi.fn().mockResolvedValue(llmJson) };
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    const query = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: PRED_ID,
          userId: USER_ID,
          campaignParams: { budget: 500, channel: "google_ads", targetAudience: "local", duration: 15, industry: "retail", objective: "sales" },
          predictedRoi: "45",
          predictedRevenue: "4500",
          predictedConversions: 30,
          confidenceScore: "78",
          reasoning: "test",
          modelVersion: "v1",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]);
    const svc = new PredictiveRoiService({ db: { query } });
    const out = await svc.predictCampaignRoi(USER_ID, {
      budget: 500,
      channel: "google_ads",
      targetAudience: "local",
      duration: 15,
      industry: "retail",
      objective: "sales",
    });
    expect(out.predictedRevenue).toBe(4500);
  });

  it("evaluatePrediction", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ predicted_roi: "50" }])
      .mockResolvedValueOnce([
        {
          id: "r1",
          predictionId: PRED_ID,
          actualRoi: "40",
          actualRevenue: "3000",
          actualConversions: 20,
          accuracyScore: "90",
          evaluatedAt: new Date("2026-01-02T00:00:00.000Z"),
        },
      ]);
    const svc = new PredictiveRoiService({ db: { query }, llm: { complete: vi.fn() } });
    const r = await svc.evaluatePrediction(USER_ID, PRED_ID, { actualRoi: 40, actualRevenue: 3000, actualConversions: 20 });
    expect(r.accuracyScore).toBe(90);
  });

  it("getPredictionHistory", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: PRED_ID,
        userId: USER_ID,
        campaignParams: { budget: 1000 },
        predictedRoi: "45",
        predictedRevenue: "4500",
        predictedConversions: 30,
        confidenceScore: "78",
        reasoning: "test",
        modelVersion: "v1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new PredictiveRoiService({ db: { query }, llm: { complete: vi.fn() } });
    const list = await svc.getPredictionHistory(USER_ID);
    expect(list).toHaveLength(1);
  });

  it("getModelAccuracy", async () => {
    const query = vi.fn().mockResolvedValue([{ avg_accuracy: "84.5", total_predictions: "10", evaluated_predictions: "6" }]);
    const svc = new PredictiveRoiService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getModelAccuracy(USER_ID);
    expect(out.avgAccuracy).toBe(84.5);
    expect(out.totalPredictions).toBe(10);
    expect(out.evaluatedPredictions).toBe(6);
  });

  it("getBestChannels", async () => {
    const query = vi.fn().mockResolvedValue([
      { channel: "google_ads", total_revenue: "5000", conversions: "25", avg_roi: "200" },
      { channel: "meta_ads", total_revenue: "3000", conversions: "20", avg_roi: "150" },
    ]);
    const svc = new PredictiveRoiService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getBestChannels(USER_ID);
    expect(out[0].channel).toBe("google_ads");
    expect(out).toHaveLength(2);
  });
});
