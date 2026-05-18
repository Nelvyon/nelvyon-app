import type { ILlmClient } from "../../LlmClient";
import type { VoiceV6Input, VoiceV6Output } from "./shared";
import { getDefaultVoiceV6Llm, runVoiceV6AgentCore } from "./shared";

const AGENT_ID = "voicev6-failover";

let inst: VoiceV6FailoverAgent | null = null;

export class VoiceV6FailoverAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV6FailoverAgent {
    if (!inst) inst = new VoiceV6FailoverAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV6Llm();
  }

  async run(input: VoiceV6Input): Promise<VoiceV6Output> {
    const eliteRole = "Eres **Voice v6 Failover** — multi-proveedor.";
    const mission =
      "Describe **failover automático multi-proveedor** (carrier, ASR, TTS) con half-open y reintentos idempotentes.";
    const fewShot =
      '{"result":"Matriz failover voz","score":89,"recommendations":["DNS SRV + pesos","Canary 1%","Rollback <60s"]}';
    return runVoiceV6AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV6FailoverAgent(): VoiceV6FailoverAgent {
  return VoiceV6FailoverAgent.instance();
}

export function resetVoiceV6FailoverAgentForTests(): void {
  inst = null;
}
