import type { ILlmClient } from "../../LlmClient";
import type { VoiceV7Input, VoiceV7Output } from "./shared";
import { getDefaultVoiceV7Llm, runVoiceV7AgentCore } from "./shared";

const AGENT_ID = "voicev7-retencion";

let inst: VoiceV7RetencionAgent | null = null;

export class VoiceV7RetencionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV7RetencionAgent {
    if (!inst) inst = new VoiceV7RetencionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV7Llm();
  }

  async run(input: VoiceV7Input): Promise<VoiceV7Output> {
    const eliteRole = "Eres **Voice v7 Retención** — país y legal hold.";
    const mission =
      "Planifica **retención configurable por país** (TTL por categoría, legal hold, borrado certificado y prueba).";
    const fewShot =
      '{"result":"Matriz país→retención","score":87,"recommendations":["Job GC con WORM","Excepción litigio","Informe borrado"]}';
    return runVoiceV7AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV7RetencionAgent(): VoiceV7RetencionAgent {
  return VoiceV7RetencionAgent.instance();
}

export function resetVoiceV7RetencionAgentForTests(): void {
  inst = null;
}
