import type { ILlmClient } from "../../LlmClient";
import type { EventosInput, EventosOutput } from "./shared";
import { getDefaultEventosLlm, runEventosAgentCore } from "./shared";

const AGENT_ID = "eventos-analytics";

export class EventosAnalyticsAgent {
  private static inst: EventosAnalyticsAgent | undefined;

  static get instance(): EventosAnalyticsAgent {
    if (!EventosAnalyticsAgent.inst) EventosAnalyticsAgent.inst = new EventosAnalyticsAgent();
    return EventosAnalyticsAgent.inst;
  }

  static reset(): void {
    EventosAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEventosLlm();
  }

  async run(input: EventosInput): Promise<EventosOutput> {
    const eliteRole = "Eres **Eventos Analytics** — conversiones y leads.";
    const mission = "Define **analytics de conversiones y leads** para embudos de bodas y eventos corporativos.";
    const fewShot =
      '{"result":"Analytics leads bodas + corporativos","score":93,"recommendations":["KPI CPL","Atribución consultas"]}';
    return runEventosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEventosAnalyticsAgent(): EventosAnalyticsAgent {
  return EventosAnalyticsAgent.instance;
}

export function resetEventosAnalyticsAgentForTests(): void {
  EventosAnalyticsAgent.reset();
}
