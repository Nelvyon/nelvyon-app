import type { ILlmClient } from "../../LlmClient";
import type { VoiceV7Input, VoiceV7Output } from "./shared";
import { getDefaultVoiceV7Llm, runVoiceV7AgentCore } from "./shared";

const AGENT_ID = "voicev7-auditoria";

let inst: VoiceV7AuditoriaAgent | null = null;

export class VoiceV7AuditoriaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV7AuditoriaAgent {
    if (!inst) inst = new VoiceV7AuditoriaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV7Llm();
  }

  async run(input: VoiceV7Input): Promise<VoiceV7Output> {
    const eliteRole = "Eres **Voice v7 Auditoría** — acceso trazable.";
    const mission =
      "Diseña **acceso auditado** a grabaciones y transcripciones (RBAC, motivo obligatorio, alertas de patrones anómalos).";
    const fewShot =
      '{"result":"Log inmutable acceso","score":90,"recommendations":["Just-in-time elevation","DLP en export","SIEM feed"]}';
    return runVoiceV7AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV7AuditoriaAgent(): VoiceV7AuditoriaAgent {
  return VoiceV7AuditoriaAgent.instance();
}

export function resetVoiceV7AuditoriaAgentForTests(): void {
  inst = null;
}
