import type { ILlmClient } from "../../LlmClient";
import type { RevenueIntelligenceInput, RevenueIntelligenceOutput } from "./shared";
import { getDefaultRevenueIntelligenceLlm, runRevenueIntelligenceAgentCore } from "./shared";

const AGENT_ID = "revenueintelligence-revenueforecaster";

export class RevenueForecasterAgent {
  private static inst: RevenueForecasterAgent | undefined;

  static get instance(): RevenueForecasterAgent {
    if (!RevenueForecasterAgent.inst) RevenueForecasterAgent.inst = new RevenueForecasterAgent();
    return RevenueForecasterAgent.inst;
  }

  static reset(): void {
    RevenueForecasterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRevenueIntelligenceLlm();
  }

  async run(input: RevenueIntelligenceInput): Promise<RevenueIntelligenceOutput> {
    const eliteRole = "Eres **Revenue Forecaster** — forecast de pipeline con IA.";
    const mission =
      "Genera **forecast de ingresos del pipeline** con IA y **accuracy >93%** a **30/60/90 días**.";
    const fewShot =
      '{"content":"Forecast pipeline: >93% accuracy 30/60/90 días","score":96,"highlights":[">93% accuracy","30/60/90 d"],"metrics":["Forecast accuracy"]}';
    return runRevenueIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRevenueForecasterAgent(): RevenueForecasterAgent {
  return RevenueForecasterAgent.instance;
}

export function resetRevenueForecasterAgentForTests(): void {
  RevenueForecasterAgent.reset();
}
