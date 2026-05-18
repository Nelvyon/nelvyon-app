import { SeoContentGapAgent } from "./SeoContentGapAgent";
import { SeoContentOptimizerAgent } from "./SeoContentOptimizerAgent";
import { SeoEEATBoosterAgent } from "./SeoEEATBoosterAgent";
import { SeoInternalLinkingAgent } from "./SeoInternalLinkingAgent";
import { SeoKeywordResearchAgent } from "./SeoKeywordResearchAgent";
import { SeoSchemaMarkupAgent } from "./SeoSchemaMarkupAgent";
import { SeoSGEReadinessAgent } from "./SeoSGEReadinessAgent";
import { SeoTitleMetaAgent } from "./SeoTitleMetaAgent";

export type { SeoInput, SeoOutput } from "./shared";
export { parseSeoLlmJson, buildRankPrompt, llmOpts as seoLlmOpts } from "./shared";

export {
  SeoKeywordResearchAgent,
  getSeoKeywordResearchAgent,
  resetSeoKeywordResearchAgentForTests,
} from "./SeoKeywordResearchAgent";
export {
  SeoContentOptimizerAgent,
  getSeoContentOptimizerAgent,
  resetSeoContentOptimizerAgentForTests,
} from "./SeoContentOptimizerAgent";
export {
  SeoTitleMetaAgent,
  getSeoTitleMetaAgent,
  resetSeoTitleMetaAgentForTests,
} from "./SeoTitleMetaAgent";
export {
  SeoContentGapAgent,
  getSeoContentGapAgent,
  resetSeoContentGapAgentForTests,
} from "./SeoContentGapAgent";
export {
  SeoInternalLinkingAgent,
  getSeoInternalLinkingAgent,
  resetSeoInternalLinkingAgentForTests,
} from "./SeoInternalLinkingAgent";
export {
  SeoSchemaMarkupAgent,
  getSeoSchemaMarkupAgent,
  resetSeoSchemaMarkupAgentForTests,
} from "./SeoSchemaMarkupAgent";
export {
  SeoEEATBoosterAgent,
  getSeoEEATBoosterAgent,
  resetSeoEEATBoosterAgentForTests,
} from "./SeoEEATBoosterAgent";
export {
  SeoSGEReadinessAgent,
  getSeoSGEReadinessAgent,
  resetSeoSGEReadinessAgentForTests,
} from "./SeoSGEReadinessAgent";

export function resetAllSeoAgentsForTests(): void {
  SeoKeywordResearchAgent.reset();
  SeoContentOptimizerAgent.reset();
  SeoTitleMetaAgent.reset();
  SeoContentGapAgent.reset();
  SeoInternalLinkingAgent.reset();
  SeoSchemaMarkupAgent.reset();
  SeoEEATBoosterAgent.reset();
  SeoSGEReadinessAgent.reset();
}
