import type { ILlmClient } from "../../LlmClient";
import type { MultiCurrencyInput, MultiCurrencyOutput } from "./shared";
import { getDefaultMultiCurrencyLlm, runMultiCurrencyAgentCore } from "./shared";

const AGENT_ID = "multicurrency-display";

export class MultiCurrencyDisplayAgent {
  private static inst: MultiCurrencyDisplayAgent | undefined;

  static get instance(): MultiCurrencyDisplayAgent {
    if (!MultiCurrencyDisplayAgent.inst) MultiCurrencyDisplayAgent.inst = new MultiCurrencyDisplayAgent();
    return MultiCurrencyDisplayAgent.inst;
  }

  static reset(): void {
    MultiCurrencyDisplayAgent.inst = undefined;
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
        eliteRole: "ROLE: Intl formatter; símbolo, separadores miles/decimales, locale-aware.",
        mission:
          "Formatea montos según locale y moneda (símbolo correcto, grouping, decimales EUR/USD/GBP vs enteros LATAM).",
        fewShotExample:
          '{"content":"1.234,56 € vs $1,234.56 según es-ES vs en-US.","score":91,"highlights":["Locale es-MX","Enteros CLP"],"metrics":["Intl.NumberFormat"]}',
      },
      input,
      0.2,
    );
  }
}

export function getMultiCurrencyDisplayAgent(): MultiCurrencyDisplayAgent {
  return MultiCurrencyDisplayAgent.instance;
}

export function resetMultiCurrencyDisplayAgentForTests(): void {
  MultiCurrencyDisplayAgent.reset();
}
