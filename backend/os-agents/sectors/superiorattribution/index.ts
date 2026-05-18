import { SuperiorAttributionAnomalyAgent } from "./SuperiorAttributionAnomalyAgent";
import { SuperiorAttributionChannelAgent } from "./SuperiorAttributionChannelAgent";
import { SuperiorAttributionForecastAgent } from "./SuperiorAttributionForecastAgent";
import { SuperiorAttributionJourneyAgent } from "./SuperiorAttributionJourneyAgent";
import { SuperiorAttributionMultiTouchAgent } from "./SuperiorAttributionMultiTouchAgent";
import { SuperiorAttributionOfflineAgent } from "./SuperiorAttributionOfflineAgent";
import { SuperiorAttributionReportAgent } from "./SuperiorAttributionReportAgent";
import { SuperiorAttributionRevenueAgent } from "./SuperiorAttributionRevenueAgent";

export type { SuperiorAttributionInput, SuperiorAttributionOutput } from "./shared";
export {
  parseSuperiorAttributionLlmJson,
  buildSuperiorAttributionPrompt,
  llmOpts as superiorattributionLlmOpts,
} from "./shared";

export {
  SuperiorAttributionMultiTouchAgent,
  getSuperiorAttributionMultiTouchAgent,
  resetSuperiorAttributionMultiTouchAgentForTests,
} from "./SuperiorAttributionMultiTouchAgent";
export {
  SuperiorAttributionChannelAgent,
  getSuperiorAttributionChannelAgent,
  resetSuperiorAttributionChannelAgentForTests,
} from "./SuperiorAttributionChannelAgent";
export {
  SuperiorAttributionRevenueAgent,
  getSuperiorAttributionRevenueAgent,
  resetSuperiorAttributionRevenueAgentForTests,
} from "./SuperiorAttributionRevenueAgent";
export {
  SuperiorAttributionJourneyAgent,
  getSuperiorAttributionJourneyAgent,
  resetSuperiorAttributionJourneyAgentForTests,
} from "./SuperiorAttributionJourneyAgent";
export {
  SuperiorAttributionOfflineAgent,
  getSuperiorAttributionOfflineAgent,
  resetSuperiorAttributionOfflineAgentForTests,
} from "./SuperiorAttributionOfflineAgent";
export {
  SuperiorAttributionForecastAgent,
  getSuperiorAttributionForecastAgent,
  resetSuperiorAttributionForecastAgentForTests,
} from "./SuperiorAttributionForecastAgent";
export {
  SuperiorAttributionAnomalyAgent,
  getSuperiorAttributionAnomalyAgent,
  resetSuperiorAttributionAnomalyAgentForTests,
} from "./SuperiorAttributionAnomalyAgent";
export {
  SuperiorAttributionReportAgent,
  getSuperiorAttributionReportAgent,
  resetSuperiorAttributionReportAgentForTests,
} from "./SuperiorAttributionReportAgent";

export function resetAllSuperiorAttributionAgentsForTests(): void {
  SuperiorAttributionMultiTouchAgent.reset();
  SuperiorAttributionChannelAgent.reset();
  SuperiorAttributionRevenueAgent.reset();
  SuperiorAttributionJourneyAgent.reset();
  SuperiorAttributionOfflineAgent.reset();
  SuperiorAttributionForecastAgent.reset();
  SuperiorAttributionAnomalyAgent.reset();
  SuperiorAttributionReportAgent.reset();
}
