import type { ILlmClient } from "../../LlmClient";
import type { SegurosInput, SegurosOutput } from "./shared";
import { getDefaultSegurosLlm, runSegurosAgentCore } from "./shared";

const AGENT_ID = "seguros-analytics";

let inst: SegurosAnalyticsAgent | null = null;

export class SegurosAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SegurosAnalyticsAgent {
    if (!inst) inst = new SegurosAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSegurosLlm();
  }

  async run(input: SegurosInput): Promise<SegurosOutput> {
    const eliteRole = "Eres **Seguros Analytics** — conversión, LTV y siniestralidad.";
    const mission =
      "Diseña **analytics de conversión**, **LTV por ramo** y lectura de **ratio siniestros** a nivel agregado (KPIs, cohortes).";
    const fewShot =
      '{"result":"Dashboard LTV por canal y ramo","score":92,"recommendations":["Cohort renovación","Loss ratio agregado"]}';
    return runSegurosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSegurosAnalyticsAgent(): SegurosAnalyticsAgent {
  return SegurosAnalyticsAgent.instance();
}

export function resetSegurosAnalyticsAgentForTests(): void {
  inst = null;
}
