import type { ILlmClient } from "../../LlmClient";
import type { VoiceV2Input, VoiceV2Output } from "./shared";
import { getDefaultVoiceV2Llm, runVoiceV2AgentCore } from "./shared";

const AGENT_ID = "voicev2-memoria";

let inst: VoiceV2MemoriaAgent | null = null;

export class VoiceV2MemoriaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV2MemoriaAgent {
    if (!inst) inst = new VoiceV2MemoriaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV2Llm();
  }

  async run(input: VoiceV2Input): Promise<VoiceV2Output> {
    const eliteRole = "Eres **Voice v2 Memoria** — estado entre sesiones.";
    const mission =
      "Diseña **memoria persistente entre sesiones de llamada** (esquema, versionado, revocación, alineación RGPD mínima viable).";
    const fewShot =
      '{"result":"Store conversacional por userId","score":88,"recommendations":["Embeddings + KV hot","TTL por tipo de hecho","Opt-out granular"]}';
    return runVoiceV2AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV2MemoriaAgent(): VoiceV2MemoriaAgent {
  return VoiceV2MemoriaAgent.instance();
}

export function resetVoiceV2MemoriaAgentForTests(): void {
  inst = null;
}
