import { KnowledgeBaseAIAnalyticsAgent } from "./KnowledgeBaseAIAnalyticsAgent";
import { KnowledgeBaseAIIngestAgent } from "./KnowledgeBaseAIIngestAgent";
import { KnowledgeBaseAIMultilingualAgent } from "./KnowledgeBaseAIMultilingualAgent";
import { KnowledgeBaseAIOrganizeAgent } from "./KnowledgeBaseAIOrganizeAgent";
import { KnowledgeBaseAIPersonalizationAgent } from "./KnowledgeBaseAIPersonalizationAgent";
import { KnowledgeBaseAISearchAgent } from "./KnowledgeBaseAISearchAgent";
import { KnowledgeBaseAIUpdateAgent } from "./KnowledgeBaseAIUpdateAgent";
import { KnowledgeBaseAIWriterAgent } from "./KnowledgeBaseAIWriterAgent";

export type { KnowledgeBaseAIInput, KnowledgeBaseAIOutput } from "./shared";
export {
  parseKnowledgeBaseAILlmJson,
  buildKnowledgeBaseAIPrompt,
  llmOpts as knowledgebaseaiLlmOpts,
} from "./shared";

export {
  KnowledgeBaseAIIngestAgent,
  getKnowledgeBaseAIIngestAgent,
  resetKnowledgeBaseAIIngestAgentForTests,
} from "./KnowledgeBaseAIIngestAgent";
export {
  KnowledgeBaseAIOrganizeAgent,
  getKnowledgeBaseAIOrganizeAgent,
  resetKnowledgeBaseAIOrganizeAgentForTests,
} from "./KnowledgeBaseAIOrganizeAgent";
export {
  KnowledgeBaseAIWriterAgent,
  getKnowledgeBaseAIWriterAgent,
  resetKnowledgeBaseAIWriterAgentForTests,
} from "./KnowledgeBaseAIWriterAgent";
export {
  KnowledgeBaseAISearchAgent,
  getKnowledgeBaseAISearchAgent,
  resetKnowledgeBaseAISearchAgentForTests,
} from "./KnowledgeBaseAISearchAgent";
export {
  KnowledgeBaseAIUpdateAgent,
  getKnowledgeBaseAIUpdateAgent,
  resetKnowledgeBaseAIUpdateAgentForTests,
} from "./KnowledgeBaseAIUpdateAgent";
export {
  KnowledgeBaseAIAnalyticsAgent,
  getKnowledgeBaseAIAnalyticsAgent,
  resetKnowledgeBaseAIAnalyticsAgentForTests,
} from "./KnowledgeBaseAIAnalyticsAgent";
export {
  KnowledgeBaseAIPersonalizationAgent,
  getKnowledgeBaseAIPersonalizationAgent,
  resetKnowledgeBaseAIPersonalizationAgentForTests,
} from "./KnowledgeBaseAIPersonalizationAgent";
export {
  KnowledgeBaseAIMultilingualAgent,
  getKnowledgeBaseAIMultilingualAgent,
  resetKnowledgeBaseAIMultilingualAgentForTests,
} from "./KnowledgeBaseAIMultilingualAgent";

export function resetAllKnowledgeBaseAIAgentsForTests(): void {
  KnowledgeBaseAIIngestAgent.reset();
  KnowledgeBaseAIOrganizeAgent.reset();
  KnowledgeBaseAIWriterAgent.reset();
  KnowledgeBaseAISearchAgent.reset();
  KnowledgeBaseAIUpdateAgent.reset();
  KnowledgeBaseAIAnalyticsAgent.reset();
  KnowledgeBaseAIPersonalizationAgent.reset();
  KnowledgeBaseAIMultilingualAgent.reset();
}
