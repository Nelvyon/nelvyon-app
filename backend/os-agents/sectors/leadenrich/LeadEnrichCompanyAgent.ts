import type { ILlmClient } from "../../LlmClient";
import type { LeadEnrichInput, LeadEnrichOutput } from "./shared";
import { getDefaultLeadEnrichLlm, runLeadEnrichAgentCore } from "./shared";

const AGENT_ID = "leadenrich-company";

export class LeadEnrichCompanyAgent {
  private static inst: LeadEnrichCompanyAgent | undefined;

  static get instance(): LeadEnrichCompanyAgent {
    if (!LeadEnrichCompanyAgent.inst) LeadEnrichCompanyAgent.inst = new LeadEnrichCompanyAgent();
    return LeadEnrichCompanyAgent.inst;
  }

  static reset(): void {
    LeadEnrichCompanyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLeadEnrichLlm();
  }

  async run(input: LeadEnrichInput): Promise<LeadEnrichOutput> {
    const eliteRole =
      "Eres **LeadEnrich Company Analyst** — firmografía y stack en <5s por lead.";
    const mission =
      "Enriquece **empresa**: sector, tamaño (empleados), revenue estimado y **tecnologías usadas**; contraste con ICP 1-200 FTE.";
    const fewShot =
      '{"content":"Company: sector SaaS, 85 FTE, stack ads+CRM","score":86,"highlights":["ICP size fit","Tech stack"],"metrics":["Employee band"]}';
    return runLeadEnrichAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getLeadEnrichCompanyAgent(): LeadEnrichCompanyAgent {
  return LeadEnrichCompanyAgent.instance;
}

export function resetLeadEnrichCompanyAgentForTests(): void {
  LeadEnrichCompanyAgent.reset();
}
