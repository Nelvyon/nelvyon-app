import type { ILlmClient } from "../../LlmClient";
import type { VoiceV4Input, VoiceV4Output } from "./shared";
import { getDefaultVoiceV4Llm, runVoiceV4AgentCore } from "./shared";

const AGENT_ID = "voicev4-analytics";

let inst: VoiceV4AnalyticsAgent | null = null;

export class VoiceV4AnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV4AnalyticsAgent {
    if (!inst) inst = new VoiceV4AnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV4Llm();
  }

  async run(input: VoiceV4Input): Promise<VoiceV4Output> {
    const eliteRole = "Eres **Voice v4 Analytics** — rutas omnicanal.";
    const mission =
      "Diseña **analytics de rutas omnicanal y puntos de abandono** (sankey agregado, tiempo hasta primer mensaje en canal destino).";
    const fewShot =
      '{"result":"KPI handoff y drop-off","score":88,"recommendations":["Funnel por case_id","Latencia voz→WA","Cohort por IVR"]}';
    return runVoiceV4AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV4AnalyticsAgent(): VoiceV4AnalyticsAgent {
  return VoiceV4AnalyticsAgent.instance();
}

export function resetVoiceV4AnalyticsAgentForTests(): void {
  inst = null;
}
