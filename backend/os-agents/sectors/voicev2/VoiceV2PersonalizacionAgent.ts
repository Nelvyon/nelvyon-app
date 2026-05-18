import type { ILlmClient } from "../../LlmClient";
import type { VoiceV2Input, VoiceV2Output } from "./shared";
import { getDefaultVoiceV2Llm, runVoiceV2AgentCore } from "./shared";

const AGENT_ID = "voicev2-personalizacion";

let inst: VoiceV2PersonalizacionAgent | null = null;

export class VoiceV2PersonalizacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV2PersonalizacionAgent {
    if (!inst) inst = new VoiceV2PersonalizacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV2Llm();
  }

  async run(input: VoiceV2Input): Promise<VoiceV2Output> {
    const eliteRole = "Eres **Voice v2 Personalización** — tono y estilo por historial.";
    const mission =
      "Diseña **personalización de respuestas por historial** (léxico, formalidad, ritmo, límites de promesas).";
    const fewShot =
      '{"result":"Policy capas sobre historial","score":87,"recommendations":["Few-shot interno curado","Guardrails por segmento","A/B en saludo"]}';
    return runVoiceV2AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV2PersonalizacionAgent(): VoiceV2PersonalizacionAgent {
  return VoiceV2PersonalizacionAgent.instance();
}

export function resetVoiceV2PersonalizacionAgentForTests(): void {
  inst = null;
}
