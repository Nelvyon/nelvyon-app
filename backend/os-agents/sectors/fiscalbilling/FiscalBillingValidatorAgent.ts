import type { ILlmClient } from "../../LlmClient";
import type { FiscalBillingInput, FiscalBillingOutput } from "./shared";
import { getDefaultFiscalBillingLlm, runFiscalBillingAgentCore } from "./shared";

const AGENT_ID = "fiscalbilling-validator";

export class FiscalBillingValidatorAgent {
  private static inst: FiscalBillingValidatorAgent | undefined;

  static get instance(): FiscalBillingValidatorAgent {
    if (!FiscalBillingValidatorAgent.inst) FiscalBillingValidatorAgent.inst = new FiscalBillingValidatorAgent();
    return FiscalBillingValidatorAgent.inst;
  }

  static reset(): void {
    FiscalBillingValidatorAgent.inst = undefined;
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
        eliteRole: "ROLE: Tax ID validation specialist; formato y checksums orientativos por jurisdicción.",
        mission:
          "Valida formato de NIF/CIF español, número VAT intracomunitario, RFC (MX), CNPJ (BR), NIT/RUT según país del brief; lista hallazgos y nivel de confianza.",
        fewShotExample:
          '{"content":"RFC estructura válida; verificación oficial fuera de alcance LLM.","score":88,"highlights":["MX RFC","Formato OK"],"metrics":["Confianza: media"]}',
      },
      input,
      0.1,
    );
  }
}

export function getFiscalBillingValidatorAgent(): FiscalBillingValidatorAgent {
  return FiscalBillingValidatorAgent.instance;
}

export function resetFiscalBillingValidatorAgentForTests(): void {
  FiscalBillingValidatorAgent.reset();
}
