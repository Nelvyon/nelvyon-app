import type { ILlmClient } from "../../LlmClient";
import type { VoiceV5Input, VoiceV5Output } from "./shared";
import { getDefaultVoiceV5Llm, runVoiceV5AgentCore } from "./shared";

const AGENT_ID = "voicev5-consistencia";

let inst: VoiceV5ConsistenciaAgent | null = null;

export class VoiceV5ConsistenciaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV5ConsistenciaAgent {
    if (!inst) inst = new VoiceV5ConsistenciaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV5Llm();
  }

  async run(input: VoiceV5Input): Promise<VoiceV5Output> {
    const eliteRole = "Eres **Voice v5 Consistencia** — branding vocal.";
    const mission =
      "Planifica **branding vocal coherente en todos los canales** (IVR, notificaciones habladas, anuncios, hold copy).";
    const fewShot =
      '{"result":"Auditoría cross-canal voz","score":87,"recommendations":["Misma voz ID","Glosario pronunciación","QA mensual"]}';
    return runVoiceV5AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV5ConsistenciaAgent(): VoiceV5ConsistenciaAgent {
  return VoiceV5ConsistenciaAgent.instance();
}

export function resetVoiceV5ConsistenciaAgentForTests(): void {
  inst = null;
}
