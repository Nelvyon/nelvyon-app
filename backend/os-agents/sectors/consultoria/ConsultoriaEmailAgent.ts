import type { ILlmClient } from "../../LlmClient";
import type { ConsultoriaInput, ConsultoriaOutput } from "./shared";
import { getDefaultConsultoriaLlm, runConsultoriaAgentCore } from "./shared";

const AGENT_ID = "consultoria-email";

export class ConsultoriaEmailAgent {
  private static inst: ConsultoriaEmailAgent | undefined;

  static get instance(): ConsultoriaEmailAgent {
    if (!ConsultoriaEmailAgent.inst) ConsultoriaEmailAgent.inst = new ConsultoriaEmailAgent();
    return ConsultoriaEmailAgent.inst;
  }

  static reset(): void {
    ConsultoriaEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultConsultoriaLlm();
  }

  async run(input: ConsultoriaInput): Promise<ConsultoriaOutput> {
    const eliteRole = "Eres **Consultoría Email** — nurturing y propuestas.";
    const mission = "Diseña **email nurturing** y **seguimiento de propuestas** comerciales.";
    const fewShot =
      '{"result":"Email nurturing + seguimiento propuestas","score":90,"recommendations":["Secuencia post-propuesta","Reactivación leads"]}';
    return runConsultoriaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getConsultoriaEmailAgent(): ConsultoriaEmailAgent {
  return ConsultoriaEmailAgent.instance;
}

export function resetConsultoriaEmailAgentForTests(): void {
  ConsultoriaEmailAgent.reset();
}
