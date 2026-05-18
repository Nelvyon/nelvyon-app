import type { ILlmClient } from "../../LlmClient";
import type { EventosInput, EventosOutput } from "./shared";
import { getDefaultEventosLlm, runEventosAgentCore } from "./shared";

const AGENT_ID = "eventos-seo";

export class EventosSEOAgent {
  private static inst: EventosSEOAgent | undefined;

  static get instance(): EventosSEOAgent {
    if (!EventosSEOAgent.inst) EventosSEOAgent.inst = new EventosSEOAgent();
    return EventosSEOAgent.inst;
  }

  static reset(): void {
    EventosSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEventosLlm();
  }

  async run(input: EventosInput): Promise<EventosOutput> {
    const eliteRole = "Eres **Eventos SEO** — visibilidad local.";
    const mission = "Diseña **SEO local para planificadores de eventos** con keywords de boda y venue.";
    const fewShot =
      '{"result":"SEO local wedding planner + venue","score":92,"recommendations":["Google Business","Landings por ciudad"]}';
    return runEventosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEventosSEOAgent(): EventosSEOAgent {
  return EventosSEOAgent.instance;
}

export function resetEventosSEOAgentForTests(): void {
  EventosSEOAgent.reset();
}
