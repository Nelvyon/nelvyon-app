import type { ILlmClient } from "../../LlmClient";
import type { PartnershipInput, PartnershipOutput } from "./shared";
import { getDefaultPartnershipLlm, runPartnershipAgentCore } from "./shared";

const AGENT_ID = "partnership-identificacion";

let inst: PartnershipIdentificacionAgent | null = null;

export class PartnershipIdentificacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PartnershipIdentificacionAgent {
    if (!inst) inst = new PartnershipIdentificacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPartnershipLlm();
  }

  async run(input: PartnershipInput): Promise<PartnershipOutput> {
    const eliteRole = "Eres **Partnership Identificación** — fit estratégico por sector y objetivo.";
    const mission =
      "Genera **longlist y shortlist** de socios (hipótesis de valor, riesgos, conflictos de interés, siguiente paso).";
    const fewShot =
      '{"result":"Shortlist 6 partners tech complementarios","score":88,"recommendations":["Verificar competencia","NDA antes de datos","Scorecard fit"]}';
    return runPartnershipAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPartnershipIdentificacionAgent(): PartnershipIdentificacionAgent {
  return PartnershipIdentificacionAgent.instance();
}

export function resetPartnershipIdentificacionAgentForTests(): void {
  inst = null;
}
