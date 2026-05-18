import type { ILlmClient } from "../../LlmClient";
import type { MobileInput, MobileOutput } from "./shared";
import { getDefaultMobileLlm, runMobileAgentCore } from "./shared";

const AGENT_ID = "mobile-revenue-optimization";

export class MobileRevenueOptimizationAgent {
  private static inst: MobileRevenueOptimizationAgent | undefined;

  static get instance(): MobileRevenueOptimizationAgent {
    if (!MobileRevenueOptimizationAgent.inst) MobileRevenueOptimizationAgent.inst = new MobileRevenueOptimizationAgent();
    return MobileRevenueOptimizationAgent.inst;
  }

  static reset(): void {
    MobileRevenueOptimizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMobileLlm();
  }

  async run(input: MobileInput): Promise<MobileOutput> {
    return runMobileAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Mobile monetization strategist top 1%; LTV ético y experimentación.",
        mission:
          "Genera estrategia de monetización y optimización de paywall: pricing psychology y tests.",
        fewShotExample:
          "Input: subscription news. Output JSON: screens paywall variants A/B; features trial ladder bundles.",
      },
      input,
      0.2,
    );
  }
}

export function getMobileRevenueOptimizationAgent(): MobileRevenueOptimizationAgent {
  return MobileRevenueOptimizationAgent.instance;
}

export function resetMobileRevenueOptimizationAgentForTests(): void {
  MobileRevenueOptimizationAgent.reset();
}
