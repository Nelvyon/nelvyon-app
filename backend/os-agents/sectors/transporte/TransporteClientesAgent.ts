import type { ILlmClient } from "../../LlmClient";
import type { TransporteInput, TransporteOutput } from "./shared";
import { getDefaultTransporteLlm, runTransporteAgentCore } from "./shared";

const AGENT_ID = "transporte-clientes";

let inst: TransporteClientesAgent | null = null;

export class TransporteClientesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): TransporteClientesAgent {
    if (!inst) inst = new TransporteClientesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTransporteLlm();
  }

  async run(input: TransporteInput): Promise<TransporteOutput> {
    const eliteRole = "Eres **Transporte Clientes** — B2B y B2C.";
    const mission =
      "Diseña **captación de clientes B2B y B2C** (contratos flota, app usuario final, partners marketplace).";
    const fewShot =
      '{"result":"Embudo dual B2B/B2C transporte","score":93,"recommendations":["Cotizador instantáneo","Outbound PYME"]}';
    return runTransporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTransporteClientesAgent(): TransporteClientesAgent {
  return TransporteClientesAgent.instance();
}

export function resetTransporteClientesAgentForTests(): void {
  inst = null;
}
