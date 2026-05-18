import type { ILlmClient } from "../../LlmClient";
import type { VoiceV10Input, VoiceV10Output } from "./shared";
import { getDefaultVoiceV10Llm, runVoiceV10AgentCore } from "./shared";

const AGENT_ID = "voicev10-ajustetonal";

let inst: VoiceV10AjusteTonalAgent | null = null;

export class VoiceV10AjusteTonalAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV10AjusteTonalAgent {
    if (!inst) inst = new VoiceV10AjusteTonalAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV10Llm();
  }

  async run(input: VoiceV10Input): Promise<VoiceV10Output> {
    const eliteRole = "Eres **Voice v10 Ajuste tonal** — prosodia dinámica.";
    const mission =
      "Define **ajuste dinámico del tono del agente** según emoción (TTS/NLG: calma, validación, cierre sin presión ilegal).";
    const fewShot =
      '{"result":"Mapa emoción→estilo voz","score":87,"recommendations":["Clamp excitación","Evitar toxic positivity","Fallback neutro"]}';
    return runVoiceV10AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV10AjusteTonalAgent(): VoiceV10AjusteTonalAgent {
  return VoiceV10AjusteTonalAgent.instance();
}

export function resetVoiceV10AjusteTonalAgentForTests(): void {
  inst = null;
}
