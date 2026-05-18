import { MobileASORankingAgent } from "./MobileASORankingAgent";
import { MobileDeepLinkStrategyAgent } from "./MobileDeepLinkStrategyAgent";
import { MobileInAppMessagingAgent } from "./MobileInAppMessagingAgent";
import { MobileOnboardingFlowAgent } from "./MobileOnboardingFlowAgent";
import { MobilePushNotificationAgent } from "./MobilePushNotificationAgent";
import { MobileRatingRequestAgent } from "./MobileRatingRequestAgent";
import { MobileRetentionFlowAgent } from "./MobileRetentionFlowAgent";
import { MobileRevenueOptimizationAgent } from "./MobileRevenueOptimizationAgent";

export type { MobileInput, MobileOutput, MobilePlatform } from "./shared";
export { parseMobileLlmJson, buildInstallPrompt, llmOpts as mobileLlmOpts } from "./shared";

export {
  MobileOnboardingFlowAgent,
  getMobileOnboardingFlowAgent,
  resetMobileOnboardingFlowAgentForTests,
} from "./MobileOnboardingFlowAgent";
export {
  MobilePushNotificationAgent,
  getMobilePushNotificationAgent,
  resetMobilePushNotificationAgentForTests,
} from "./MobilePushNotificationAgent";
export {
  MobileASORankingAgent,
  getMobileASORankingAgent,
  resetMobileASORankingAgentForTests,
} from "./MobileASORankingAgent";
export {
  MobileRetentionFlowAgent,
  getMobileRetentionFlowAgent,
  resetMobileRetentionFlowAgentForTests,
} from "./MobileRetentionFlowAgent";
export {
  MobileInAppMessagingAgent,
  getMobileInAppMessagingAgent,
  resetMobileInAppMessagingAgentForTests,
} from "./MobileInAppMessagingAgent";
export {
  MobileRatingRequestAgent,
  getMobileRatingRequestAgent,
  resetMobileRatingRequestAgentForTests,
} from "./MobileRatingRequestAgent";
export {
  MobileDeepLinkStrategyAgent,
  getMobileDeepLinkStrategyAgent,
  resetMobileDeepLinkStrategyAgentForTests,
} from "./MobileDeepLinkStrategyAgent";
export {
  MobileRevenueOptimizationAgent,
  getMobileRevenueOptimizationAgent,
  resetMobileRevenueOptimizationAgentForTests,
} from "./MobileRevenueOptimizationAgent";

export function resetAllMobileAgentsForTests(): void {
  MobileOnboardingFlowAgent.reset();
  MobilePushNotificationAgent.reset();
  MobileASORankingAgent.reset();
  MobileRetentionFlowAgent.reset();
  MobileInAppMessagingAgent.reset();
  MobileRatingRequestAgent.reset();
  MobileDeepLinkStrategyAgent.reset();
  MobileRevenueOptimizationAgent.reset();
}
