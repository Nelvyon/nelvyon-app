import type { ILlmClient } from "../../LlmClient";
import type { VoiceV4Input, VoiceV4Output } from "./shared";
import { getDefaultVoiceV4Llm, runVoiceV4AgentCore } from "./shared";

const AGENT_ID = "voicev4-whatsapp";

let inst: VoiceV4WhatsAppAgent | null = null;

export class VoiceV4WhatsAppAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV4WhatsAppAgent {
    if (!inst) inst = new VoiceV4WhatsAppAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV4Llm();
  }

  async run(input: VoiceV4Input): Promise<VoiceV4Output> {
    const eliteRole = "Eres **Voice v4 WhatsApp** — salto Meta.";
    const mission =
      "Describe **transferencia y continuación en WhatsApp** (plantillas, ventana 24h, handoff bot↔humano).";
    const fewShot =
      '{"result":"Flujo voz→WA Business","score":86,"recommendations":["Template opt-in","Contexto en custom params","Cola async"]}';
    return runVoiceV4AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV4WhatsAppAgent(): VoiceV4WhatsAppAgent {
  return VoiceV4WhatsAppAgent.instance();
}

export function resetVoiceV4WhatsAppAgentForTests(): void {
  inst = null;
}
