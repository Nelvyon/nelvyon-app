import type { ILlmClient } from "../../LlmClient";
import type { EventosInput, EventosOutput } from "./shared";
import { getDefaultEventosLlm, runEventosAgentCore } from "./shared";

const AGENT_ID = "eventos-clientes";

export class EventosClientesAgent {
  private static inst: EventosClientesAgent | undefined;

  static get instance(): EventosClientesAgent {
    if (!EventosClientesAgent.inst) EventosClientesAgent.inst = new EventosClientesAgent();
    return EventosClientesAgent.inst;
  }

  static reset(): void {
    EventosClientesAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEventosLlm();
  }

  async run(input: EventosInput): Promise<EventosOutput> {
    const eliteRole = "Eres **Eventos Clientes** — captación premium.";
    const mission = "Define **captación de parejas y clientes corporativos** con embudos y propuestas de valor.";
    const fewShot =
      '{"result":"Captación parejas + corporativos para venue","score":91,"recommendations":["Lead magnet boda","Paquete corporativo"]}';
    return runEventosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEventosClientesAgent(): EventosClientesAgent {
  return EventosClientesAgent.instance;
}

export function resetEventosClientesAgentForTests(): void {
  EventosClientesAgent.reset();
}
