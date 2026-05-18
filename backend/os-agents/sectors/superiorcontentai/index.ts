import { SuperiorContentAIAnalyticsAgent } from "./SuperiorContentAIAnalyticsAgent";
import { SuperiorContentAIImageAgent } from "./SuperiorContentAIImageAgent";
import { SuperiorContentAIPersonalizationAgent } from "./SuperiorContentAIPersonalizationAgent";
import { SuperiorContentAIRepurposeAgent } from "./SuperiorContentAIRepurposeAgent";
import { SuperiorContentAISEOAgent } from "./SuperiorContentAISEOAgent";
import { SuperiorContentAIStrategyAgent } from "./SuperiorContentAIStrategyAgent";
import { SuperiorContentAITranslatorAgent } from "./SuperiorContentAITranslatorAgent";
import { SuperiorContentAIWriterAgent } from "./SuperiorContentAIWriterAgent";

export type { SuperiorContentAIInput, SuperiorContentAIOutput } from "./shared";
export {
  parseSuperiorContentAILlmJson,
  buildSuperiorContentAIPrompt,
  llmOpts as superiorcontentaiLlmOpts,
} from "./shared";

export {
  SuperiorContentAIStrategyAgent,
  getSuperiorContentAIStrategyAgent,
  resetSuperiorContentAIStrategyAgentForTests,
} from "./SuperiorContentAIStrategyAgent";
export {
  SuperiorContentAIWriterAgent,
  getSuperiorContentAIWriterAgent,
  resetSuperiorContentAIWriterAgentForTests,
} from "./SuperiorContentAIWriterAgent";
export {
  SuperiorContentAIImageAgent,
  getSuperiorContentAIImageAgent,
  resetSuperiorContentAIImageAgentForTests,
} from "./SuperiorContentAIImageAgent";
export {
  SuperiorContentAISEOAgent,
  getSuperiorContentAISEOAgent,
  resetSuperiorContentAISEOAgentForTests,
} from "./SuperiorContentAISEOAgent";
export {
  SuperiorContentAIRepurposeAgent,
  getSuperiorContentAIRepurposeAgent,
  resetSuperiorContentAIRepurposeAgentForTests,
} from "./SuperiorContentAIRepurposeAgent";
export {
  SuperiorContentAITranslatorAgent,
  getSuperiorContentAITranslatorAgent,
  resetSuperiorContentAITranslatorAgentForTests,
} from "./SuperiorContentAITranslatorAgent";
export {
  SuperiorContentAIAnalyticsAgent,
  getSuperiorContentAIAnalyticsAgent,
  resetSuperiorContentAIAnalyticsAgentForTests,
} from "./SuperiorContentAIAnalyticsAgent";
export {
  SuperiorContentAIPersonalizationAgent,
  getSuperiorContentAIPersonalizationAgent,
  resetSuperiorContentAIPersonalizationAgentForTests,
} from "./SuperiorContentAIPersonalizationAgent";

export function resetAllSuperiorContentAIAgentsForTests(): void {
  SuperiorContentAIStrategyAgent.reset();
  SuperiorContentAIWriterAgent.reset();
  SuperiorContentAIImageAgent.reset();
  SuperiorContentAISEOAgent.reset();
  SuperiorContentAIRepurposeAgent.reset();
  SuperiorContentAITranslatorAgent.reset();
  SuperiorContentAIAnalyticsAgent.reset();
  SuperiorContentAIPersonalizationAgent.reset();
}
