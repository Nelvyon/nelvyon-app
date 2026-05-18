import type { ILlmClient } from "../../LlmClient";
import type { OnboardingInput, OnboardingOutput } from "./shared";
import { getDefaultOnboardingLlm, runOnboardingAgentCore } from "./shared";

const AGENT_ID = "onboarding-email-sequence";

/** Guided onboarding library — nombre distinto de startups/OnboardingEmailSequenceAgent (colisión en barrel). */
export class GuidedOnboardingEmailSequenceAgent {
  private static inst: GuidedOnboardingEmailSequenceAgent | undefined;

  static get instance(): GuidedOnboardingEmailSequenceAgent {
    if (!GuidedOnboardingEmailSequenceAgent.inst)
      GuidedOnboardingEmailSequenceAgent.inst = new GuidedOnboardingEmailSequenceAgent();
    return GuidedOnboardingEmailSequenceAgent.inst;
  }

  static reset(): void {
    GuidedOnboardingEmailSequenceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOnboardingLlm();
  }

  async run(input: OnboardingInput): Promise<OnboardingOutput> {
    return runOnboardingAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Lifecycle email strategist top 1%; secuencias que activan sin saturar.",
        mission:
          "Crea secuencia de emails de activación D1-D7-D14-D30: asunto, CTA y objetivo medible por envío.",
        fewShotExample:
          "Input: B2B trial. Output JSON: steps por día relativo; nextActions enlazar a tarea en producto.",
      },
      input,
      0.5,
    );
  }
}

export function getGuidedOnboardingEmailSequenceAgent(): GuidedOnboardingEmailSequenceAgent {
  return GuidedOnboardingEmailSequenceAgent.instance;
}

export function resetGuidedOnboardingEmailSequenceAgentForTests(): void {
  GuidedOnboardingEmailSequenceAgent.reset();
}
