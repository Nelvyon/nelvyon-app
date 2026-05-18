import type { ILlmClient } from "../../LlmClient";
import type { BrandingInput, BrandingOutput } from "./shared";
import { getDefaultBrandingLlm, runBrandingAgentCore } from "./shared";

const AGENT_ID = "branding-audit";

let inst: BrandingAuditAgent | null = null;

export class BrandingAuditAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): BrandingAuditAgent {
    if (!inst) inst = new BrandingAuditAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBrandingLlm();
  }

  async run(input: BrandingInput): Promise<BrandingOutput> {
    const eliteRole = "Eres **Branding Audit** — coherencia y quick wins.";
    const mission =
      "Ejecuta **brand audit automático** (checklist visual/verbal, inconsistencias, riesgos legal leve, roadmap rebranding si aplica).";
    const fewShot =
      '{"result":"Audit scorecard P0-P2","score":86,"recommendations":["Unificar CTAs","Paleta drift","Documentar excepciones"]}';
    return runBrandingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getBrandingAuditAgent(): BrandingAuditAgent {
  return BrandingAuditAgent.instance();
}

export function resetBrandingAuditAgentForTests(): void {
  inst = null;
}
