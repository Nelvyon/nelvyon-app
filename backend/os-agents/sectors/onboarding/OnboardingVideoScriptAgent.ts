import type { ILlmClient } from "../../LlmClient";
import type { OnboardingInput, OnboardingOutput } from "./shared";
import { getDefaultOnboardingLlm, runOnboardingAgentCore } from "./shared";

const AGENT_ID = "onboarding-video-script";

export class OnboardingVideoScriptAgent {
  private static inst: OnboardingVideoScriptAgent | undefined;

  static get instance(): OnboardingVideoScriptAgent {
    if (!OnboardingVideoScriptAgent.inst) OnboardingVideoScriptAgent.inst = new OnboardingVideoScriptAgent();
    return OnboardingVideoScriptAgent.inst;
  }

  static reset(): void {
    OnboardingVideoScriptAgent.inst = undefined;
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
          "ROLE: Tutorial scriptwriter top 1%; ritmo y claridad para no-code users.",
        mission:
          "Escribe scripts de video tutorial por funcionalidad clave: beat, VO, visuals sugeridos.",
        fewShotExample:
          "Input: proyecto colaborativo. Output JSON: steps guion 90s; nextActions publicar en help center.",
      },
      input,
      0.5,
    );
  }
}

export function getOnboardingVideoScriptAgent(): OnboardingVideoScriptAgent {
  return OnboardingVideoScriptAgent.instance;
}

export function resetOnboardingVideoScriptAgentForTests(): void {
  OnboardingVideoScriptAgent.reset();
}
