import { LandingABVariantAgent } from "./LandingABVariantAgent";
import { LandingBenefitsSectionAgent } from "./LandingBenefitsSectionAgent";
import { LandingConversionAuditAgent } from "./LandingConversionAuditAgent";
import { LandingFAQBuilderAgent } from "./LandingFAQBuilderAgent";
import { LandingHeroCopyAgent } from "./LandingHeroCopyAgent";
import { LandingMobileFirstAgent } from "./LandingMobileFirstAgent";
import { LandingSocialProofAgent } from "./LandingSocialProofAgent";
import { LandingUrgencyAgent } from "./LandingUrgencyAgent";

export type { LandingInput, LandingOutput } from "./shared";
export { parseLandingLlmJson, buildConvertPrompt, landingTemperature, llmOpts as landingLlmOpts } from "./shared";

export {
  LandingHeroCopyAgent,
  getLandingHeroCopyAgent,
  resetLandingHeroCopyAgentForTests,
} from "./LandingHeroCopyAgent";
export {
  LandingBenefitsSectionAgent,
  getLandingBenefitsSectionAgent,
  resetLandingBenefitsSectionAgentForTests,
} from "./LandingBenefitsSectionAgent";
export {
  LandingSocialProofAgent,
  getLandingSocialProofAgent,
  resetLandingSocialProofAgentForTests,
} from "./LandingSocialProofAgent";
export {
  LandingFAQBuilderAgent,
  getLandingFAQBuilderAgent,
  resetLandingFAQBuilderAgentForTests,
} from "./LandingFAQBuilderAgent";
export {
  LandingUrgencyAgent,
  getLandingUrgencyAgent,
  resetLandingUrgencyAgentForTests,
} from "./LandingUrgencyAgent";
export {
  LandingMobileFirstAgent,
  getLandingMobileFirstAgent,
  resetLandingMobileFirstAgentForTests,
} from "./LandingMobileFirstAgent";
export {
  LandingABVariantAgent,
  getLandingABVariantAgent,
  resetLandingABVariantAgentForTests,
} from "./LandingABVariantAgent";
export {
  LandingConversionAuditAgent,
  getLandingConversionAuditAgent,
  resetLandingConversionAuditAgentForTests,
} from "./LandingConversionAuditAgent";

export function resetAllLandingAgentsForTests(): void {
  LandingHeroCopyAgent.reset();
  LandingBenefitsSectionAgent.reset();
  LandingSocialProofAgent.reset();
  LandingFAQBuilderAgent.reset();
  LandingUrgencyAgent.reset();
  LandingMobileFirstAgent.reset();
  LandingABVariantAgent.reset();
  LandingConversionAuditAgent.reset();
}
