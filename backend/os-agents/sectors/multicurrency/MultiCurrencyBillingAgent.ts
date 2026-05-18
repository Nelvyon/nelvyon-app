import type { ILlmClient } from "../../LlmClient";
import type { MultiCurrencyInput, MultiCurrencyOutput } from "./shared";
import { getDefaultMultiCurrencyLlm, runMultiCurrencyAgentCore } from "./shared";

const AGENT_ID = "multicurrency-billing";

export class MultiCurrencyBillingAgent {
  private static inst: MultiCurrencyBillingAgent | undefined;

  static get instance(): MultiCurrencyBillingAgent {
    if (!MultiCurrencyBillingAgent.inst) MultiCurrencyBillingAgent.inst = new MultiCurrencyBillingAgent();
    return MultiCurrencyBillingAgent.inst;
  }

  static reset(): void {
    MultiCurrencyBillingAgent.inst = undefined;
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
        eliteRole: "ROLE: Facturación multinacional; moneda del cliente, líneas imponible/exento nota.",
        mission:
          "Genera borrador de factura en la moneda del cliente con líneas Starter/Pro/Agency localizadas y totales redondeados según reglas.",
        fewShotExample:
          '{"content":"Factura en GBP 2 dec; referencia plan Pro.","score":89,"highlights":["Moneda cliente","IVA nota"],"metrics":["Total redondeado"]}',
      },
      input,
      0.2,
    );
  }
}

export function getMultiCurrencyBillingAgent(): MultiCurrencyBillingAgent {
  return MultiCurrencyBillingAgent.instance;
}

export function resetMultiCurrencyBillingAgentForTests(): void {
  MultiCurrencyBillingAgent.reset();
}
