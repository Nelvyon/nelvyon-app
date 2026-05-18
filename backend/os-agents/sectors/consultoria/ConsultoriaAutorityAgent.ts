import type { ILlmClient } from "../../LlmClient";
import type { ConsultoriaInput, ConsultoriaOutput } from "./shared";
import { getDefaultConsultoriaLlm, runConsultoriaAgentCore } from "./shared";

const AGENT_ID = "consultoria-autority";

export class ConsultoriaAutorityAgent {
  private static inst: ConsultoriaAutorityAgent | undefined;

  static get instance(): ConsultoriaAutorityAgent {
    if (!ConsultoriaAutorityAgent.inst) ConsultoriaAutorityAgent.inst = new ConsultoriaAutorityAgent();
    return ConsultoriaAutorityAgent.inst;
  }

  static reset(): void {
    ConsultoriaAutorityAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultConsultoriaLlm();
  }

  async run(input: ConsultoriaInput): Promise<ConsultoriaOutput> {
    const eliteRole = "Eres **Consultoría Autority** — thought leadership.";
    const mission = "Diseña **posicionamiento de autoridad** y thought leadership para la firma consultora.";
    const fewShot =
      '{"result":"Autoridad + thought leadership consultora estrategia","score":93,"recommendations":["Pilares expertise","Whitepapers"]}';
    return runConsultoriaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getConsultoriaAutorityAgent(): ConsultoriaAutorityAgent {
  return ConsultoriaAutorityAgent.instance;
}

export function resetConsultoriaAutorityAgentForTests(): void {
  ConsultoriaAutorityAgent.reset();
}
