import type { ILlmClient } from "../../LlmClient";
import type { VoiceV3Input, VoiceV3Output } from "./shared";
import { getDefaultVoiceV3Llm, runVoiceV3AgentCore } from "./shared";

const AGENT_ID = "voicev3-contrato";

let inst: VoiceV3ContratoAgent | null = null;

export class VoiceV3ContratoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV3ContratoAgent {
    if (!inst) inst = new VoiceV3ContratoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV3Llm();
  }

  async run(input: VoiceV3Input): Promise<VoiceV3Output> {
    const eliteRole = "Eres **Voice v3 Contrato** — documento post-cierre.";
    const mission =
      "Describe **generación automática de contrato post-cierre** (placeholders, anexos SLA, revisión humana obligatoria).";
    const fewShot =
      '{"result":"Pipeline cierre→contrato","score":87,"recommendations":["Plantillas abogado","Hash del PDF","No jurídico por TTS"]}';
    return runVoiceV3AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV3ContratoAgent(): VoiceV3ContratoAgent {
  return VoiceV3ContratoAgent.instance();
}

export function resetVoiceV3ContratoAgentForTests(): void {
  inst = null;
}
