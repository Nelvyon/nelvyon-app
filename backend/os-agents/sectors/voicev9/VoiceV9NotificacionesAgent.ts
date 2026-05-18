import type { ILlmClient } from "../../LlmClient";
import type { VoiceV9Input, VoiceV9Output } from "./shared";
import { getDefaultVoiceV9Llm, runVoiceV9AgentCore } from "./shared";

const AGENT_ID = "voicev9-notificaciones";

let inst: VoiceV9NotificacionesAgent | null = null;

export class VoiceV9NotificacionesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV9NotificacionesAgent {
    if (!inst) inst = new VoiceV9NotificacionesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV9Llm();
  }

  async run(input: VoiceV9Input): Promise<VoiceV9Output> {
    const eliteRole = "Eres **Voice v9 Notificaciones** — proactivas.";
    const mission =
      "Planifica **notificaciones proactivas por canal preferido** (quiet hours, prioridad, deduplicación multi-dispositivo).";
    const fewShot =
      '{"result":"Motor preferencia canal","score":87,"recommendations":["Digest vs instant","Cap diario","Override transaccional"]}';
    return runVoiceV9AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV9NotificacionesAgent(): VoiceV9NotificacionesAgent {
  return VoiceV9NotificacionesAgent.instance();
}

export function resetVoiceV9NotificacionesAgentForTests(): void {
  inst = null;
}
