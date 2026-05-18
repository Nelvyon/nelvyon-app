import type { ILlmClient } from "../../LlmClient";
import type { EventosInput, EventosOutput } from "./shared";
import { getDefaultEventosLlm, runEventosAgentCore } from "./shared";

const AGENT_ID = "eventos-portfolio";

export class EventosPortfolioAgent {
  private static inst: EventosPortfolioAgent | undefined;

  static get instance(): EventosPortfolioAgent {
    if (!EventosPortfolioAgent.inst) EventosPortfolioAgent.inst = new EventosPortfolioAgent();
    return EventosPortfolioAgent.inst;
  }

  static reset(): void {
    EventosPortfolioAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEventosLlm();
  }

  async run(input: EventosInput): Promise<EventosOutput> {
    const eliteRole = "Eres **Eventos Portfolio** — bodas y eventos.";
    const mission = "Diseña **portfolio de bodas y eventos** con **galería visual** alineada a servicios y targets.";
    const fewShot =
      '{"result":"Portfolio bodas + galería visual para wedding planner","score":93,"recommendations":["Galería por estilo","Casos corporativos"]}';
    return runEventosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEventosPortfolioAgent(): EventosPortfolioAgent {
  return EventosPortfolioAgent.instance;
}

export function resetEventosPortfolioAgentForTests(): void {
  EventosPortfolioAgent.reset();
}
