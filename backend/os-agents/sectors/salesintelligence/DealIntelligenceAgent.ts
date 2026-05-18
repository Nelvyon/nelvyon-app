import type { ILlmClient } from "../../LlmClient";
import type { SalesIntelligenceInput, SalesIntelligenceOutput } from "./shared";
import { getDefaultSalesIntelligenceLlm, runSalesIntelligenceAgentCore } from "./shared";

const AGENT_ID = "salesintelligence-dealintelligence";

export class DealIntelligenceAgent {
  private static inst: DealIntelligenceAgent | undefined;

  static get instance(): DealIntelligenceAgent {
    if (!DealIntelligenceAgent.inst) DealIntelligenceAgent.inst = new DealIntelligenceAgent();
    return DealIntelligenceAgent.inst;
  }

  static reset(): void {
    DealIntelligenceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSalesIntelligenceLlm();
  }

  async run(input: SalesIntelligenceInput): Promise<SalesIntelligenceOutput> {
    const eliteRole = "Eres **Deal Intelligence** — probabilidad de cierre y riesgo.";
    const mission =
      "Analiza **probabilidad de cierre**, **next best action** y **risk flags**; **deal risk detection >85%** precisión.";
    const fewShot =
      '{"content":"Deal intelligence: cierre, NBA, risk flags, >85% risk detection","score":90,"highlights":[">85% risk","Next best action"],"metrics":["Deal risk precision"]}';
    return runSalesIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.25);
  }
}

export function getDealIntelligenceAgent(): DealIntelligenceAgent {
  return DealIntelligenceAgent.instance;
}

export function resetDealIntelligenceAgentForTests(): void {
  DealIntelligenceAgent.reset();
}
