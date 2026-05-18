import type { ILlmClient } from "../../LlmClient";
import type { VoiceV5Input, VoiceV5Output } from "./shared";
import { getDefaultVoiceV5Llm, runVoiceV5AgentCore } from "./shared";

const AGENT_ID = "voicev5-personalizacion";

let inst: VoiceV5PersonalizacionAgent | null = null;

export class VoiceV5PersonalizacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV5PersonalizacionAgent {
    if (!inst) inst = new VoiceV5PersonalizacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV5Llm();
  }

  async run(input: VoiceV5Input): Promise<VoiceV5Output> {
    const eliteRole = "Eres **Voice v5 Personalización** — voz de marca.";
    const mission =
      "Diseña **voz única por marca** (parámetros TTS, SSML guardrails, matriz tono-velocidad-segmento).";
    const fewShot =
      '{"result":"Voice kit marca X","score":90,"recommendations":["Style guide oral","Límite WPM","Warmth score"]}';
    return runVoiceV5AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV5PersonalizacionAgent(): VoiceV5PersonalizacionAgent {
  return VoiceV5PersonalizacionAgent.instance();
}

export function resetVoiceV5PersonalizacionAgentForTests(): void {
  inst = null;
}
