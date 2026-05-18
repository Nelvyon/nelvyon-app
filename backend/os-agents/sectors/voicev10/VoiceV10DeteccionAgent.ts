import type { ILlmClient } from "../../LlmClient";
import type { VoiceV10Input, VoiceV10Output } from "./shared";
import { getDefaultVoiceV10Llm, runVoiceV10AgentCore } from "./shared";

const AGENT_ID = "voicev10-deteccion";

let inst: VoiceV10DeteccionAgent | null = null;

export class VoiceV10DeteccionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV10DeteccionAgent {
    if (!inst) inst = new VoiceV10DeteccionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV10Llm();
  }

  async run(input: VoiceV10Input): Promise<VoiceV10Output> {
    const eliteRole = "Eres **Voice v10 Detección** — emoción en streaming.";
    const mission =
      "Diseña **detección de emociones en tiempo real** (frustración, satisfacción, duda, urgencia, interés) con fusión multimodal.";
    const fewShot =
      '{"result":"Clasificador emoción voz v1","score":88,"recommendations":["Latencia <500ms","Suavizado EMA","Calibración por idioma"]}';
    return runVoiceV10AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV10DeteccionAgent(): VoiceV10DeteccionAgent {
  return VoiceV10DeteccionAgent.instance();
}

export function resetVoiceV10DeteccionAgentForTests(): void {
  inst = null;
}
