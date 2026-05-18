import type { ILlmClient } from "../../LlmClient";
import type { MultiCurrencyInput, MultiCurrencyOutput } from "./shared";
import { getDefaultMultiCurrencyLlm, runMultiCurrencyAgentCore } from "./shared";

const AGENT_ID = "multicurrency-pricing";

export class MultiCurrencyPricingAgent {
  private static inst: MultiCurrencyPricingAgent | undefined;

  static get instance(): MultiCurrencyPricingAgent {
    if (!MultiCurrencyPricingAgent.inst) MultiCurrencyPricingAgent.inst = new MultiCurrencyPricingAgent();
    return MultiCurrencyPricingAgent.inst;
  }

  static reset(): void {
    MultiCurrencyPricingAgent.inst = undefined;
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
        eliteRole: "ROLE: Pricing localizado; tabla Starter/Pro/Agency por moneda+país.",
        mission:
          "Genera tabla de precios localizada: Starter 47€, Pro 197€, Agency 497€ en EUR base con equivalentes por moneda y país; IVA/impuestos como nota orientativa.",
        fewShotExample:
          '{"content":"Tabla 3 filas x moneda MXN con enteros.","score":90,"highlights":["Starter 47 EUR equiv","Pro 197","Agency 497"],"metrics":["MXN entero"]}',
      },
      input,
      0.2,
    );
  }
}

export function getMultiCurrencyPricingAgent(): MultiCurrencyPricingAgent {
  return MultiCurrencyPricingAgent.instance;
}

export function resetMultiCurrencyPricingAgentForTests(): void {
  MultiCurrencyPricingAgent.reset();
}
