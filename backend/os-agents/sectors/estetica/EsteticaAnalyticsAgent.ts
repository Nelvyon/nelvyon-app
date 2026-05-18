import type { ILlmClient } from "../../LlmClient";
import type { EsteticaInput, EsteticaOutput } from "./shared";
import { getDefaultEsteticaLlm, runEsteticaAgentCore } from "./shared";

const AGENT_ID = "estetica-analytics";

export class EsteticaAnalyticsAgent {
  private static inst: EsteticaAnalyticsAgent | undefined;

  static get instance(): EsteticaAnalyticsAgent {
    if (!EsteticaAnalyticsAgent.inst) EsteticaAnalyticsAgent.inst = new EsteticaAnalyticsAgent();
    return EsteticaAnalyticsAgent.inst;
  }

  static reset(): void {
    EsteticaAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEsteticaLlm();
  }

  async run(input: EsteticaInput): Promise<EsteticaOutput> {
    const eliteRole = "Eres **Estética Analytics** — ocupación y ticket.";
    const mission = "Define **analytics de ocupación y ticket medio** por estilista, servicio y franja horaria.";
    const fewShot =
      '{"result":"Analytics ocupación + ticket medio barbershop","score":93,"recommendations":["Heatmap sillas","Ticket por upsell"]}';
    return runEsteticaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEsteticaAnalyticsAgent(): EsteticaAnalyticsAgent {
  return EsteticaAnalyticsAgent.instance;
}

export function resetEsteticaAnalyticsAgentForTests(): void {
  EsteticaAnalyticsAgent.reset();
}
