import type { ILlmClient } from "../../LlmClient";
import type { VoiceV2Input, VoiceV2Output } from "./shared";
import { getDefaultVoiceV2Llm, runVoiceV2AgentCore } from "./shared";

const AGENT_ID = "voicev2-integracion";

let inst: VoiceV2IntegracionAgent | null = null;

export class VoiceV2IntegracionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV2IntegracionAgent {
    if (!inst) inst = new VoiceV2IntegracionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV2Llm();
  }

  async run(input: VoiceV2Input): Promise<VoiceV2Output> {
    const eliteRole = "Eres **Voice v2 Integración** — memoria ↔ sistemas.";
    const mission =
      "Describe **integración de memoria con CRM y base de datos** (contratos de evento, idempotencia, consistencia eventual).";
    const fewShot =
      '{"result":"Sync hechos voz→CRM","score":88,"recommendations":["Outbox pattern","Mapeo campos canónico","Reconciliación nightly"]}';
    return runVoiceV2AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV2IntegracionAgent(): VoiceV2IntegracionAgent {
  return VoiceV2IntegracionAgent.instance();
}

export function resetVoiceV2IntegracionAgentForTests(): void {
  inst = null;
}
