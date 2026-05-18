import { OnboardingChecklistBuilderAgent } from "./OnboardingChecklistBuilderAgent";
import { OnboardingDropoffRecoveryAgent } from "./OnboardingDropoffRecoveryAgent";
import { GuidedOnboardingEmailSequenceAgent } from "./GuidedOnboardingEmailSequenceAgent";
import { OnboardingProgressNudgeAgent } from "./OnboardingProgressNudgeAgent";
import { OnboardingSuccessMilestoneAgent } from "./OnboardingSuccessMilestoneAgent";
import { OnboardingTooltipCopyAgent } from "./OnboardingTooltipCopyAgent";
import { OnboardingVideoScriptAgent } from "./OnboardingVideoScriptAgent";
import { OnboardingWelcomeFlowAgent } from "./OnboardingWelcomeFlowAgent";

export type { OnboardingInput, OnboardingOutput } from "./shared";
export { parseOnboardingLlmJson, buildActivatePrompt, llmOpts as onboardingLlmOpts } from "./shared";

export {
  OnboardingWelcomeFlowAgent,
  getOnboardingWelcomeFlowAgent,
  resetOnboardingWelcomeFlowAgentForTests,
} from "./OnboardingWelcomeFlowAgent";
export {
  OnboardingChecklistBuilderAgent,
  getOnboardingChecklistBuilderAgent,
  resetOnboardingChecklistBuilderAgentForTests,
} from "./OnboardingChecklistBuilderAgent";
export {
  OnboardingTooltipCopyAgent,
  getOnboardingTooltipCopyAgent,
  resetOnboardingTooltipCopyAgentForTests,
} from "./OnboardingTooltipCopyAgent";
export {
  OnboardingProgressNudgeAgent,
  getOnboardingProgressNudgeAgent,
  resetOnboardingProgressNudgeAgentForTests,
} from "./OnboardingProgressNudgeAgent";
export {
  OnboardingVideoScriptAgent,
  getOnboardingVideoScriptAgent,
  resetOnboardingVideoScriptAgentForTests,
} from "./OnboardingVideoScriptAgent";
export {
  GuidedOnboardingEmailSequenceAgent,
  getGuidedOnboardingEmailSequenceAgent,
  resetGuidedOnboardingEmailSequenceAgentForTests,
} from "./GuidedOnboardingEmailSequenceAgent";
export {
  OnboardingDropoffRecoveryAgent,
  getOnboardingDropoffRecoveryAgent,
  resetOnboardingDropoffRecoveryAgentForTests,
} from "./OnboardingDropoffRecoveryAgent";
export {
  OnboardingSuccessMilestoneAgent,
  getOnboardingSuccessMilestoneAgent,
  resetOnboardingSuccessMilestoneAgentForTests,
} from "./OnboardingSuccessMilestoneAgent";

export function resetAllOnboardingAgentsForTests(): void {
  OnboardingWelcomeFlowAgent.reset();
  OnboardingChecklistBuilderAgent.reset();
  OnboardingTooltipCopyAgent.reset();
  OnboardingProgressNudgeAgent.reset();
  OnboardingVideoScriptAgent.reset();
  GuidedOnboardingEmailSequenceAgent.reset();
  OnboardingDropoffRecoveryAgent.reset();
  OnboardingSuccessMilestoneAgent.reset();
}
