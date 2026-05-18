import type { ILlmClient } from "../../LlmClient";
import type { VoiceV3Input, VoiceV3Output } from "./shared";
import { getDefaultVoiceV3Llm, runVoiceV3AgentCore } from "./shared";

const AGENT_ID = "voicev3-analytics";

let inst: VoiceV3AnalyticsAgent | null = null;

export class VoiceV3AnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV3AnalyticsAgent {
    if (!inst) inst = new VoiceV3AnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV3Llm();
  }

  async run(input: VoiceV3Input): Promise<VoiceV3Output> {
    const eliteRole = "Eres **Voice v3 Analytics** — embudo por voz.";
    const mission =
      "Diseña **analytics de tasa de cierre, objeciones frecuentes y conversión** (funnels, cohortes, privacidad).";
    const fewShot =
      '{"result":"KPI voz ventas","score":89,"recommendations":["Win rate por segmento","Top 5 objeciones","Latencia vs cierre"]}';
    return runVoiceV3AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV3AnalyticsAgent(): VoiceV3AnalyticsAgent {
  return VoiceV3AnalyticsAgent.instance();
}

export function resetVoiceV3AnalyticsAgentForTests(): void {
  inst = null;
}
