import type { ILlmClient } from "../../LlmClient";
import type { MultiCurrencyInput, MultiCurrencyOutput } from "./shared";
import { getDefaultMultiCurrencyLlm, runMultiCurrencyAgentCore } from "./shared";

const AGENT_ID = "multicurrency-converter";

export class MultiCurrencyConverterAgent {
  private static inst: MultiCurrencyConverterAgent | undefined;

  static get instance(): MultiCurrencyConverterAgent {
    if (!MultiCurrencyConverterAgent.inst) MultiCurrencyConverterAgent.inst = new MultiCurrencyConverterAgent();
    return MultiCurrencyConverterAgent.inst;
  }

  static reset(): void {
    MultiCurrencyConverterAgent.inst = undefined;
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
        eliteRole: "ROLE: FX desk; tipos alineados feed ECB/Fixer simulado; redondeo según reglas NELVYON.",
        mission:
          "Convierte importes base EUR a moneda destino (USD, EUR, GBP, BRL, MXN, ARS, COP, CLP, PEN, UYU) en tiempo real; documenta tasa y redondeo (2 dec vs entero LATAM).",
        fewShotExample:
          '{"content":"47 EUR → 51.20 USD (tasa ilustrativa), LATAM en entero.","score":92,"highlights":["Base EUR=47","Target USD","2 dec"],"metrics":["Tasa ref: simulada"]}',
      },
      input,
      0.1,
    );
  }
}

export function getMultiCurrencyConverterAgent(): MultiCurrencyConverterAgent {
  return MultiCurrencyConverterAgent.instance;
}

export function resetMultiCurrencyConverterAgentForTests(): void {
  MultiCurrencyConverterAgent.reset();
}
