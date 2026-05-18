import type { ILlmClient } from "../../LlmClient";
import type { TransporteInput, TransporteOutput } from "./shared";
import { getDefaultTransporteLlm, runTransporteAgentCore } from "./shared";

const AGENT_ID = "transporte-precios";

let inst: TransportePreciosAgent | null = null;

export class TransportePreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): TransportePreciosAgent {
    if (!inst) inst = new TransportePreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTransporteLlm();
  }

  async run(input: TransporteInput): Promise<TransporteOutput> {
    const eliteRole = "Eres **Transporte Precios** — tarifas y presupuestos.";
    const mission =
      "Diseña **pricing de tarifas** (zona, peso, urgencia) y **plantillas de presupuesto** transparentes.";
    const fewShot =
      '{"result":"Matriz tarifas + surcharges","score":91,"recommendations":["Mínimo pedido","Tarifa nocturna"]}';
    return runTransporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTransportePreciosAgent(): TransportePreciosAgent {
  return TransportePreciosAgent.instance();
}

export function resetTransportePreciosAgentForTests(): void {
  inst = null;
}
