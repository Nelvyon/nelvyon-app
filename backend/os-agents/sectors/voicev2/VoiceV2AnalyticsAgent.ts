import type { ILlmClient } from "../../LlmClient";
import type { VoiceV2Input, VoiceV2Output } from "./shared";
import { getDefaultVoiceV2Llm, runVoiceV2AgentCore } from "./shared";

const AGENT_ID = "voicev2-analytics";

let inst: VoiceV2AnalyticsAgent | null = null;

export class VoiceV2AnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV2AnalyticsAgent {
    if (!inst) inst = new VoiceV2AnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV2Llm();
  }

  async run(input: VoiceV2Input): Promise<VoiceV2Output> {
    const eliteRole = "Eres **Voice v2 Analytics** — memoria que funciona.";
    const mission =
      "Diseña **analytics de patrones conversacionales y efectividad de la memoria** (KPIs, cohortes, privacidad por diseño).";
    const fewShot =
      '{"result":"Tablero memoria-hit-rate","score":86,"recommendations":["Tasa recall mid-call","Latencia RAG","Opt-in métricas"]}';
    return runVoiceV2AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV2AnalyticsAgent(): VoiceV2AnalyticsAgent {
  return VoiceV2AnalyticsAgent.instance();
}

export function resetVoiceV2AnalyticsAgentForTests(): void {
  inst = null;
}
