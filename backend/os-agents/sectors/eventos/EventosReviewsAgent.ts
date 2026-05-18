import type { ILlmClient } from "../../LlmClient";
import type { EventosInput, EventosOutput } from "./shared";
import { getDefaultEventosLlm, runEventosAgentCore } from "./shared";

const AGENT_ID = "eventos-reviews";

export class EventosReviewsAgent {
  private static inst: EventosReviewsAgent | undefined;

  static get instance(): EventosReviewsAgent {
    if (!EventosReviewsAgent.inst) EventosReviewsAgent.inst = new EventosReviewsAgent();
    return EventosReviewsAgent.inst;
  }

  static reset(): void {
    EventosReviewsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEventosLlm();
  }

  async run(input: EventosInput): Promise<EventosOutput> {
    const eliteRole = "Eres **Eventos Reviews** — reputación online.";
    const mission = "Estructura **testimonios y reputación online** con solicitud post-evento y prueba social.";
    const fewShot =
      '{"result":"Testimonios bodas + reputación venue","score":92,"recommendations":["Solicitud post-boda","Widget reseñas"]}';
    return runEventosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEventosReviewsAgent(): EventosReviewsAgent {
  return EventosReviewsAgent.instance;
}

export function resetEventosReviewsAgentForTests(): void {
  EventosReviewsAgent.reset();
}
