import type { ILlmClient } from "../../LlmClient";
import type { SalesIntelligenceInput, SalesIntelligenceOutput } from "./shared";
import { getDefaultSalesIntelligenceLlm, runSalesIntelligenceAgentCore } from "./shared";

const AGENT_ID = "salesintelligence-prospectresearch";

export class ProspectResearchAgent {
  private static inst: ProspectResearchAgent | undefined;

  static get instance(): ProspectResearchAgent {
    if (!ProspectResearchAgent.inst) ProspectResearchAgent.inst = new ProspectResearchAgent();
    return ProspectResearchAgent.inst;
  }

  static reset(): void {
    ProspectResearchAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSalesIntelligenceLlm();
  }

  async run(input: SalesIntelligenceInput): Promise<SalesIntelligenceOutput> {
    const eliteRole = "Eres **Prospect Research** — investigación 360° automatizada.";
    const mission =
      "Investiga **empresa**, **decisores** y **pain points** en **<60 segundos**; **0 intervención humana** en research.";
    const fewShot =
      '{"content":"Prospect research: empresa, decisores, pain points, 360° <60 s, 0 humano","score":92,"highlights":["<60 s 360°","0 humano"],"metrics":["Research time"]}';
    return runSalesIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.45);
  }
}

export function getProspectResearchAgent(): ProspectResearchAgent {
  return ProspectResearchAgent.instance;
}

export function resetProspectResearchAgentForTests(): void {
  ProspectResearchAgent.reset();
}
