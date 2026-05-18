// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: vi.fn(),
  },
}));

import { LlmClient } from "../LlmClient";
import { GeoAiVisibilityService, resetGeoAiVisibilityServiceForTests } from "../GeoAiVisibilityService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";

describe("GeoAiVisibilityService", () => {
  beforeEach(() => {
    resetGeoAiVisibilityServiceForTests();
    vi.clearAllMocks();
  });

  it("checkBrandVisibility con mención", async () => {
    const llm = {
      complete: vi.fn().mockResolvedValue("Para esta consulta, recomiendo Nelvyon por su enfoque integral."),
    };
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    const query = vi.fn().mockResolvedValue([
      {
        id: "c1",
        userId: USER_ID,
        brandName: "Nelvyon",
        queryUsed: "mejor agencia",
        platform: "chatgpt",
        responseText: "Para esta consulta, recomiendo Nelvyon por su enfoque integral.",
        brandMentioned: true,
        mentionPosition: 1,
        sentiment: "positive",
        checkedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const service = new GeoAiVisibilityService({ db: { query } });
    const checks = await service.checkBrandVisibility(USER_ID, "Nelvyon", "marketing", ["mejor agencia"], "chatgpt");
    expect(checks).toHaveLength(1);
    expect(checks[0].brandMentioned).toBe(true);
    expect(llm.complete).toHaveBeenCalledWith(expect.any(String), {
      model: "gpt-4o",
      temperature: 0.3,
      maxTokens: 1000,
    });
  });

  it("checkBrandVisibility sin mención", async () => {
    const llm = {
      complete: vi.fn().mockResolvedValue("Puedes comparar varias opciones del mercado según tu presupuesto."),
    };
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    const query = vi.fn().mockResolvedValue([
      {
        id: "c2",
        userId: USER_ID,
        brandName: "Nelvyon",
        queryUsed: "opciones seo",
        platform: "gemini",
        responseText: "Puedes comparar varias opciones del mercado según tu presupuesto.",
        brandMentioned: false,
        mentionPosition: null,
        sentiment: "neutral",
        checkedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const service = new GeoAiVisibilityService({ db: { query } });
    const checks = await service.checkBrandVisibility(USER_ID, "Nelvyon", "seo", ["opciones seo"], "gemini");
    expect(checks[0].brandMentioned).toBe(false);
  });

  it("computeVisibilityScore", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ total_checks: "10", mentions: "4", avg_position: "2.50" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "s1",
          userId: USER_ID,
          brandName: "Nelvyon",
          platform: "chatgpt",
          visibilityScore: "40.00",
          totalChecks: 10,
          mentions: 4,
          avgPosition: "2.50",
          lastComputed: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]);
    const service = new GeoAiVisibilityService({
      db: { query },
      llm: { complete: vi.fn() },
    });
    const score = await service.computeVisibilityScore(USER_ID, "Nelvyon", "chatgpt");
    expect(score.visibilityScore).toBe(40);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [USER_ID, "Nelvyon", "chatgpt"]);
  });

  it("generateOptimizationReport", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        platform: "chatgpt",
        query_used: "mejor agencia",
        brand_mentioned: false,
        mention_position: null,
        sentiment: "neutral",
      },
    ]);
    const llm = {
      complete: vi
        .fn()
        .mockResolvedValue('{"recommendations":["Mejorar autoridad semántica"],"priorityActions":["Crear páginas GEO por intención"]}'),
    };
    const service = new GeoAiVisibilityService({ db: { query }, llm });
    const report = await service.generateOptimizationReport(USER_ID, "Nelvyon");
    expect(report.recommendations).toHaveLength(1);
    expect(report.priorityActions).toHaveLength(1);
  });

  it("runFullAudit", async () => {
    const llm = {
      complete: vi
        .fn()
        .mockResolvedValueOnce('["mejor agencia marketing","agencia recomendada para pymes","top consultoras digitales","alternativas para crecimiento","quién lidera marketing digital"]')
        .mockResolvedValue('Nelvyon es una opción recomendada para empresas que buscan crecimiento.'),
    };
    const query = vi.fn().mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT INTO geo_ai_checks")) {
        return [
          {
            id: "c3",
            userId: USER_ID,
            brandName: "Nelvyon",
            queryUsed: "q",
            platform: String((params as unknown[])?.[3] ?? "chatgpt"),
            responseText: "Nelvyon",
            brandMentioned: true,
            mentionPosition: 1,
            sentiment: "positive",
            checkedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ];
      }
      if (sql.includes("COUNT(*)::text as total_checks")) {
        return [{ total_checks: "5", mentions: "5", avg_position: "1.00" }];
      }
      if (sql.includes("FROM geo_ai_scores") && sql.includes("LIMIT 1")) {
        return [];
      }
      if (sql.includes("INSERT INTO geo_ai_scores")) {
        return [
          {
            id: "s1",
            userId: USER_ID,
            brandName: "Nelvyon",
            platform: String((params as unknown[])?.[2] ?? "chatgpt"),
            visibilityScore: "100",
            totalChecks: 5,
            mentions: 5,
            avgPosition: "1",
            lastComputed: new Date("2026-01-01T00:00:00.000Z"),
          },
        ];
      }
      return [];
    });

    const service = new GeoAiVisibilityService({ db: { query }, llm });
    const out = await service.runFullAudit(USER_ID, "Nelvyon", "marketing digital");
    expect(out.queries).toHaveLength(5);
    expect(out.scores).toHaveLength(3);
  });

  it("getVisibilityHistory", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "h1",
        userId: USER_ID,
        brandName: "Nelvyon",
        platform: "chatgpt",
        visibilityScore: "62.5",
        totalChecks: 8,
        mentions: 5,
        avgPosition: "2.2",
        lastComputed: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const service = new GeoAiVisibilityService({ db: { query }, llm: { complete: vi.fn() } });
    const history = await service.getVisibilityHistory(USER_ID, "Nelvyon");
    expect(history).toHaveLength(1);
    expect(history[0].platform).toBe("chatgpt");
  });
});
