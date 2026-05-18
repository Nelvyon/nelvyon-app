import type { ILlmClient } from "../../LlmClient";
import type { VoiceV5Input, VoiceV5Output } from "./shared";
import { getDefaultVoiceV5Llm, runVoiceV5AgentCore } from "./shared";

const AGENT_ID = "voicev5-clonado";

let inst: VoiceV5ClonadoAgent | null = null;

export class VoiceV5ClonadoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV5ClonadoAgent {
    if (!inst) inst = new VoiceV5ClonadoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV5Llm();
  }

  async run(input: VoiceV5Input): Promise<VoiceV5Output> {
    const eliteRole = "Eres **Voice v5 Clonado** — ElevenLabs y compliance.";
    const mission =
      "Define **clonación de voz con ElevenLabs** (consentimiento explícito, dataset mínimo, watermark, políticas de uso).";
    const fewShot =
      '{"result":"Pipeline ElevenLabs seguro","score":86,"recommendations":["Contrato talento","No deepfake","Kill switch"]}';
    return runVoiceV5AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV5ClonadoAgent(): VoiceV5ClonadoAgent {
  return VoiceV5ClonadoAgent.instance();
}

export function resetVoiceV5ClonadoAgentForTests(): void {
  inst = null;
}
