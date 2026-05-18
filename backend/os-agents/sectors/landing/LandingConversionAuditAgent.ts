import type { ILlmClient } from "../../LlmClient";
import type { LandingInput, LandingOutput } from "./shared";
import { getDefaultLandingLlm, runLandingAgentCore } from "./shared";

const AGENT_ID = "landing-conversion-audit";

export class LandingConversionAuditAgent {
  private static inst: LandingConversionAuditAgent | undefined;

  static get instance(): LandingConversionAuditAgent {
    if (!LandingConversionAuditAgent.inst) LandingConversionAuditAgent.inst = new LandingConversionAuditAgent();
    return LandingConversionAuditAgent.inst;
  }

  static reset(): void {
    LandingConversionAuditAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLandingLlm();
  }

  async run(input: LandingInput): Promise<LandingOutput> {
    return runLandingAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: CRO auditor senior top 1%; checklist heurístico con prioridad impacto/esfuerzo.",
        mission:
          "Audita landing implícita desde brief (usa campaignGoal como proxy de página): fricción, prueba, claridad CTA, velocidad percibida.",
        fewShotExample:
          "Input: objetivo captación demo. Output JSON: hallazgos P0/P1; sections Auditoría; ctaVariants recomendadas.",
      },
      input,
    );
  }
}

export function getLandingConversionAuditAgent(): LandingConversionAuditAgent {
  return LandingConversionAuditAgent.instance;
}

export function resetLandingConversionAuditAgentForTests(): void {
  LandingConversionAuditAgent.reset();
}
