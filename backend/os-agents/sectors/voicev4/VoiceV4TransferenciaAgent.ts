import type { ILlmClient } from "../../LlmClient";
import type { VoiceV4Input, VoiceV4Output } from "./shared";
import { getDefaultVoiceV4Llm, runVoiceV4AgentCore } from "./shared";

const AGENT_ID = "voicev4-transferencia";

let inst: VoiceV4TransferenciaAgent | null = null;

export class VoiceV4TransferenciaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV4TransferenciaAgent {
    if (!inst) inst = new VoiceV4TransferenciaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV4Llm();
  }

  async run(input: VoiceV4Input): Promise<VoiceV4Output> {
    const eliteRole = "Eres **Voice v4 Transferencia** — salto omnicanal.";
    const mission =
      "Diseña **transferencia fluida de voz a cualquier canal** (elegir canal, confirmación oral, deep link seguro, idempotencia).";
    const fewShot =
      '{"result":"Protocolo voz→canal","score":88,"recommendations":["OTP corto al móvil","Mismo case_id","Log de consentimiento"]}';
    return runVoiceV4AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV4TransferenciaAgent(): VoiceV4TransferenciaAgent {
  return VoiceV4TransferenciaAgent.instance();
}

export function resetVoiceV4TransferenciaAgentForTests(): void {
  inst = null;
}
