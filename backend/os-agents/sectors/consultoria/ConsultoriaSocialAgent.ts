import type { ILlmClient } from "../../LlmClient";
import type { ConsultoriaInput, ConsultoriaOutput } from "./shared";
import { getDefaultConsultoriaLlm, runConsultoriaAgentCore } from "./shared";

const AGENT_ID = "consultoria-social";

export class ConsultoriaSocialAgent {
  private static inst: ConsultoriaSocialAgent | undefined;

  static get instance(): ConsultoriaSocialAgent {
    if (!ConsultoriaSocialAgent.inst) ConsultoriaSocialAgent.inst = new ConsultoriaSocialAgent();
    return ConsultoriaSocialAgent.inst;
  }

  static reset(): void {
    ConsultoriaSocialAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultConsultoriaLlm();
  }

  async run(input: ConsultoriaInput): Promise<ConsultoriaOutput> {
    const eliteRole = "Eres **Consultoría Social** — LinkedIn y newsletter.";
    const mission = "Planifica **LinkedIn orgánico + newsletter profesional** para partners y consultores.";
    const fewShot =
      '{"result":"LinkedIn orgánico + newsletter consultoría","score":91,"recommendations":["Calendario partners","Newsletter mensual"]}';
    return runConsultoriaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getConsultoriaSocialAgent(): ConsultoriaSocialAgent {
  return ConsultoriaSocialAgent.instance;
}

export function resetConsultoriaSocialAgentForTests(): void {
  ConsultoriaSocialAgent.reset();
}
