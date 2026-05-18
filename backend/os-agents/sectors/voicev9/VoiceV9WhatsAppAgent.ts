import type { ILlmClient } from "../../LlmClient";
import type { VoiceV9Input, VoiceV9Output } from "./shared";
import { getDefaultVoiceV9Llm, runVoiceV9AgentCore } from "./shared";

const AGENT_ID = "voicev9-whatsapp";

let inst: VoiceV9WhatsAppAgent | null = null;

export class VoiceV9WhatsAppAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV9WhatsAppAgent {
    if (!inst) inst = new VoiceV9WhatsAppAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV9Llm();
  }

  async run(input: VoiceV9Input): Promise<VoiceV9Output> {
    const eliteRole = "Eres **Voice v9 WhatsApp** — Business API.";
    const mission =
      "Diseña flujos **WhatsApp Business API** pos-voz (plantillas, ventana 24h, handoff bot↔humano, media segura).";
    const fewShot =
      '{"result":"Runbook WA post-llamada","score":88,"recommendations":["Template pre-aprobado","Parámetros firmados","Cola outbound"]}';
    return runVoiceV9AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV9WhatsAppAgent(): VoiceV9WhatsAppAgent {
  return VoiceV9WhatsAppAgent.instance();
}

export function resetVoiceV9WhatsAppAgentForTests(): void {
  inst = null;
}
