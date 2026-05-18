import type { ILlmClient } from "../../LlmClient";
import type { FiscalBillingInput, FiscalBillingOutput } from "./shared";
import { getDefaultFiscalBillingLlm, runFiscalBillingAgentCore } from "./shared";

const AGENT_ID = "fiscalbilling-report";

export class FiscalBillingReportAgent {
  private static inst: FiscalBillingReportAgent | undefined;

  static get instance(): FiscalBillingReportAgent {
    if (!FiscalBillingReportAgent.inst) FiscalBillingReportAgent.inst = new FiscalBillingReportAgent();
    return FiscalBillingReportAgent.inst;
  }

  static reset(): void {
    FiscalBillingReportAgent.inst = undefined;
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
        eliteRole: "ROLE: Monthly fiscal pack para contabilidad interna NELVYON.",
        mission:
          "Genera informe fiscal mensual **por país** para contabilidad: bases, impuestos devengados, rectificativas mencionadas, totales por jurisdicción.",
        fewShotExample:
          '{"content":"Resumen mensual ES+MX: bases y cuotas por tipo.","score":91,"highlights":["Por país","Mes cerrado"],"metrics":["Totales IVA"]}',
      },
      input,
      0.1,
    );
  }
}

export function getFiscalBillingReportAgent(): FiscalBillingReportAgent {
  return FiscalBillingReportAgent.instance;
}

export function resetFiscalBillingReportAgentForTests(): void {
  FiscalBillingReportAgent.reset();
}
