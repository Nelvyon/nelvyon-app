import type { ILlmClient } from "../../LlmClient";
import type { LeadEnrichInput, LeadEnrichOutput } from "./shared";
import { getDefaultLeadEnrichLlm, runLeadEnrichAgentCore } from "./shared";

const AGENT_ID = "leadenrich-profile";

export class LeadEnrichProfileAgent {
  private static inst: LeadEnrichProfileAgent | undefined;

  static get instance(): LeadEnrichProfileAgent {
    if (!LeadEnrichProfileAgent.inst) LeadEnrichProfileAgent.inst = new LeadEnrichProfileAgent();
    return LeadEnrichProfileAgent.inst;
  }

  static reset(): void {
    LeadEnrichProfileAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLeadEnrichLlm();
  }

  async run(input: LeadEnrichInput): Promise<LeadEnrichOutput> {
    const eliteRole =
      "Eres **LeadEnrich Profile Specialist** — enriquecimiento de identidad profesional en <5s por lead.";
    const mission =
      "Enriquece **perfil del lead**: nombre, cargo, empresa, LinkedIn y email verificable; coherencia con ICP NELVYON.";
    const fewShot =
      '{"content":"Profile enriched: role, company, LinkedIn, verified email <5s","score":88,"highlights":["LinkedIn match","Verified email"],"metrics":["Profile completeness"]}';
    return runLeadEnrichAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getLeadEnrichProfileAgent(): LeadEnrichProfileAgent {
  return LeadEnrichProfileAgent.instance;
}

export function resetLeadEnrichProfileAgentForTests(): void {
  LeadEnrichProfileAgent.reset();
}
