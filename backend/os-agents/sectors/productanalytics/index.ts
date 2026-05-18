import { DAUMAUAgent } from "./DAUMAUAgent";
import { EventTrackingAgent } from "./EventTrackingAgent";
import { ExperimentAnalyticsAgent } from "./ExperimentAnalyticsAgent";
import { FeatureAdoptionAgent } from "./FeatureAdoptionAgent";
import { FunnelAnalyticsAgent } from "./FunnelAnalyticsAgent";
import { PredictiveProductAgent } from "./PredictiveProductAgent";
import { RetentionAnalyticsAgent } from "./RetentionAnalyticsAgent";
import { UserJourneyAgent } from "./UserJourneyAgent";

export type { ProductAnalyticsInput, ProductAnalyticsOutput } from "./shared";
export { parseProductAnalyticsLlmJson, buildProductAnalyticsPrompt, llmOpts as productanalyticsLlmOpts } from "./shared";

export {
  EventTrackingAgent,
  getEventTrackingAgent,
  resetEventTrackingAgentForTests,
} from "./EventTrackingAgent";
export {
  FunnelAnalyticsAgent,
  getFunnelAnalyticsAgent,
  resetFunnelAnalyticsAgentForTests,
} from "./FunnelAnalyticsAgent";
export {
  RetentionAnalyticsAgent,
  getRetentionAnalyticsAgent,
  resetRetentionAnalyticsAgentForTests,
} from "./RetentionAnalyticsAgent";
export {
  FeatureAdoptionAgent,
  getFeatureAdoptionAgent,
  resetFeatureAdoptionAgentForTests,
} from "./FeatureAdoptionAgent";
export { UserJourneyAgent, getUserJourneyAgent, resetUserJourneyAgentForTests } from "./UserJourneyAgent";
export { DAUMAUAgent, getDAUMAUAgent, resetDAUMAUAgentForTests } from "./DAUMAUAgent";
export {
  ExperimentAnalyticsAgent,
  getExperimentAnalyticsAgent,
  resetExperimentAnalyticsAgentForTests,
} from "./ExperimentAnalyticsAgent";
export {
  PredictiveProductAgent,
  getPredictiveProductAgent,
  resetPredictiveProductAgentForTests,
} from "./PredictiveProductAgent";

export function resetAllProductAnalyticsAgentsForTests(): void {
  EventTrackingAgent.reset();
  FunnelAnalyticsAgent.reset();
  RetentionAnalyticsAgent.reset();
  FeatureAdoptionAgent.reset();
  UserJourneyAgent.reset();
  DAUMAUAgent.reset();
  ExperimentAnalyticsAgent.reset();
  PredictiveProductAgent.reset();
}
