import type { ILlmClient } from "../../LlmClient";
import type { MultiCurrencyInput, MultiCurrencyOutput } from "./shared";
import { getDefaultMultiCurrencyLlm, runMultiCurrencyAgentCore } from "./shared";

const AGENT_ID = "multicurrency-risk";

export class MultiCurrencyRiskAgent {
  private static inst: MultiCurrencyRiskAgent | undefined;

  static get instance(): MultiCurrencyRiskAgent {
    if (!MultiCurrencyRiskAgent.inst) MultiCurrencyRiskAgent.inst = new MultiCurrencyRiskAgent();
    return MultiCurrencyRiskAgent.inst;
  }

  static reset(): void {
    MultiCurrencyRiskAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultiCurrencyLlm();
  }

  async run(input: MultiCurrencyInput): Promise<MultiCurrencyOutput> {
    return runMultiCurrencyAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Treasury risk; foco ARS, VES y correlatos volátiles.",
        mission:
          "Detecta riesgo de volatilidad de tipo de cambio; para ARS/VES u similares emite alerta y recomienda **cobro en USD** u hedge orientativo.",
        fewShotExample:
          '{"content":"Alerta ARS: alta volatilidad; recomendar facturación USD.","score":85,"highlights":["ARS/VES","USD cobro"],"metrics":["Severity high"]}',
      },
      input,
      0.1,
    );
  }
}

export function getMultiCurrencyRiskAgent(): MultiCurrencyRiskAgent {
  return MultiCurrencyRiskAgent.instance;
}

export function resetMultiCurrencyRiskAgentForTests(): void {
  MultiCurrencyRiskAgent.reset();
}
