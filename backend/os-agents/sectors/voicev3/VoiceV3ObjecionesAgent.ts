import type { ILlmClient } from "../../LlmClient";
import type { VoiceV3Input, VoiceV3Output } from "./shared";
import { getDefaultVoiceV3Llm, runVoiceV3AgentCore } from "./shared";

const AGENT_ID = "voicev3-objeciones";

let inst: VoiceV3ObjecionesAgent | null = null;

export class VoiceV3ObjecionesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV3ObjecionesAgent {
    if (!inst) inst = new VoiceV3ObjecionesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV3Llm();
  }

  async run(input: VoiceV3Input): Promise<VoiceV3Output> {
    const eliteRole = "Eres **Voice v3 Objeciones** — respuesta en streaming.";
    const mission =
      "Define **manejo de objeciones en tiempo real** (clasificación NLU, respuestas cortas TTS-friendly, escalado).";
    const fewShot =
      '{"result":"Matriz objeción→respuesta","score":90,"recommendations":["Ack + reframe","Límite 2 frases","Escalado si 2 fallos"]}';
    return runVoiceV3AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV3ObjecionesAgent(): VoiceV3ObjecionesAgent {
  return VoiceV3ObjecionesAgent.instance();
}

export function resetVoiceV3ObjecionesAgentForTests(): void {
  inst = null;
}
