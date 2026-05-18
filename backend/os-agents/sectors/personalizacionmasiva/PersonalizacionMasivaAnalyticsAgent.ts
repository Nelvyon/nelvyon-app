import type { ILlmClient } from "../../LlmClient";
import type { PersonalizacionMasivaInput, PersonalizacionMasivaOutput } from "./shared";
import { getDefaultPersonalizacionMasivaLlm, runPersonalizacionMasivaAgentCore } from "./shared";

const AGENT_ID = "personalizacionmasiva-analytics";

export class PersonalizacionMasivaAnalyticsAgent {
  private static inst: PersonalizacionMasivaAnalyticsAgent | undefined;

  static get instance(): PersonalizacionMasivaAnalyticsAgent {
    if (!PersonalizacionMasivaAnalyticsAgent.inst)
      PersonalizacionMasivaAnalyticsAgent.inst = new PersonalizacionMasivaAnalyticsAgent();
    return PersonalizacionMasivaAnalyticsAgent.inst;
  }

  static reset(): void {
    PersonalizacionMasivaAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPersonalizacionMasivaLlm();
  }

  async run(input: PersonalizacionMasivaInput): Promise<PersonalizacionMasivaOutput> {
    const eliteRole = "Eres **PersonalizacionMasiva Analytics** — métricas de personalización.";
    const mission =
      "Mide **uplift por segmento**, resultados **A/B** y **ROI de personalización**; uplift mínimo **+35%** vs genérico.";
    const fewShot =
      '{"content":"Analytics personalización: uplift segmento, A/B, ROI, +35% vs genérico","score":93,"highlights":["+35% uplift","ROI"],"metrics":["Personalization ROI"]}';
    return runPersonalizacionMasivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getPersonalizacionMasivaAnalyticsAgent(): PersonalizacionMasivaAnalyticsAgent {
  return PersonalizacionMasivaAnalyticsAgent.instance;
}

export function resetPersonalizacionMasivaAnalyticsAgentForTests(): void {
  PersonalizacionMasivaAnalyticsAgent.reset();
}
