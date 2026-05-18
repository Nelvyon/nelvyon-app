import type { ILlmClient } from "../../LlmClient";
import type { VoiceV2Input, VoiceV2Output } from "./shared";
import { getDefaultVoiceV2Llm, runVoiceV2AgentCore } from "./shared";

const AGENT_ID = "voicev2-contexto";

let inst: VoiceV2ContextoAgent | null = null;

export class VoiceV2ContextoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV2ContextoAgent {
    if (!inst) inst = new VoiceV2ContextoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV2Llm();
  }

  async run(input: VoiceV2Input): Promise<VoiceV2Output> {
    const eliteRole = "Eres **Voice v2 Contexto** — mid-call retrieval.";
    const mission =
      "Define **recuperación y gestión de contexto mid-call** (ventana activa, re-ranking bajo latencia, manejo de barge-in).";
    const fewShot =
      '{"result":"Pipeline contexto <300ms","score":90,"recommendations":["Cache último turno","Debounce ASR","Fallback si RAG vacío"]}';
    return runVoiceV2AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV2ContextoAgent(): VoiceV2ContextoAgent {
  return VoiceV2ContextoAgent.instance();
}

export function resetVoiceV2ContextoAgentForTests(): void {
  inst = null;
}
