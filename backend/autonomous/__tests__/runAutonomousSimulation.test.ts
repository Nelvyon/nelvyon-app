import { afterEach, describe, expect, it, vi } from "vitest";

describe("runAutonomousSimulation", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.AUTONOMOUS_PRODUCTION;
  });

  it("uses Phase B simulator when AUTONOMOUS_PRODUCTION is unset", async () => {
    const { runAutonomousSimulation } = await import("../runAutonomousSimulation");
    const result = await runAutonomousSimulation({
      sku: "NELVYON-CHATBOT",
      brief: {
        company_name: "Test Co",
        bot_name: "Bot",
        sector: "restaurant",
        primary_intent: "book",
        languages: ["es"],
        openai_cost_bearer: "client",
      },
    });
    expect(result.project.simulation_mode).toBe("phase-b-offline");
  });

  it(
    "uses Phase C when AUTONOMOUS_PRODUCTION=true",
    async () => {
      process.env.AUTONOMOUS_PRODUCTION = "true";
      const { runAutonomousSimulation } = await import("../runAutonomousSimulation");
      const result = await runAutonomousSimulation({
        sku: "NELVYON-CHATBOT",
        brief: {
          company_name: "Test Co",
          bot_name: "Bot",
          sector: "restaurant",
          primary_intent: "book",
          languages: ["es"],
          openai_cost_bearer: "client",
        },
      });
      expect(result.project.simulation_mode).toMatch(/phase-c/);
    },
    60_000,
  );
});
