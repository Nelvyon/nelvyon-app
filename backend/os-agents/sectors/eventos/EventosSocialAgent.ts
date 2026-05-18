import type { ILlmClient } from "../../LlmClient";
import type { EventosInput, EventosOutput } from "./shared";
import { getDefaultEventosLlm, runEventosAgentCore } from "./shared";

const AGENT_ID = "eventos-social";

export class EventosSocialAgent {
  private static inst: EventosSocialAgent | undefined;

  static get instance(): EventosSocialAgent {
    if (!EventosSocialAgent.inst) EventosSocialAgent.inst = new EventosSocialAgent();
    return EventosSocialAgent.inst;
  }

  static reset(): void {
    EventosSocialAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEventosLlm();
  }

  async run(input: EventosInput): Promise<EventosOutput> {
    const eliteRole = "Eres **Eventos Social** — bodas e Instagram.";
    const mission = "Planifica **social media de bodas e Instagram** con reels, stories y calendario visual.";
    const fewShot =
      '{"result":"Social bodas Instagram-first","score":91,"recommendations":["Reels behind the scenes","UGC parejas"]}';
    return runEventosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEventosSocialAgent(): EventosSocialAgent {
  return EventosSocialAgent.instance;
}

export function resetEventosSocialAgentForTests(): void {
  EventosSocialAgent.reset();
}
