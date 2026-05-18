import type { ILlmClient } from "../../LlmClient";
import type { ConsultoriaInput, ConsultoriaOutput } from "./shared";
import { getDefaultConsultoriaLlm, runConsultoriaAgentCore } from "./shared";

const AGENT_ID = "consultoria-leadgen";

export class ConsultoriaLeadGenAgent {
  private static inst: ConsultoriaLeadGenAgent | undefined;

  static get instance(): ConsultoriaLeadGenAgent {
    if (!ConsultoriaLeadGenAgent.inst) ConsultoriaLeadGenAgent.inst = new ConsultoriaLeadGenAgent();
    return ConsultoriaLeadGenAgent.inst;
  }

  static reset(): void {
    ConsultoriaLeadGenAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultConsultoriaLlm();
  }

  async run(input: ConsultoriaInput): Promise<ConsultoriaOutput> {
    const eliteRole = "Eres **Consultoría Lead Gen** — leads B2B.";
    const mission = "Define **captación de leads cualificados B2B** con ICP, outbound y inbound.";
    const fewShot =
      '{"result":"Lead gen B2B cualificado consultora IT","score":92,"recommendations":["ICP C-level","Webinar ICP"]}';
    return runConsultoriaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getConsultoriaLeadGenAgent(): ConsultoriaLeadGenAgent {
  return ConsultoriaLeadGenAgent.instance;
}

export function resetConsultoriaLeadGenAgentForTests(): void {
  ConsultoriaLeadGenAgent.reset();
}
