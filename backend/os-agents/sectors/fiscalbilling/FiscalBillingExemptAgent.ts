import type { ILlmClient } from "../../LlmClient";
import type { FiscalBillingInput, FiscalBillingOutput } from "./shared";
import { getDefaultFiscalBillingLlm, runFiscalBillingAgentCore } from "./shared";

const AGENT_ID = "fiscalbilling-exempt";

export class FiscalBillingExemptAgent {
  private static inst: FiscalBillingExemptAgent | undefined;

  static get instance(): FiscalBillingExemptAgent {
    if (!FiscalBillingExemptAgent.inst) FiscalBillingExemptAgent.inst = new FiscalBillingExemptAgent();
    return FiscalBillingExemptAgent.inst;
  }

  static reset(): void {
    FiscalBillingExemptAgent.inst = undefined;
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
        eliteRole: "ROLE: Exemption analyst; documentación requerida por supuesto.",
        mission:
          "Detecta y aplica exenciones posibles: autónomos en módulos, ONG acreditadas, exportación de servicios u otros; indica artículo/norma orientativa y advertencias.",
        fewShotExample:
          '{"content":"Posible exención exportación servicio fuera UE según condiciones.","score":84,"highlights":["Export","Prueba documental"],"metrics":["Revisar asesor"]}',
      },
      input,
      0.1,
    );
  }
}

export function getFiscalBillingExemptAgent(): FiscalBillingExemptAgent {
  return FiscalBillingExemptAgent.instance;
}

export function resetFiscalBillingExemptAgentForTests(): void {
  FiscalBillingExemptAgent.reset();
}
