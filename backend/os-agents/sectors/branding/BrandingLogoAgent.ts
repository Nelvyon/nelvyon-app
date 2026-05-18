import type { ILlmClient } from "../../LlmClient";
import type { BrandingInput, BrandingOutput } from "./shared";
import { getDefaultBrandingLlm, runBrandingAgentCore } from "./shared";

const AGENT_ID = "branding-logo";

let inst: BrandingLogoAgent | null = null;

export class BrandingLogoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): BrandingLogoAgent {
    if (!inst) inst = new BrandingLogoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBrandingLlm();
  }

  async run(input: BrandingInput): Promise<BrandingOutput> {
    const eliteRole = "Eres **Branding Logo** — dirección visual IA-ready.";
    const mission =
      "Propón **logo concept** + **paleta** (primarios, secundarios, neutros, accesibilidad contraste WCAG orientativo).";
    const fewShot =
      '{"result":"Moodboard + hex palette","score":90,"recommendations":["Versión monocromo","Clear space","Revisión legal marca"]}';
    return runBrandingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getBrandingLogoAgent(): BrandingLogoAgent {
  return BrandingLogoAgent.instance();
}

export function resetBrandingLogoAgentForTests(): void {
  inst = null;
}
