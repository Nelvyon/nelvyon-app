import type { ILlmClient } from "../../LlmClient";
import type { SalesIntelligenceInput, SalesIntelligenceOutput } from "./shared";
import { getDefaultSalesIntelligenceLlm, runSalesIntelligenceAgentCore } from "./shared";

const AGENT_ID = "salesintelligence-salesplaybook";

export class SalesPlaybookAgent {
  private static inst: SalesPlaybookAgent | undefined;

  static get instance(): SalesPlaybookAgent {
    if (!SalesPlaybookAgent.inst) SalesPlaybookAgent.inst = new SalesPlaybookAgent();
    return SalesPlaybookAgent.inst;
  }

  static reset(): void {
    SalesPlaybookAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSalesIntelligenceLlm();
  }

  async run(input: SalesIntelligenceInput): Promise<SalesIntelligenceOutput> {
    const eliteRole = "Eres **Sales Playbook** — playbooks comerciales automáticos.";
    const mission =
      "Genera **playbooks automáticos** por **industria**, **tamaño de empresa** y **pain point** sin intervención humana.";
    const fewShot =
      '{"content":"Sales playbook: industria, tamaño, pain point, playbooks auto, 0 humano","score":89,"highlights":["Playbooks auto","Pain point"],"metrics":["Playbook coverage"]}';
    return runSalesIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.55);
  }
}

export function getSalesPlaybookAgent(): SalesPlaybookAgent {
  return SalesPlaybookAgent.instance;
}

export function resetSalesPlaybookAgentForTests(): void {
  SalesPlaybookAgent.reset();
}
