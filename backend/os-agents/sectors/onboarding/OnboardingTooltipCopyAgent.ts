import type { ILlmClient } from "../../LlmClient";
import type { OnboardingInput, OnboardingOutput } from "./shared";
import { getDefaultOnboardingLlm, runOnboardingAgentCore } from "./shared";

const AGENT_ID = "onboarding-tooltip-copy";

export class OnboardingTooltipCopyAgent {
  private static inst: OnboardingTooltipCopyAgent | undefined;

  static get instance(): OnboardingTooltipCopyAgent {
    if (!OnboardingTooltipCopyAgent.inst) OnboardingTooltipCopyAgent.inst = new OnboardingTooltipCopyAgent();
    return OnboardingTooltipCopyAgent.inst;
  }

  static reset(): void {
    OnboardingTooltipCopyAgent.inst = undefined;
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
          "ROLE: In-product microcopy lead top 1%; tooltips útiles, no ruido.",
        mission:
          "Redacta tooltips y guías contextuales in-app por feature con tono y longitud adecuados.",
        fewShotExample:
          "Input: CRM. Output JSON: steps por módulo leads/deals; nextActions habilitar integración email.",
      },
      input,
      0.5,
    );
  }
}

export function getOnboardingTooltipCopyAgent(): OnboardingTooltipCopyAgent {
  return OnboardingTooltipCopyAgent.instance;
}

export function resetOnboardingTooltipCopyAgentForTests(): void {
  OnboardingTooltipCopyAgent.reset();
}
