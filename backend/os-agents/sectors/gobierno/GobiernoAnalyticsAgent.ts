import type { ILlmClient } from "../../LlmClient";
import type { GobiernoInput, GobiernoOutput } from "./shared";
import { getDefaultGobiernoLlm, runGobiernoAgentCore } from "./shared";

const AGENT_ID = "gobierno-analytics";

let inst: GobiernoAnalyticsAgent | null = null;

export class GobiernoAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GobiernoAnalyticsAgent {
    if (!inst) inst = new GobiernoAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGobiernoLlm();
  }

  async run(input: GobiernoInput): Promise<GobiernoOutput> {
    const eliteRole = "Eres **Gobierno Analytics** — alcance y engagement.";
    const mission =
      "Diseña **analytics de alcance** y **engagement ciudadano** (web, sede, campañas, canales digitales agregados).";
    const fewShot =
      '{"result":"Cuadro mando KPI ciudadano","score":92,"recommendations":["Embudo trámite online","Cohorte campaña"]}';
    return runGobiernoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGobiernoAnalyticsAgent(): GobiernoAnalyticsAgent {
  return GobiernoAnalyticsAgent.instance();
}

export function resetGobiernoAnalyticsAgentForTests(): void {
  inst = null;
}
