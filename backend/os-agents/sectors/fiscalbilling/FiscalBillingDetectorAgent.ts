import type { ILlmClient } from "../../LlmClient";
import type { FiscalBillingInput, FiscalBillingOutput } from "./shared";
import { getDefaultFiscalBillingLlm, runFiscalBillingAgentCore } from "./shared";

const AGENT_ID = "fiscalbilling-detector";

export class FiscalBillingDetectorAgent {
  private static inst: FiscalBillingDetectorAgent | undefined;

  static get instance(): FiscalBillingDetectorAgent {
    if (!FiscalBillingDetectorAgent.inst) FiscalBillingDetectorAgent.inst = new FiscalBillingDetectorAgent();
    return FiscalBillingDetectorAgent.inst;
  }

  static reset(): void {
    FiscalBillingDetectorAgent.inst = undefined;
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
        eliteRole: "ROLE: Fiscal residence resolver; prioriza datos de alta vs dirección de facturación.",
        mission:
          "Detecta país fiscal del cliente y régimen impositivo aplicable (ES, FR, DE, GB, IT, PT, MX, BR, CO, AR, CL, PE) con justificación breve.",
        fewShotExample:
          '{"content":"Régimen general IVA ES por NIF y sede.","score":90,"highlights":["País=ES","Régimen general"],"metrics":["Código fiscal: ES"]}',
      },
      input,
      0.1,
    );
  }
}

export function getFiscalBillingDetectorAgent(): FiscalBillingDetectorAgent {
  return FiscalBillingDetectorAgent.instance;
}

export function resetFiscalBillingDetectorAgentForTests(): void {
  FiscalBillingDetectorAgent.reset();
}
