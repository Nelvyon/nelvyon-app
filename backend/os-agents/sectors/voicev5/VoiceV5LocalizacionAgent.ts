import type { ILlmClient } from "../../LlmClient";
import type { VoiceV5Input, VoiceV5Output } from "./shared";
import { getDefaultVoiceV5Llm, runVoiceV5AgentCore } from "./shared";

const AGENT_ID = "voicev5-localizacion";

let inst: VoiceV5LocalizacionAgent | null = null;

export class VoiceV5LocalizacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV5LocalizacionAgent {
    if (!inst) inst = new VoiceV5LocalizacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV5Llm();
  }

  async run(input: VoiceV5Input): Promise<VoiceV5Output> {
    const eliteRole = "Eres **Voice v5 Localización** — acento y mercado.";
    const mission =
      "Define **localización vocal** (acento regional, léxico, ritmo) sin diluir personalidad de marca.";
    const fewShot =
      '{"result":"Mapa locale→voice profile","score":86,"recommendations":["es-ES vs es-MX","Validación nativa","SSML locale"]}';
    return runVoiceV5AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV5LocalizacionAgent(): VoiceV5LocalizacionAgent {
  return VoiceV5LocalizacionAgent.instance();
}

export function resetVoiceV5LocalizacionAgentForTests(): void {
  inst = null;
}
