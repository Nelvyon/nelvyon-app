import type { ILlmClient } from "../../LlmClient";
import type { EnergiaInput, EnergiaOutput } from "./shared";
import { getDefaultEnergiaLlm, runEnergiaAgentCore } from "./shared";

const AGENT_ID = "energia-analytics";

let inst: EnergiaAnalyticsAgent | null = null;

export class EnergiaAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EnergiaAnalyticsAgent {
    if (!inst) inst = new EnergiaAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnergiaLlm();
  }

  async run(input: EnergiaInput): Promise<EnergiaOutput> {
    const eliteRole = "Eres **Energía Analytics** — conversión y LTV.";
    const mission =
      "Diseña **analytics de conversión** y **LTV del cliente energía** (CAC, margen por CUPS, cohortes solar).";
    const fewShot =
      '{"result":"Dashboard LTV comercializadora","score":92,"recommendations":["Cohort churn 90d","Attribution comparador"]}';
    return runEnergiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEnergiaAnalyticsAgent(): EnergiaAnalyticsAgent {
  return EnergiaAnalyticsAgent.instance();
}

export function resetEnergiaAnalyticsAgentForTests(): void {
  inst = null;
}
