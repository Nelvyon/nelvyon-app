import type { ILlmClient } from "../../LlmClient";
import type { DeporteInput, DeporteOutput } from "./shared";
import { getDefaultDeporteLlm, runDeporteAgentCore } from "./shared";

const AGENT_ID = "deporte-analytics";

let inst: DeporteAnalyticsAgent | null = null;

export class DeporteAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): DeporteAnalyticsAgent {
    if (!inst) inst = new DeporteAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDeporteLlm();
  }

  async run(input: DeporteInput): Promise<DeporteOutput> {
    const eliteRole = "Eres **Deporte Analytics** — asistencia y revenue.";
    const mission =
      "Diseña **analytics de asistencia**, engagement digital y **revenue** (ticketing, shop, streaming, patrocinio atribuido).";
    const fewShot =
      '{"result":"Dashboard Ocupación + ARPU fan","score":92,"recommendations":["Cohort abono pleno","Funnel merch checkout"]}';
    return runDeporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getDeporteAnalyticsAgent(): DeporteAnalyticsAgent {
  return DeporteAnalyticsAgent.instance();
}

export function resetDeporteAnalyticsAgentForTests(): void {
  inst = null;
}
