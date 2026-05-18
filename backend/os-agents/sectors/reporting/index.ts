import { ReportingClientStoryAgent } from "./ReportingClientStoryAgent";
import { ReportingCompetitiveContextAgent } from "./ReportingCompetitiveContextAgent";
import { ReportingExecutiveSummaryAgent } from "./ReportingExecutiveSummaryAgent";
import { ReportingInsightExtractorAgent } from "./ReportingInsightExtractorAgent";
import { ReportingKpiNarrativeAgent } from "./ReportingKpiNarrativeAgent";
import { ReportingNextStepsAgent } from "./ReportingNextStepsAgent";
import { ReportingRecommendationAgent } from "./ReportingRecommendationAgent";
import { ReportingVisualDescriptorAgent } from "./ReportingVisualDescriptorAgent";

export type { ReportingInput, ReportingOutput } from "./shared";
export { parseReportingLlmJson, buildClarityPrompt, llmOpts as reportingLlmOpts } from "./shared";

export {
  ReportingExecutiveSummaryAgent,
  getReportingExecutiveSummaryAgent,
  resetReportingExecutiveSummaryAgentForTests,
} from "./ReportingExecutiveSummaryAgent";
export {
  ReportingKpiNarrativeAgent,
  getReportingKpiNarrativeAgent,
  resetReportingKpiNarrativeAgentForTests,
} from "./ReportingKpiNarrativeAgent";
export {
  ReportingInsightExtractorAgent,
  getReportingInsightExtractorAgent,
  resetReportingInsightExtractorAgentForTests,
} from "./ReportingInsightExtractorAgent";
export {
  ReportingRecommendationAgent,
  getReportingRecommendationAgent,
  resetReportingRecommendationAgentForTests,
} from "./ReportingRecommendationAgent";
export {
  ReportingCompetitiveContextAgent,
  getReportingCompetitiveContextAgent,
  resetReportingCompetitiveContextAgentForTests,
} from "./ReportingCompetitiveContextAgent";
export {
  ReportingVisualDescriptorAgent,
  getReportingVisualDescriptorAgent,
  resetReportingVisualDescriptorAgentForTests,
} from "./ReportingVisualDescriptorAgent";
export {
  ReportingClientStoryAgent,
  getReportingClientStoryAgent,
  resetReportingClientStoryAgentForTests,
} from "./ReportingClientStoryAgent";
export {
  ReportingNextStepsAgent,
  getReportingNextStepsAgent,
  resetReportingNextStepsAgentForTests,
} from "./ReportingNextStepsAgent";

export function resetAllReportingAgentsForTests(): void {
  ReportingExecutiveSummaryAgent.reset();
  ReportingKpiNarrativeAgent.reset();
  ReportingInsightExtractorAgent.reset();
  ReportingRecommendationAgent.reset();
  ReportingCompetitiveContextAgent.reset();
  ReportingVisualDescriptorAgent.reset();
  ReportingClientStoryAgent.reset();
  ReportingNextStepsAgent.reset();
}
