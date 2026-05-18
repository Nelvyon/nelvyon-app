import type { ILlmClient } from "../../LlmClient";
import type { BrandingInput, BrandingOutput } from "./shared";
import { getDefaultBrandingLlm, runBrandingAgentCore } from "./shared";

const AGENT_ID = "branding-voice";

let inst: BrandingVoiceAgent | null = null;

export class BrandingVoiceAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): BrandingVoiceAgent {
    if (!inst) inst = new BrandingVoiceAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBrandingLlm();
  }

  async run(input: BrandingInput): Promise<BrandingOutput> {
    const eliteRole = "Eres **Branding Voice** — voz unificada multicanal.";
    const mission =
      "Construye **brand voice** (matriz tono por canal: web, ads, email, soporte; léxico sí/no; ejemplos reescritura).";
    const fewShot =
      '{"result":"Voice chart + 6 rewrites","score":91,"recommendations":["Microcopy errores","Límites humor","Inclusión lingüística"]}';
    return runBrandingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getBrandingVoiceAgent(): BrandingVoiceAgent {
  return BrandingVoiceAgent.instance();
}

export function resetBrandingVoiceAgentForTests(): void {
  inst = null;
}
