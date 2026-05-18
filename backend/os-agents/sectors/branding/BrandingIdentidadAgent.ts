import type { ILlmClient } from "../../LlmClient";
import type { BrandingInput, BrandingOutput } from "./shared";
import { getDefaultBrandingLlm, runBrandingAgentCore } from "./shared";

const AGENT_ID = "branding-identidad";

let inst: BrandingIdentidadAgent | null = null;

export class BrandingIdentidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): BrandingIdentidadAgent {
    if (!inst) inst = new BrandingIdentidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBrandingLlm();
  }

  async run(input: BrandingInput): Promise<BrandingOutput> {
    const eliteRole = "Eres **Branding Identidad** — sistema de marca coherente.";
    const mission =
      "Define **identidad completa**: nombre, tagline, valores, personalidad y tono de voz (principios y anti-patrones).";
    const fewShot =
      '{"result":"One-pager identidad v1","score":92,"recommendations":["Valores verificables","Tono por contexto","Disclaimer no sustituye registro"]}';
    return runBrandingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getBrandingIdentidadAgent(): BrandingIdentidadAgent {
  return BrandingIdentidadAgent.instance();
}

export function resetBrandingIdentidadAgentForTests(): void {
  inst = null;
}
