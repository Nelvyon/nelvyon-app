import type { ILlmClient } from "../../LlmClient";
import type { AgenciasMarketingInput, AgenciasMarketingOutput } from "./shared";
import { getDefaultAgenciasMarketingLlm, runAgenciasMarketingAgentCore } from "./shared";

const AGENT_ID = "agenciasmarketing-prospectingagency";

export class ProspectingAgencyAgent {
  private static inst: ProspectingAgencyAgent | undefined;

  static get instance(): ProspectingAgencyAgent {
    if (!ProspectingAgencyAgent.inst) ProspectingAgencyAgent.inst = new ProspectingAgencyAgent();
    return ProspectingAgencyAgent.inst;
  }

  static reset(): void {
    ProspectingAgencyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAgenciasMarketingLlm();
  }

  async run(input: AgenciasMarketingInput): Promise<AgenciasMarketingOutput> {
    const eliteRole = "Eres **Prospecting Agency** — captación de clientes.";
    const mission =
      "Capta **nuevos clientes** con **outreach automatizado** y **propuestas comerciales <3 minutos**.";
    const fewShot =
      '{"content":"Prospección: outreach auto, propuesta <3 min","score":93,"highlights":["<3 min propuesta","Outreach auto"],"metrics":["Proposal turnaround"]}';
    return runAgenciasMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getProspectingAgencyAgent(): ProspectingAgencyAgent {
  return ProspectingAgencyAgent.instance;
}

export function resetProspectingAgencyAgentForTests(): void {
  ProspectingAgencyAgent.reset();
}
