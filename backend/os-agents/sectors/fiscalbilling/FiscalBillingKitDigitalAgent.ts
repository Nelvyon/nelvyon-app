import type { ILlmClient } from "../../LlmClient";
import type { FiscalBillingInput, FiscalBillingOutput } from "./shared";
import { getDefaultFiscalBillingLlm, runFiscalBillingAgentCore } from "./shared";

const AGENT_ID = "fiscalbilling-kit-digital";

export class FiscalBillingKitDigitalAgent {
  private static inst: FiscalBillingKitDigitalAgent | undefined;

  static get instance(): FiscalBillingKitDigitalAgent {
    if (!FiscalBillingKitDigitalAgent.inst) FiscalBillingKitDigitalAgent.inst = new FiscalBillingKitDigitalAgent();
    return FiscalBillingKitDigitalAgent.inst;
  }

  static reset(): void {
    FiscalBillingKitDigitalAgent.inst = undefined;
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
        eliteRole: "ROLE: Kit Digital Spain SME grants; alineación factura-subvención.",
        mission:
          "Genera factura o anexo con formato **Kit Digital** (España): solución de digitalización acreditada, **código expediente** si aplica, referencias al programa.",
        fewShotExample:
          '{"content":"Línea Kit Digital + expediente KD-2026-XXXX.","score":89,"highlights":["Solución digitalización","Código expediente"],"metrics":["ES Kit Digital"]}',
      },
      input,
      0.2,
    );
  }
}

export function getFiscalBillingKitDigitalAgent(): FiscalBillingKitDigitalAgent {
  return FiscalBillingKitDigitalAgent.instance;
}

export function resetFiscalBillingKitDigitalAgentForTests(): void {
  FiscalBillingKitDigitalAgent.reset();
}
