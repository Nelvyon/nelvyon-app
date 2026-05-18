import type { ILlmClient } from "../../LlmClient";
import type { BrandingInput, BrandingOutput } from "./shared";
import { getDefaultBrandingLlm, runBrandingAgentCore } from "./shared";

const AGENT_ID = "branding-arquitectura";

let inst: BrandingArquitecturaAgent | null = null;

export class BrandingArquitecturaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): BrandingArquitecturaAgent {
    if (!inst) inst = new BrandingArquitecturaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBrandingLlm();
  }

  async run(input: BrandingInput): Promise<BrandingOutput> {
    const eliteRole = "Eres **Branding Arquitectura** — estructura de portafolio de marcas.";
    const mission =
      "Diseña **arquitectura de marca** (endorsed / submarcas / branded house) con reglas de coexistencia y naming links.";
    const fewShot =
      '{"result":"Diagrama arquitectura + reglas","score":87,"recommendations":["Nivel master claro","Guiones uso co-logo","Migración gradual"]}';
    return runBrandingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getBrandingArquitecturaAgent(): BrandingArquitecturaAgent {
  return BrandingArquitecturaAgent.instance();
}

export function resetBrandingArquitecturaAgentForTests(): void {
  inst = null;
}
