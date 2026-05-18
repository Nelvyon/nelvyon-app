import { CESAgent } from "./CESAgent";
import { CSATAgent } from "./CSATAgent";
import { ExperienceBenchmarkAgent } from "./ExperienceBenchmarkAgent";
import { FeedbackActionAgent } from "./FeedbackActionAgent";
import { JourneyAnalyticsAgent } from "./JourneyAnalyticsAgent";
import { NPSAgent } from "./NPSAgent";
import { SentimentAnalysisAgent } from "./SentimentAnalysisAgent";
import { VOCCollectionAgent } from "./VOCCollectionAgent";

export type { ExperienceManagementInput, ExperienceManagementOutput } from "./shared";
export {
  parseExperienceManagementLlmJson,
  buildExperienceManagementPrompt,
  llmOpts as experiencemanagementLlmOpts,
} from "./shared";

export { VOCCollectionAgent, getVOCCollectionAgent, resetVOCCollectionAgentForTests } from "./VOCCollectionAgent";
export {
  SentimentAnalysisAgent,
  getSentimentAnalysisAgent,
  resetSentimentAnalysisAgentForTests,
} from "./SentimentAnalysisAgent";
export { NPSAgent, getNPSAgent, resetNPSAgentForTests } from "./NPSAgent";
export { CESAgent, getCESAgent, resetCESAgentForTests } from "./CESAgent";
export { CSATAgent, getCSATAgent, resetCSATAgentForTests } from "./CSATAgent";
export {
  JourneyAnalyticsAgent,
  getJourneyAnalyticsAgent,
  resetJourneyAnalyticsAgentForTests,
} from "./JourneyAnalyticsAgent";
export {
  FeedbackActionAgent,
  getFeedbackActionAgent,
  resetFeedbackActionAgentForTests,
} from "./FeedbackActionAgent";
export {
  ExperienceBenchmarkAgent,
  getExperienceBenchmarkAgent,
  resetExperienceBenchmarkAgentForTests,
} from "./ExperienceBenchmarkAgent";

export function resetAllExperienceManagementAgentsForTests(): void {
  VOCCollectionAgent.reset();
  SentimentAnalysisAgent.reset();
  NPSAgent.reset();
  CESAgent.reset();
  CSATAgent.reset();
  JourneyAnalyticsAgent.reset();
  FeedbackActionAgent.reset();
  ExperienceBenchmarkAgent.reset();
}
