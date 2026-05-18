import type { ILlmClient } from "../../LlmClient";
import type { LandingInput, LandingOutput } from "./shared";
import { getDefaultLandingLlm, runLandingAgentCore } from "./shared";

const AGENT_ID = "landing-mobile-first";

export class LandingMobileFirstAgent {
  private static inst: LandingMobileFirstAgent | undefined;

  static get instance(): LandingMobileFirstAgent {
    if (!LandingMobileFirstAgent.inst) LandingMobileFirstAgent.inst = new LandingMobileFirstAgent();
    return LandingMobileFirstAgent.inst;
  }

  static reset(): void {
    LandingMobileFirstAgent.inst = undefined;
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
          "ROLE: UX writer mobile-first top 1%; jerarquía tap-friendly y microcopy corto.",
        mission:
          "Optimiza estructura y copy para mobile-first: orden de bloques, líneas cortas, CTA sticky, evitar muros de texto.",
        fewShotExample:
          "Input: lead gen. Output JSON: outline móvil por pantallas; sections Above fold móvil; ctaVariants Llamar vs WhatsApp.",
      },
      input,
    );
  }
}

export function getLandingMobileFirstAgent(): LandingMobileFirstAgent {
  return LandingMobileFirstAgent.instance;
}

export function resetLandingMobileFirstAgentForTests(): void {
  LandingMobileFirstAgent.reset();
}
