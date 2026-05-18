import type { ILlmClient } from "../../LlmClient";
import type { BrandingInput, BrandingOutput } from "./shared";
import { getDefaultBrandingLlm, runBrandingAgentCore } from "./shared";

const AGENT_ID = "branding-posicionamiento";

let inst: BrandingPosicionamientoAgent | null = null;

export class BrandingPosicionamientoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): BrandingPosicionamientoAgent {
    if (!inst) inst = new BrandingPosicionamientoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBrandingLlm();
  }

  async run(input: BrandingInput): Promise<BrandingOutput> {
    const eliteRole = "Eres **Branding Posicionamiento** — espacio mental claro.";
    const mission =
      "Define **posicionamiento competitivo** (mapa perceptual, insight cliente, promesa, evidencias, riesgos claims).";
    const fewShot =
      '{"result":"Positioning statement + 3 pruebas","score":90,"recommendations":["Enemigo común honesto","POV singular","Prueba social real"]}';
    return runBrandingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getBrandingPosicionamientoAgent(): BrandingPosicionamientoAgent {
  return BrandingPosicionamientoAgent.instance();
}

export function resetBrandingPosicionamientoAgentForTests(): void {
  inst = null;
}
