import type { ILlmClient } from "../../LlmClient";
import type { EventosInput, EventosOutput } from "./shared";
import { getDefaultEventosLlm, runEventosAgentCore } from "./shared";

const AGENT_ID = "eventos-precios";

export class EventosPreciosAgent {
  private static inst: EventosPreciosAgent | undefined;

  static get instance(): EventosPreciosAgent {
    if (!EventosPreciosAgent.inst) EventosPreciosAgent.inst = new EventosPreciosAgent();
    return EventosPreciosAgent.inst;
  }

  static reset(): void {
    EventosPreciosAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEventosLlm();
  }

  async run(input: EventosInput): Promise<EventosOutput> {
    const eliteRole = "Eres **Eventos Precios** — paquetes y pricing.";
    const mission = "Estructura **paquetes y pricing de eventos** con upsells, temporadas y márgenes.";
    const fewShot =
      '{"result":"Paquetes boda + pricing catering","score":90,"recommendations":["Tiers por invitados","Upsell DJ"]}';
    return runEventosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEventosPreciosAgent(): EventosPreciosAgent {
  return EventosPreciosAgent.instance;
}

export function resetEventosPreciosAgentForTests(): void {
  EventosPreciosAgent.reset();
}
