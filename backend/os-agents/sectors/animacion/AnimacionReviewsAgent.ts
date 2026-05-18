import type { ILlmClient } from "../../LlmClient";
import type { AnimacionInput, AnimacionOutput } from "./shared";
import { getDefaultAnimacionLlm, runAnimacionAgentCore } from "./shared";

const AGENT_ID = "animacion-reviews";

export class AnimacionReviewsAgent {
  private static inst: AnimacionReviewsAgent | undefined;

  static get instance(): AnimacionReviewsAgent {
    if (!AnimacionReviewsAgent.inst) AnimacionReviewsAgent.inst = new AnimacionReviewsAgent();
    return AnimacionReviewsAgent.inst;
  }

  static reset(): void {
    AnimacionReviewsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAnimacionLlm();
  }

  async run(input: AnimacionInput): Promise<AnimacionOutput> {
    const eliteRole = "Eres **Animación Reviews** — casos visuales.";
    const mission = "Estructura **testimonios y casos de éxito visuales** con antes/después y métricas.";
    const fewShot =
      '{"result":"Testimonios + casos visuales CGI","score":92,"recommendations":["Case study spot","Quotes CD"]}';
    return runAnimacionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAnimacionReviewsAgent(): AnimacionReviewsAgent {
  return AnimacionReviewsAgent.instance;
}

export function resetAnimacionReviewsAgentForTests(): void {
  AnimacionReviewsAgent.reset();
}
