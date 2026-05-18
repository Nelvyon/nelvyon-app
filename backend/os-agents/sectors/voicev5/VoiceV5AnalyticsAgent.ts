import type { ILlmClient } from "../../LlmClient";
import type { VoiceV5Input, VoiceV5Output } from "./shared";
import { getDefaultVoiceV5Llm, runVoiceV5AgentCore } from "./shared";

const AGENT_ID = "voicev5-analytics";

let inst: VoiceV5AnalyticsAgent | null = null;

export class VoiceV5AnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV5AnalyticsAgent {
    if (!inst) inst = new VoiceV5AnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV5Llm();
  }

  async run(input: VoiceV5Input): Promise<VoiceV5Output> {
    const eliteRole = "Eres **Voice v5 Analytics** — calidad y adopción.";
    const mission =
      "Diseña **analytics de voces de marca** (adopción, errores ASR/TTS, claridad, comparación A/B agregada).";
    const fewShot =
      '{"result":"Dashboard voz marca","score":89,"recommendations":["WER por locale","Barge-in rate","CSAT por voice_id"]}';
    return runVoiceV5AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV5AnalyticsAgent(): VoiceV5AnalyticsAgent {
  return VoiceV5AnalyticsAgent.instance();
}

export function resetVoiceV5AnalyticsAgentForTests(): void {
  inst = null;
}
