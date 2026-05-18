import type { ILlmClient } from "../../LlmClient";
import type { ContabilidadInput, ContabilidadOutput } from "./shared";
import { getDefaultContabilidadLlm, runContabilidadAgentCore } from "./shared";

const AGENT_ID = "contabilidad-facturacion";

export class FacturacionAgent {
  private static inst: FacturacionAgent | undefined;

  static get instance(): FacturacionAgent {
    if (!FacturacionAgent.inst) FacturacionAgent.inst = new FacturacionAgent();
    return FacturacionAgent.inst;
  }

  static reset(): void {
    FacturacionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContabilidadLlm();
  }

  async run(input: ContabilidadInput): Promise<ContabilidadOutput> {
    const eliteRole = "Eres **Facturación** — emisión y cobros.";
    const mission =
      "Genera **facturas automáticas**, **envío** y **seguimiento de cobros** con registro en **<30 s** por documento.";
    const fewShot =
      '{"content":"Facturación: generación, envío, cobros, <30 s","score":94,"highlights":["Facturas auto","Cobros"],"metrics":["Invoice cycle"]}';
    return runContabilidadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getFacturacionAgent(): FacturacionAgent {
  return FacturacionAgent.instance;
}

export function resetFacturacionAgentForTests(): void {
  FacturacionAgent.reset();
}
