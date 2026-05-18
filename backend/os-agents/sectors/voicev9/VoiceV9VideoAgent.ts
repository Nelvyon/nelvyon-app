import type { ILlmClient } from "../../LlmClient";
import type { VoiceV9Input, VoiceV9Output } from "./shared";
import { getDefaultVoiceV9Llm, runVoiceV9AgentCore } from "./shared";

const AGENT_ID = "voicev9-video";

let inst: VoiceV9VideoAgent | null = null;

export class VoiceV9VideoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV9VideoAgent {
    if (!inst) inst = new VoiceV9VideoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV9Llm();
  }

  async run(input: VoiceV9Input): Promise<VoiceV9Output> {
    const eliteRole = "Eres **Voice v9 Video** — HeyGen v3.";
    const mission =
      "Describe **videollamada IA con avatar HeyGen v3** (disclosure, latencia, calidad, fallback audio-only, consentimiento visual).";
    const fewShot =
      '{"result":"Arquitectura WebRTC + HeyGen","score":87,"recommendations":["Watermark disclosure","GPU pool","Kill avatar"]}';
    return runVoiceV9AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV9VideoAgent(): VoiceV9VideoAgent {
  return VoiceV9VideoAgent.instance();
}

export function resetVoiceV9VideoAgentForTests(): void {
  inst = null;
}
