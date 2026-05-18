export type { GrowthHackingInput, GrowthHackingOutput } from "./shared";
export {
  growthHackingLlmOpts as growthHackingLlmOpts,
  parseGrowthHackingLlmJson,
  buildGrowthHackingPrompt,
  runGrowthHackingAgentCore,
  getDefaultGrowthHackingLlm,
} from "./shared";
export * from "./GrowthHackingCanalesAgent";
export * from "./GrowthHackingExperimentosAgent";
export * from "./GrowthHackingViralAgent";
export * from "./GrowthHackingOnboardingAgent";
export * from "./GrowthHackingRetencionAgent";
export * from "./GrowthHackingExpansionAgent";
export * from "./GrowthHackingAdquisicionAgent";
export * from "./GrowthHackingPlaybookAgent";

import { resetGrowthHackingAdquisicionAgentForTests } from "./GrowthHackingAdquisicionAgent";
import { resetGrowthHackingCanalesAgentForTests } from "./GrowthHackingCanalesAgent";
import { resetGrowthHackingExpansionAgentForTests } from "./GrowthHackingExpansionAgent";
import { resetGrowthHackingExperimentosAgentForTests } from "./GrowthHackingExperimentosAgent";
import { resetGrowthHackingOnboardingAgentForTests } from "./GrowthHackingOnboardingAgent";
import { resetGrowthHackingPlaybookAgentForTests } from "./GrowthHackingPlaybookAgent";
import { resetGrowthHackingRetencionAgentForTests } from "./GrowthHackingRetencionAgent";
import { resetGrowthHackingViralAgentForTests } from "./GrowthHackingViralAgent";

export function resetAllGrowthHackingAgentsForTests(): void {
  resetGrowthHackingCanalesAgentForTests();
  resetGrowthHackingExperimentosAgentForTests();
  resetGrowthHackingViralAgentForTests();
  resetGrowthHackingOnboardingAgentForTests();
  resetGrowthHackingRetencionAgentForTests();
  resetGrowthHackingExpansionAgentForTests();
  resetGrowthHackingAdquisicionAgentForTests();
  resetGrowthHackingPlaybookAgentForTests();
}
