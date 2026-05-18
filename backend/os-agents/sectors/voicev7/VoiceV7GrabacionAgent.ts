import type { ILlmClient } from "../../LlmClient";
import type { VoiceV7Input, VoiceV7Output } from "./shared";
import { getDefaultVoiceV7Llm, runVoiceV7AgentCore } from "./shared";

const AGENT_ID = "voicev7-grabacion";

let inst: VoiceV7GrabacionAgent | null = null;

export class VoiceV7GrabacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV7GrabacionAgent {
    if (!inst) inst = new VoiceV7GrabacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV7Llm();
  }

  async run(input: VoiceV7Input): Promise<VoiceV7Output> {
    const eliteRole = "Eres **Voice v7 Grabación** — evidencia y consentimiento.";
    const mission =
      "Diseña **grabación automática con consentimiento** (bitácoras, pausa/reanudación, jurisdicciones mixtas).";
    const fewShot =
      '{"result":"Política grabación dual consent","score":88,"recommendations":["Beep + TTS aviso","No grabar sin flag legal","Watermark temporal"]}';
    return runVoiceV7AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV7GrabacionAgent(): VoiceV7GrabacionAgent {
  return VoiceV7GrabacionAgent.instance();
}

export function resetVoiceV7GrabacionAgentForTests(): void {
  inst = null;
}
