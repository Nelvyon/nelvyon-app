import type { ILlmClient } from "../../LlmClient";
import type { TransporteInput, TransporteOutput } from "./shared";
import { getDefaultTransporteLlm, runTransporteAgentCore } from "./shared";

const AGENT_ID = "transporte-flota";

let inst: TransporteFlotaAgent | null = null;

export class TransporteFlotaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): TransporteFlotaAgent {
    if (!inst) inst = new TransporteFlotaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTransporteLlm();
  }

  async run(input: TransporteInput): Promise<TransporteOutput> {
    const eliteRole = "Eres **Transporte Flota** — rutas y utilización.";
    const mission =
      "Diseña **optimización de flota y rutas** (carga útil, ventanas horarias, coste por km, telemetría resumida).";
    const fewShot =
      '{"result":"Playbook rutas multi-parada","score":92,"recommendations":["Clustering barrios","KPI vacío km"]}';
    return runTransporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTransporteFlotaAgent(): TransporteFlotaAgent {
  return TransporteFlotaAgent.instance();
}

export function resetTransporteFlotaAgentForTests(): void {
  inst = null;
}
