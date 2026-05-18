import type { ILlmClient } from "../../LlmClient";
import type { ConsultoriaInput, ConsultoriaOutput } from "./shared";
import { getDefaultConsultoriaLlm, runConsultoriaAgentCore } from "./shared";

const AGENT_ID = "consultoria-reviews";

export class ConsultoriaReviewsAgent {
  private static inst: ConsultoriaReviewsAgent | undefined;

  static get instance(): ConsultoriaReviewsAgent {
    if (!ConsultoriaReviewsAgent.inst) ConsultoriaReviewsAgent.inst = new ConsultoriaReviewsAgent();
    return ConsultoriaReviewsAgent.inst;
  }

  static reset(): void {
    ConsultoriaReviewsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultConsultoriaLlm();
  }

  async run(input: ConsultoriaInput): Promise<ConsultoriaOutput> {
    const eliteRole = "Eres **Consultoría Reviews** — testimonios y casos.";
    const mission = "Estructura **testimonios y casos de éxito** con métricas y narrativa ejecutiva.";
    const fewShot =
      '{"result":"Testimonios + casos éxito consultora financiera","score":92,"recommendations":["Case study ROI","Quotes C-level"]}';
    return runConsultoriaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getConsultoriaReviewsAgent(): ConsultoriaReviewsAgent {
  return ConsultoriaReviewsAgent.instance;
}

export function resetConsultoriaReviewsAgentForTests(): void {
  ConsultoriaReviewsAgent.reset();
}
