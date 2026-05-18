import { describe, expect, it, vi } from "vitest";

import { AgentQualityService } from "../AgentQualityService";
import { OsAgentError } from "../OsAgentError";

describe("AgentQualityService", () => {
  it("submitFeedback válido", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_jobs")) return [{ service_id: "seo_premium" }];
      if (sql.includes("INSERT INTO agent_feedback")) {
        return [
          {
            id: "f1",
            userId: "u1",
            jobId: "00000000-0000-0000-0000-000000000011",
            resultId: "00000000-0000-0000-0000-000000000022",
            rating: 5,
            feedbackText: "Excelente",
            sector: "retail",
            createdAt: new Date().toISOString(),
          },
        ];
      }
      if (sql.includes("COALESCE(AVG(af.rating), 0)::text")) return [{ avg_rating: "4.5", total_feedback: "2" }];
      if (sql.includes("INSERT INTO agent_quality_scores")) return [];
      return [];
    });
    const service = new AgentQualityService({ db: { query } });
    const row = await service.submitFeedback(
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000011",
      "00000000-0000-0000-0000-000000000022",
      5,
      "Excelente",
      "Retail",
    );
    expect(row.rating).toBe(5);
  });

  it("submitFeedback rating inválido", async () => {
    const service = new AgentQualityService({ db: { query: vi.fn() } });
    await expect(
      service.submitFeedback(
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000011",
        "00000000-0000-0000-0000-000000000022",
        6,
        "bad",
        "retail",
      ),
    ).rejects.toBeInstanceOf(OsAgentError);
  });

  it("recomputeScore", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("COALESCE(AVG(af.rating), 0)::text")) return [{ avg_rating: "3.75", total_feedback: "8" }];
      if (sql.includes("INSERT INTO agent_quality_scores")) return [];
      return [];
    });
    const service = new AgentQualityService({ db: { query } });
    await service.recomputeScore("seo_premium", "retail");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO agent_quality_scores"), [
      "seo_premium",
      "retail",
      3.75,
      8,
    ]);
  });

  it("getQualityScore", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "s1",
        serviceType: "seo_premium",
        sector: "retail",
        avgRating: 4.7,
        totalFeedback: 17,
        lastComputed: new Date().toISOString(),
      },
    ]);
    const service = new AgentQualityService({ db: { query } });
    const score = await service.getQualityScore("seo_premium", "retail");
    expect(score?.serviceType).toBe("seo_premium");
  });

  it("getTopPerformingAgents", async () => {
    const query = vi.fn().mockResolvedValue([
      { id: "s1", serviceType: "seo_premium", sector: "retail", avgRating: 4.8, totalFeedback: 20, lastComputed: new Date().toISOString() },
      { id: "s2", serviceType: "ads_premium", sector: "retail", avgRating: 4.6, totalFeedback: 15, lastComputed: new Date().toISOString() },
    ]);
    const service = new AgentQualityService({ db: { query } });
    const top = await service.getTopPerformingAgents(2);
    expect(top).toHaveLength(2);
  });

  it("buildEnhancedPrompt sin feedback previo", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new AgentQualityService({ db: { query } });
    const prompt = await service.buildEnhancedPrompt("Base prompt", "seo_premium", "retail", { tone: "directo" });
    expect(prompt).toContain("Base prompt");
    expect(prompt).toContain("Context");
  });

  it("buildEnhancedPrompt con feedback negativo", async () => {
    const query = vi.fn().mockResolvedValue([{ feedback_text: "Muy genérico" }, { feedback_text: "Faltan pasos concretos" }]);
    const service = new AgentQualityService({ db: { query } });
    const prompt = await service.buildEnhancedPrompt("Base prompt", "seo_premium", "retail", { locale: "es" });
    expect(prompt).toContain("Negative patterns to avoid");
    expect(prompt).toContain("Muy genérico");
  });

  it("validateOutput válido", async () => {
    const service = new AgentQualityService({ db: { query: vi.fn() } });
    const output =
      "Este plan seo_premium para el sector retail propone objetivos medibles, acciones semanales y un calendario claro para ejecutar la estrategia.";
    const result = await service.validateOutput(output, "seo_premium", "retail");
    expect(result.valid).toBe(true);
    expect(result.score).toBe(100);
  });

  it("validateOutput inválido", async () => {
    const service = new AgentQualityService({ db: { query: vi.fn() } });
    const result = await service.validateOutput("lorem ipsum todo", "seo_premium", "retail");
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
