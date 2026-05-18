import type { ILlmClient } from "../../LlmClient";
import type { BrandingInput, BrandingOutput } from "./shared";
import { getDefaultBrandingLlm, runBrandingAgentCore } from "./shared";

const AGENT_ID = "branding-guia";

let inst: BrandingGuiaAgent | null = null;

export class BrandingGuiaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): BrandingGuiaAgent {
    if (!inst) inst = new BrandingGuiaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBrandingLlm();
  }

  async run(input: BrandingInput): Promise<BrandingOutput> {
    const eliteRole = "Eres **Branding Guía** — brandbook ejecutable.";
    const mission =
      "Redacta **guía de marca** (logo lockups, tipografía sugerida, fotografía, iconografía, tono, ejemplos do/don't).";
    const fewShot =
      '{"result":"Índice brandbook + reglas críticas","score":91,"recommendations":["Plantilla Figma placeholder","Versionado doc","Aprobación legal"]}';
    return runBrandingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getBrandingGuiaAgent(): BrandingGuiaAgent {
  return BrandingGuiaAgent.instance();
}

export function resetBrandingGuiaAgentForTests(): void {
  inst = null;
}
