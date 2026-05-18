import type { ILlmClient } from "../../LlmClient";
import type { FiscalBillingInput, FiscalBillingOutput } from "./shared";
import { getDefaultFiscalBillingLlm, runFiscalBillingAgentCore } from "./shared";

const AGENT_ID = "fiscalbilling-reverse-charge";

export class FiscalBillingReverseChargeAgent {
  private static inst: FiscalBillingReverseChargeAgent | undefined;

  static get instance(): FiscalBillingReverseChargeAgent {
    if (!FiscalBillingReverseChargeAgent.inst) FiscalBillingReverseChargeAgent.inst = new FiscalBillingReverseChargeAgent();
    return FiscalBillingReverseChargeAgent.inst;
  }

  static reset(): void {
    FiscalBillingReverseChargeAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFiscalBillingLlm();
  }

  async run(input: FiscalBillingInput): Promise<FiscalBillingOutput> {
    return runFiscalBillingAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: EU B2B VAT specialist; art. 196 VAT Directive context.",
        mission:
          "Gestiona **reverse charge**: si cliente B2B UE con **VAT válido** → factura **sin IVA** con mención **Inversión del sujeto pasivo** (o equivalente legal aplicable).",
        fewShotExample:
          '{"content":"Factura B2B DE con VAT DE123… sin cuota IVA; cláusula ISP.","score":90,"highlights":["VAT OK","Sin IVA"],"metrics":["Reverse charge UE"]}',
      },
      input,
      0.2,
    );
  }
}

export function getFiscalBillingReverseChargeAgent(): FiscalBillingReverseChargeAgent {
  return FiscalBillingReverseChargeAgent.instance;
}

export function resetFiscalBillingReverseChargeAgentForTests(): void {
  FiscalBillingReverseChargeAgent.reset();
}
