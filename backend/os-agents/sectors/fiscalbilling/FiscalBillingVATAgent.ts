import type { ILlmClient } from "../../LlmClient";
import type { FiscalBillingInput, FiscalBillingOutput } from "./shared";
import { getDefaultFiscalBillingLlm, runFiscalBillingAgentCore } from "./shared";

const AGENT_ID = "fiscalbilling-vat";

export class FiscalBillingVATAgent {
  private static inst: FiscalBillingVATAgent | undefined;

  static get instance(): FiscalBillingVATAgent {
    if (!FiscalBillingVATAgent.inst) FiscalBillingVATAgent.inst = new FiscalBillingVATAgent();
    return FiscalBillingVATAgent.inst;
  }

  static reset(): void {
    FiscalBillingVATAgent.inst = undefined;
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
        eliteRole: "ROLE: Indirect tax engine; tipos orientativos por país y producto SaaS.",
        mission:
          "Calcula IVA/VAT/GST según país: ES 21%, UK 20%, BR ~17% contexto, MX 16%, etc.; desglosa base, tipo y cuota.",
        fewShotExample:
          '{"content":"IVA 21% ES sobre base 100€ → cuota 21€.","score":92,"highlights":["Tipo estándar ES","SaaS B2B nota"],"metrics":["Cuota IVA=21"]}',
      },
      input,
      0.1,
    );
  }
}

export function getFiscalBillingVATAgent(): FiscalBillingVATAgent {
  return FiscalBillingVATAgent.instance;
}

export function resetFiscalBillingVATAgentForTests(): void {
  FiscalBillingVATAgent.reset();
}
