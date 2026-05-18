import { SaasB2bAnalyticsAgent } from "./SaasB2bAnalyticsAgent";
import { SaasB2bDemoAgent } from "./SaasB2bDemoAgent";
import { SaasB2bEmailAgent } from "./SaasB2bEmailAgent";
import { SaasB2bLeadGenAgent } from "./SaasB2bLeadGenAgent";
import { SaasB2bOnboardingAgent } from "./SaasB2bOnboardingAgent";
import { SaasB2bReviewsAgent } from "./SaasB2bReviewsAgent";
import { SaasB2bSEOAgent } from "./SaasB2bSEOAgent";
import { SaasB2bSocialAgent } from "./SaasB2bSocialAgent";

export type { SaasB2bInput, SaasB2bOutput } from "./shared";
export { saasB2bLlmOpts, parseSaasB2bLlmJson, buildSaasB2bPrompt } from "./shared";

export { SaasB2bDemoAgent, getSaasB2bDemoAgent, resetSaasB2bDemoAgentForTests } from "./SaasB2bDemoAgent";
export {
  SaasB2bLeadGenAgent,
  getSaasB2bLeadGenAgent,
  resetSaasB2bLeadGenAgentForTests,
} from "./SaasB2bLeadGenAgent";
export {
  SaasB2bOnboardingAgent,
  getSaasB2bOnboardingAgent,
  resetSaasB2bOnboardingAgentForTests,
} from "./SaasB2bOnboardingAgent";
export { SaasB2bSEOAgent, getSaasB2bSEOAgent, resetSaasB2bSEOAgentForTests } from "./SaasB2bSEOAgent";
export {
  SaasB2bSocialAgent,
  getSaasB2bSocialAgent,
  resetSaasB2bSocialAgentForTests,
} from "./SaasB2bSocialAgent";
export { SaasB2bEmailAgent, getSaasB2bEmailAgent, resetSaasB2bEmailAgentForTests } from "./SaasB2bEmailAgent";
export {
  SaasB2bReviewsAgent,
  getSaasB2bReviewsAgent,
  resetSaasB2bReviewsAgentForTests,
} from "./SaasB2bReviewsAgent";
export {
  SaasB2bAnalyticsAgent,
  getSaasB2bAnalyticsAgent,
  resetSaasB2bAnalyticsAgentForTests,
} from "./SaasB2bAnalyticsAgent";

export function resetAllSaasB2bAgentsForTests(): void {
  SaasB2bDemoAgent.reset();
  SaasB2bLeadGenAgent.reset();
  SaasB2bOnboardingAgent.reset();
  SaasB2bSEOAgent.reset();
  SaasB2bSocialAgent.reset();
  SaasB2bEmailAgent.reset();
  SaasB2bReviewsAgent.reset();
  SaasB2bAnalyticsAgent.reset();
}
