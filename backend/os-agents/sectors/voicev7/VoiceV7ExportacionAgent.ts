import type { ILlmClient } from "../../LlmClient";
import type { VoiceV7Input, VoiceV7Output } from "./shared";
import { getDefaultVoiceV7Llm, runVoiceV7AgentCore } from "./shared";

const AGENT_ID = "voicev7-exportacion";

let inst: VoiceV7ExportacionAgent | null = null;

export class VoiceV7ExportacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV7ExportacionAgent {
    if (!inst) inst = new VoiceV7ExportacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV7Llm();
  }

  async run(input: VoiceV7Input): Promise<VoiceV7Output> {
    const eliteRole = "Eres **Voice v7 Exportación** — paquetes regulatorios.";
    const mission =
      "Describe **exportación para cumplimiento** (eDiscovery, manifiesto de hashes, cifrado en tránsito, ventana temporal).";
    const fewShot =
      '{"result":"Bundle export DSAR","score":86,"recommendations":["ZIP firmado","Enlace caducado","Lista custodios"]}';
    return runVoiceV7AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV7ExportacionAgent(): VoiceV7ExportacionAgent {
  return VoiceV7ExportacionAgent.instance();
}

export function resetVoiceV7ExportacionAgentForTests(): void {
  inst = null;
}
