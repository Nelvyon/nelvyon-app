import type { ILlmClient } from "../../LlmClient";
import type { ConsultoriaInput, ConsultoriaOutput } from "./shared";
import { getDefaultConsultoriaLlm, runConsultoriaAgentCore } from "./shared";

const AGENT_ID = "consultoria-analytics";

export class ConsultoriaAnalyticsAgent {
  private static inst: ConsultoriaAnalyticsAgent | undefined;

  static get instance(): ConsultoriaAnalyticsAgent {
    if (!ConsultoriaAnalyticsAgent.inst) ConsultoriaAnalyticsAgent.inst = new ConsultoriaAnalyticsAgent();
    return ConsultoriaAnalyticsAgent.inst;
  }

  static reset(): void {
    ConsultoriaAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultConsultoriaLlm();
  }

  async run(input: ConsultoriaInput): Promise<ConsultoriaOutput> {
    const eliteRole = "Eres **Consultoría Analytics** — pipeline y cierre.";
    const mission = "Define **analytics de pipeline** y **tasa de cierre** por servicio y segmento.";
    const fewShot =
      '{"result":"Analytics pipeline + tasa cierre consulting","score":93,"recommendations":["Funnel propuesta","Win rate por vertical"]}';
    return runConsultoriaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getConsultoriaAnalyticsAgent(): ConsultoriaAnalyticsAgent {
  return ConsultoriaAnalyticsAgent.instance;
}

export function resetConsultoriaAnalyticsAgentForTests(): void {
  ConsultoriaAnalyticsAgent.reset();
}
