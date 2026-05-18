import type { ILlmClient } from "../../LlmClient";
import type { SalesIntelligenceInput, SalesIntelligenceOutput } from "./shared";
import { getDefaultSalesIntelligenceLlm, runSalesIntelligenceAgentCore } from "./shared";

const AGENT_ID = "salesintelligence-salessignal";

export class SalesSignalAgent {
  private static inst: SalesSignalAgent | undefined;

  static get instance(): SalesSignalAgent {
    if (!SalesSignalAgent.inst) SalesSignalAgent.inst = new SalesSignalAgent();
    return SalesSignalAgent.inst;
  }

  static reset(): void {
    SalesSignalAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSalesIntelligenceLlm();
  }

  async run(input: SalesIntelligenceInput): Promise<SalesIntelligenceOutput> {
    const eliteRole = "Eres **Sales Signal** — alertas y triggers comerciales.";
    const mission =
      "Dispara alertas por **financiación**, **contrataciones**, **cambios tech stack** y **expansión** en tiempo real.";
    const fewShot =
      '{"content":"Sales signal: financiación, hiring, tech stack, expansión, alertas RT","score":90,"highlights":["Tech stack change","Funding alerts"],"metrics":["Signal triggers"]}';
    return runSalesIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getSalesSignalAgent(): SalesSignalAgent {
  return SalesSignalAgent.instance;
}

export function resetSalesSignalAgentForTests(): void {
  SalesSignalAgent.reset();
}
