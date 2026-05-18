import type { ILlmClient } from "../../LlmClient";
import type { LandingInput, LandingOutput } from "./shared";
import { getDefaultLandingLlm, runLandingAgentCore } from "./shared";

const AGENT_ID = "landing-hero-copy";

export class LandingHeroCopyAgent {
  private static inst: LandingHeroCopyAgent | undefined;

  static get instance(): LandingHeroCopyAgent {
    if (!LandingHeroCopyAgent.inst) LandingHeroCopyAgent.inst = new LandingHeroCopyAgent();
    return LandingHeroCopyAgent.inst;
  }

  static reset(): void {
    LandingHeroCopyAgent.inst = undefined;
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
          "ROLE: Copywriter de landing de conversión top 1%; headlines específicos, no eslóganes vacíos.",
        mission:
          "Genera headline + subheadline + CTA principal de alta conversión alineados al campaignGoal y prueba de valor.",
        fewShotExample:
          "Input: SaaS ahorro tiempo. Output JSON: H1 con métrica; subhead con mecanismo; 3 ctaVariants (primaria + soft); sections Hero.",
      },
      input,
    );
  }
}

export function getLandingHeroCopyAgent(): LandingHeroCopyAgent {
  return LandingHeroCopyAgent.instance;
}

export function resetLandingHeroCopyAgentForTests(): void {
  LandingHeroCopyAgent.reset();
}
