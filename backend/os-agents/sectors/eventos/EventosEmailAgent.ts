import type { ILlmClient } from "../../LlmClient";
import type { EventosInput, EventosOutput } from "./shared";
import { getDefaultEventosLlm, runEventosAgentCore } from "./shared";

const AGENT_ID = "eventos-email";

export class EventosEmailAgent {
  private static inst: EventosEmailAgent | undefined;

  static get instance(): EventosEmailAgent {
    if (!EventosEmailAgent.inst) EventosEmailAgent.inst = new EventosEmailAgent();
    return EventosEmailAgent.inst;
  }

  static reset(): void {
    EventosEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEventosLlm();
  }

  async run(input: EventosInput): Promise<EventosOutput> {
    const eliteRole = "Eres **Eventos Email** — campañas estacionales.";
    const mission = "Diseña **email marketing estacional** para bodas, temporadas altas y nurturing de leads.";
    const fewShot =
      '{"result":"Email estacional bodas + corporativos","score":90,"recommendations":["Secuencia temporada alta","Newsletter venues"]}';
    return runEventosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEventosEmailAgent(): EventosEmailAgent {
  return EventosEmailAgent.instance;
}

export function resetEventosEmailAgentForTests(): void {
  EventosEmailAgent.reset();
}
