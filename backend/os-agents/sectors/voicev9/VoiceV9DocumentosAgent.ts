import type { ILlmClient } from "../../LlmClient";
import type { VoiceV9Input, VoiceV9Output } from "./shared";
import { getDefaultVoiceV9Llm, runVoiceV9AgentCore } from "./shared";

const AGENT_ID = "voicev9-documentos";

let inst: VoiceV9DocumentosAgent | null = null;

export class VoiceV9DocumentosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV9DocumentosAgent {
    if (!inst) inst = new VoiceV9DocumentosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV9Llm();
  }

  async run(input: VoiceV9Input): Promise<VoiceV9Output> {
    const eliteRole = "Eres **Voice v9 Documentos** — WA post-llamada.";
    const mission =
      "Define **envío automático de documentos/contratos por WhatsApp** tras llamada (PDF firmado, plantilla, trazabilidad).";
    const fewShot =
      '{"result":"Pipeline doc→WA","score":88,"recommendations":["Hash SHA-256","Expiración enlace","Reenvío si falla"]}';
    return runVoiceV9AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV9DocumentosAgent(): VoiceV9DocumentosAgent {
  return VoiceV9DocumentosAgent.instance();
}

export function resetVoiceV9DocumentosAgentForTests(): void {
  inst = null;
}
