import type { ILlmClient } from "../../LlmClient";
import type { VoiceV5Input, VoiceV5Output } from "./shared";
import { getDefaultVoiceV5Llm, runVoiceV5AgentCore } from "./shared";

const AGENT_ID = "voicev5-tono";

let inst: VoiceV5TonoAgent | null = null;

export class VoiceV5TonoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV5TonoAgent {
    if (!inst) inst = new VoiceV5TonoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV5Llm();
  }

  async run(input: VoiceV5Input): Promise<VoiceV5Output> {
    const eliteRole = "Eres **Voice v5 Tono** — ajuste dinámico.";
    const mission =
      "Describe **ajuste dinámico por contexto del cliente** (sentimiento, urgencia, VIP) manteniendo ADN vocal.";
    const fewShot =
      '{"result":"Capa prosodia contextual","score":88,"recommendations":["Señales CRM","Clamp de excitación","Fallback marca"]}';
    return runVoiceV5AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV5TonoAgent(): VoiceV5TonoAgent {
  return VoiceV5TonoAgent.instance();
}

export function resetVoiceV5TonoAgentForTests(): void {
  inst = null;
}
