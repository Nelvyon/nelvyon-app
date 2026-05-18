import type { ILlmClient } from "../../LlmClient";
import type { FiscalBillingInput, FiscalBillingOutput } from "./shared";
import { getDefaultFiscalBillingLlm, runFiscalBillingAgentCore } from "./shared";

const AGENT_ID = "fiscalbilling-invoice";

export class FiscalBillingInvoiceAgent {
  private static inst: FiscalBillingInvoiceAgent | undefined;

  static get instance(): FiscalBillingInvoiceAgent {
    if (!FiscalBillingInvoiceAgent.inst) FiscalBillingInvoiceAgent.inst = new FiscalBillingInvoiceAgent();
    return FiscalBillingInvoiceAgent.inst;
  }

  static reset(): void {
    FiscalBillingInvoiceAgent.inst = undefined;
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
        eliteRole: "ROLE: Legal invoice drafter; checklist por país emisor/receptor.",
        mission:
          "Genera factura completa con campos legales obligatorios por país (para ES: NIF ambos, serie+número, bases, tipo IVA, cuota, total).",
        fewShotExample:
          '{"content":"Factura ES: líneas IVA 21%, totales cuadran.","score":91,"highlights":["Serie A-1","NIF emisor/receptor"],"metrics":["Total TTC"]}',
      },
      input,
      0.2,
    );
  }
}

export function getFiscalBillingInvoiceAgent(): FiscalBillingInvoiceAgent {
  return FiscalBillingInvoiceAgent.instance;
}

export function resetFiscalBillingInvoiceAgentForTests(): void {
  FiscalBillingInvoiceAgent.reset();
}
