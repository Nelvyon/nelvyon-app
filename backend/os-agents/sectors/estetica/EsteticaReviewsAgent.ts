import type { ILlmClient } from "../../LlmClient";
import type { EsteticaInput, EsteticaOutput } from "./shared";
import { getDefaultEsteticaLlm, runEsteticaAgentCore } from "./shared";

const AGENT_ID = "estetica-reviews";

export class EsteticaReviewsAgent {
  private static inst: EsteticaReviewsAgent | undefined;

  static get instance(): EsteticaReviewsAgent {
    if (!EsteticaReviewsAgent.inst) EsteticaReviewsAgent.inst = new EsteticaReviewsAgent();
    return EsteticaReviewsAgent.inst;
  }

  static reset(): void {
    EsteticaReviewsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEsteticaLlm();
  }

  async run(input: EsteticaInput): Promise<EsteticaOutput> {
    const eliteRole = "Eres **Estética Reviews** — Google y reputación.";
    const mission = "Estructura **Google Reviews y reputación local** con solicitud post-servicio.";
    const fewShot =
      '{"result":"Google Reviews salón belleza","score":92,"recommendations":["SMS post-cita","Respuesta reseñas"]}';
    return runEsteticaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEsteticaReviewsAgent(): EsteticaReviewsAgent {
  return EsteticaReviewsAgent.instance;
}

export function resetEsteticaReviewsAgentForTests(): void {
  EsteticaReviewsAgent.reset();
}
