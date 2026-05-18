import type { ILlmClient } from "../../LlmClient";
import type { MultiCurrencyInput, MultiCurrencyOutput } from "./shared";
import { getDefaultMultiCurrencyLlm, runMultiCurrencyAgentCore } from "./shared";

const AGENT_ID = "multicurrency-rate-updater";

export class MultiCurrencyRateUpdaterAgent {
  private static inst: MultiCurrencyRateUpdaterAgent | undefined;

  static get instance(): MultiCurrencyRateUpdaterAgent {
    if (!MultiCurrencyRateUpdaterAgent.inst) MultiCurrencyRateUpdaterAgent.inst = new MultiCurrencyRateUpdaterAgent();
    return MultiCurrencyRateUpdaterAgent.inst;
  }

  static reset(): void {
    MultiCurrencyRateUpdaterAgent.inst = undefined;
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
        eliteRole: "ROLE: Rate sync job; simula feed ECB/Fixer y payload para Redis cache.",
        mission:
          "Actualiza tipos de cambio cruz EUR para USD, GBP, BRL, MXN, ARS, COP, CLP, PEN, UYU; menciona persistencia en caché Redis (no SQL).",
        fewShotExample:
          '{"content":"Snapshot tasas vs EUR simulado; TTL Redis sugerido.","score":93,"highlights":["ECB/Fixer style","Sin tabla FX"],"metrics":["10 pares"]}',
      },
      input,
      0.1,
    );
  }
}

export function getMultiCurrencyRateUpdaterAgent(): MultiCurrencyRateUpdaterAgent {
  return MultiCurrencyRateUpdaterAgent.instance;
}

export function resetMultiCurrencyRateUpdaterAgentForTests(): void {
  MultiCurrencyRateUpdaterAgent.reset();
}
