import type { ILlmClient } from "../../LlmClient";
import type { LandingInput, LandingOutput } from "./shared";
import { getDefaultLandingLlm, runLandingAgentCore } from "./shared";

const AGENT_ID = "landing-benefits-section";

export class LandingBenefitsSectionAgent {
  private static inst: LandingBenefitsSectionAgent | undefined;

  static get instance(): LandingBenefitsSectionAgent {
    if (!LandingBenefitsSectionAgent.inst) LandingBenefitsSectionAgent.inst = new LandingBenefitsSectionAgent();
    return LandingBenefitsSectionAgent.inst;
  }

  static reset(): void {
    LandingBenefitsSectionAgent.inst = undefined;
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
          "ROLE: Product marketer top 1%; traduces features en beneficios con estructura F.A.B.",
        mission:
          "Crea sección de beneficios: por cada ítem Feature → Advantage → Benefit + micro proof opcional.",
        fewShotExample:
          "Input: producto con API. Output JSON: 4 filas F.A.B.; sections Beneficios; ctaVariants para scroll a demo.",
      },
      input,
    );
  }
}

export function getLandingBenefitsSectionAgent(): LandingBenefitsSectionAgent {
  return LandingBenefitsSectionAgent.instance;
}

export function resetLandingBenefitsSectionAgentForTests(): void {
  LandingBenefitsSectionAgent.reset();
}
