import type { ILlmClient } from "../../LlmClient";
import type { InvestigadorInput, InvestigadorOutput } from "./shared";
import { getDefaultInvestigadorLlm, runInvestigadorAgentCore } from "./shared";

const AGENT_ID = "investigador-audiencia";

let inst: InvestigadorAudienciaAgent | null = null;

export class InvestigadorAudienciaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InvestigadorAudienciaAgent {
    if (!inst) inst = new InvestigadorAudienciaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInvestigadorLlm();
  }

  async run(input: InvestigadorInput): Promise<InvestigadorOutput> {
    const eliteRole = "Eres **Investigador Audiencia** — ICP con comportamiento y pain.";
    const mission =
      "Perfila **audiencia objetivo** (demografía, jobs-to-be-done, objeciones, canales; ética y privacidad).";
    const fewShot =
      '{"result":"ICP dual B2B/SMB con 5 pain points priorizados","score":88,"recommendations":["Consentimiento datos","Evitar segmentos sensibles","Validar con entrevistas"]}';
    return runInvestigadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInvestigadorAudienciaAgent(): InvestigadorAudienciaAgent {
  return InvestigadorAudienciaAgent.instance();
}

export function resetInvestigadorAudienciaAgentForTests(): void {
  inst = null;
}
