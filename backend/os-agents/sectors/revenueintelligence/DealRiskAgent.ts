import type { ILlmClient } from "../../LlmClient";
import type { RevenueIntelligenceInput, RevenueIntelligenceOutput } from "./shared";
import { getDefaultRevenueIntelligenceLlm, runRevenueIntelligenceAgentCore } from "./shared";

const AGENT_ID = "revenueintelligence-dealrisk";

export class DealRiskAgent {
  private static inst: DealRiskAgent | undefined;

  static get instance(): DealRiskAgent {
    if (!DealRiskAgent.inst) DealRiskAgent.inst = new DealRiskAgent();
    return DealRiskAgent.inst;
  }

  static reset(): void {
    DealRiskAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRevenueIntelligenceLlm();
  }

  async run(input: RevenueIntelligenceInput): Promise<RevenueIntelligenceOutput> {
    const eliteRole = "Eres **Deal Risk** — riesgo de deal en conversación.";
    const mission =
      "Analiza **riesgo de deal** por conversación, detecta **señales de pérdida** y emite **alertas en tiempo real** durante la llamada.";
    const fewShot =
      '{"content":"Deal risk RT: señales pérdida, alertas en llamada","score":94,"highlights":["Risk RT","Señales pérdida"],"metrics":["Deal risk score"]}';
    return runRevenueIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getDealRiskAgent(): DealRiskAgent {
  return DealRiskAgent.instance;
}

export function resetDealRiskAgentForTests(): void {
  DealRiskAgent.reset();
}
