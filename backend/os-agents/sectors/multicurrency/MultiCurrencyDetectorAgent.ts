import type { ILlmClient } from "../../LlmClient";
import type { MultiCurrencyInput, MultiCurrencyOutput } from "./shared";
import { getDefaultMultiCurrencyLlm, runMultiCurrencyAgentCore } from "./shared";

const AGENT_ID = "multicurrency-detector";

export class MultiCurrencyDetectorAgent {
  private static inst: MultiCurrencyDetectorAgent | undefined;

  static get instance(): MultiCurrencyDetectorAgent {
    if (!MultiCurrencyDetectorAgent.inst) MultiCurrencyDetectorAgent.inst = new MultiCurrencyDetectorAgent();
    return MultiCurrencyDetectorAgent.inst;
  }

  static reset(): void {
    MultiCurrencyDetectorAgent.inst = undefined;
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
        eliteRole: "ROLE: Geolocalización comercial; prioridad preferencia usuario > país > señal IP.",
        mission:
          "Detecta moneda de facturación probable (EUR, USD, GBP, BRL, MXN, ARS, COP, CLP, PEN, UYU) usando IP/país/preferencia; explica desempate.",
        fewShotExample:
          '{"content":"Moneda sugerida USD por país US + preferencia vacía.","score":88,"highlights":["País=US","Fallback IP coherente"],"metrics":["Código moneda: USD"]}',
      },
      input,
      0.1,
    );
  }
}

export function getMultiCurrencyDetectorAgent(): MultiCurrencyDetectorAgent {
  return MultiCurrencyDetectorAgent.instance;
}

export function resetMultiCurrencyDetectorAgentForTests(): void {
  MultiCurrencyDetectorAgent.reset();
}
