import type { ILlmClient } from "../../LlmClient";
import type { PartnershipInput, PartnershipOutput } from "./shared";
import { getDefaultPartnershipLlm, runPartnershipAgentCore } from "./shared";

const AGENT_ID = "partnership-propuesta";

let inst: PartnershipPropuestaAgent | null = null;

export class PartnershipPropuestaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PartnershipPropuestaAgent {
    if (!inst) inst = new PartnershipPropuestaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPartnershipLlm();
  }

  async run(input: PartnershipInput): Promise<PartnershipOutput> {
    const eliteRole = "Eres **Partnership Propuesta** — colaboración personalizada y defendible.";
    const mission =
      "Redacta **propuesta de partnership** (objetivos, KPIs, gobernanza, exclusividades, anexos legales sugeridos).";
    const fewShot =
      '{"result":"1-pager + timeline 90d + riesgos mitigados","score":87,"recommendations":["Revisión legal","Clarificar IP","Exit clauses"]}';
    return runPartnershipAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPartnershipPropuestaAgent(): PartnershipPropuestaAgent {
  return PartnershipPropuestaAgent.instance();
}

export function resetPartnershipPropuestaAgentForTests(): void {
  inst = null;
}
