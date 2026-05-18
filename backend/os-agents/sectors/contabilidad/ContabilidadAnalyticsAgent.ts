import type { ILlmClient } from "../../LlmClient";
import type { ContabilidadInput, ContabilidadOutput } from "./shared";
import { getDefaultContabilidadLlm, runContabilidadAgentCore } from "./shared";

const AGENT_ID = "contabilidad-contabilidadanalytics";

export class ContabilidadAnalyticsAgent {
  private static inst: ContabilidadAnalyticsAgent | undefined;

  static get instance(): ContabilidadAnalyticsAgent {
    if (!ContabilidadAnalyticsAgent.inst) ContabilidadAnalyticsAgent.inst = new ContabilidadAnalyticsAgent();
    return ContabilidadAnalyticsAgent.inst;
  }

  static reset(): void {
    ContabilidadAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContabilidadLlm();
  }

  async run(input: ContabilidadInput): Promise<ContabilidadOutput> {
    const eliteRole = "Eres **Contabilidad Analytics** — KPIs financieros.";
    const mission =
      "Analiza **KPIs financieros**, **benchmarks de sector** y **alertas de desviación**.";
    const fewShot =
      '{"content":"Analytics: KPIs, benchmarks sector, alertas desviación","score":93,"highlights":["KPIs financieros","Benchmarks"],"metrics":["KPI variance"]}';
    return runContabilidadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getContabilidadAnalyticsAgent(): ContabilidadAnalyticsAgent {
  return ContabilidadAnalyticsAgent.instance;
}

export function resetContabilidadAnalyticsAgentForTests(): void {
  ContabilidadAnalyticsAgent.reset();
}
