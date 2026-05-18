import type { ILlmClient } from "../../LlmClient";
import type { TransporteInput, TransporteOutput } from "./shared";
import { getDefaultTransporteLlm, runTransporteAgentCore } from "./shared";

const AGENT_ID = "transporte-analytics";

let inst: TransporteAnalyticsAgent | null = null;

export class TransporteAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): TransporteAnalyticsAgent {
    if (!inst) inst = new TransporteAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTransporteLlm();
  }

  async run(input: TransporteInput): Promise<TransporteOutput> {
    const eliteRole = "Eres **Transporte Analytics** — entregas y NPS.";
    const mission =
      "Diseña **analytics de entregas**, tiempos (OTIF, lead time) y **NPS** por canal, ruta y tipo de servicio.";
    const fewShot =
      '{"result":"Dashboard OTIF + NPS cohorte","score":92,"recommendations":["Alerta SLA roto","Root cause retraso"]}';
    return runTransporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTransporteAnalyticsAgent(): TransporteAnalyticsAgent {
  return TransporteAnalyticsAgent.instance();
}

export function resetTransporteAnalyticsAgentForTests(): void {
  inst = null;
}
