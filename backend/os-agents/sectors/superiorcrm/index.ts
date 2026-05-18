import { SuperiorCrmAnalyticsAgent } from "./SuperiorCrmAnalyticsAgent";
import { SuperiorCrmAutomationAgent } from "./SuperiorCrmAutomationAgent";
import { SuperiorCrmEnrichmentAgent } from "./SuperiorCrmEnrichmentAgent";
import { SuperiorCrmForecastAgent } from "./SuperiorCrmForecastAgent";
import { SuperiorCrmLeadScoringAgent } from "./SuperiorCrmLeadScoringAgent";
import { SuperiorCrmPersonalizationAgent } from "./SuperiorCrmPersonalizationAgent";
import { SuperiorCrmPipelineAgent } from "./SuperiorCrmPipelineAgent";
import { SuperiorCrmRetentionAgent } from "./SuperiorCrmRetentionAgent";

export type { SuperiorCrmInput, SuperiorCrmOutput } from "./shared";
export { parseSuperiorCrmLlmJson, buildSuperiorCrmPrompt, llmOpts as superiorcrmLlmOpts } from "./shared";

export {
  SuperiorCrmLeadScoringAgent,
  getSuperiorCrmLeadScoringAgent,
  resetSuperiorCrmLeadScoringAgentForTests,
} from "./SuperiorCrmLeadScoringAgent";
export {
  SuperiorCrmPipelineAgent,
  getSuperiorCrmPipelineAgent,
  resetSuperiorCrmPipelineAgentForTests,
} from "./SuperiorCrmPipelineAgent";
export {
  SuperiorCrmPersonalizationAgent,
  getSuperiorCrmPersonalizationAgent,
  resetSuperiorCrmPersonalizationAgentForTests,
} from "./SuperiorCrmPersonalizationAgent";
export {
  SuperiorCrmAutomationAgent,
  getSuperiorCrmAutomationAgent,
  resetSuperiorCrmAutomationAgentForTests,
} from "./SuperiorCrmAutomationAgent";
export {
  SuperiorCrmAnalyticsAgent,
  getSuperiorCrmAnalyticsAgent,
  resetSuperiorCrmAnalyticsAgentForTests,
} from "./SuperiorCrmAnalyticsAgent";
export {
  SuperiorCrmEnrichmentAgent,
  getSuperiorCrmEnrichmentAgent,
  resetSuperiorCrmEnrichmentAgentForTests,
} from "./SuperiorCrmEnrichmentAgent";
export {
  SuperiorCrmRetentionAgent,
  getSuperiorCrmRetentionAgent,
  resetSuperiorCrmRetentionAgentForTests,
} from "./SuperiorCrmRetentionAgent";
export {
  SuperiorCrmForecastAgent,
  getSuperiorCrmForecastAgent,
  resetSuperiorCrmForecastAgentForTests,
} from "./SuperiorCrmForecastAgent";

export function resetAllSuperiorCrmAgentsForTests(): void {
  SuperiorCrmLeadScoringAgent.reset();
  SuperiorCrmPipelineAgent.reset();
  SuperiorCrmPersonalizationAgent.reset();
  SuperiorCrmAutomationAgent.reset();
  SuperiorCrmAnalyticsAgent.reset();
  SuperiorCrmEnrichmentAgent.reset();
  SuperiorCrmRetentionAgent.reset();
  SuperiorCrmForecastAgent.reset();
}
