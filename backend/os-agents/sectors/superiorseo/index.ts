import { SuperiorSeoAnalyticsAgent } from "./SuperiorSeoAnalyticsAgent";
import { SuperiorSeoBacklinkAgent } from "./SuperiorSeoBacklinkAgent";
import { SuperiorSeoCompetitorAgent } from "./SuperiorSeoCompetitorAgent";
import { SuperiorSeoContentAgent } from "./SuperiorSeoContentAgent";
import { SuperiorSeoKeywordAgent } from "./SuperiorSeoKeywordAgent";
import { SuperiorSeoLocalAgent } from "./SuperiorSeoLocalAgent";
import { SuperiorSeoOnPageAgent } from "./SuperiorSeoOnPageAgent";
import { SuperiorSeoTechnicalAgent } from "./SuperiorSeoTechnicalAgent";

export type { SuperiorSeoInput, SuperiorSeoOutput } from "./shared";
export { parseSuperiorSeoLlmJson, buildSuperiorSeoPrompt, llmOpts as superiorseoLlmOpts } from "./shared";

export {
  SuperiorSeoKeywordAgent,
  getSuperiorSeoKeywordAgent,
  resetSuperiorSeoKeywordAgentForTests,
} from "./SuperiorSeoKeywordAgent";
export {
  SuperiorSeoOnPageAgent,
  getSuperiorSeoOnPageAgent,
  resetSuperiorSeoOnPageAgentForTests,
} from "./SuperiorSeoOnPageAgent";
export {
  SuperiorSeoTechnicalAgent,
  getSuperiorSeoTechnicalAgent,
  resetSuperiorSeoTechnicalAgentForTests,
} from "./SuperiorSeoTechnicalAgent";
export {
  SuperiorSeoContentAgent,
  getSuperiorSeoContentAgent,
  resetSuperiorSeoContentAgentForTests,
} from "./SuperiorSeoContentAgent";
export {
  SuperiorSeoBacklinkAgent,
  getSuperiorSeoBacklinkAgent,
  resetSuperiorSeoBacklinkAgentForTests,
} from "./SuperiorSeoBacklinkAgent";
export {
  SuperiorSeoLocalAgent,
  getSuperiorSeoLocalAgent,
  resetSuperiorSeoLocalAgentForTests,
} from "./SuperiorSeoLocalAgent";
export {
  SuperiorSeoAnalyticsAgent,
  getSuperiorSeoAnalyticsAgent,
  resetSuperiorSeoAnalyticsAgentForTests,
} from "./SuperiorSeoAnalyticsAgent";
export {
  SuperiorSeoCompetitorAgent,
  getSuperiorSeoCompetitorAgent,
  resetSuperiorSeoCompetitorAgentForTests,
} from "./SuperiorSeoCompetitorAgent";

export function resetAllSuperiorSeoAgentsForTests(): void {
  SuperiorSeoKeywordAgent.reset();
  SuperiorSeoOnPageAgent.reset();
  SuperiorSeoTechnicalAgent.reset();
  SuperiorSeoContentAgent.reset();
  SuperiorSeoBacklinkAgent.reset();
  SuperiorSeoLocalAgent.reset();
  SuperiorSeoAnalyticsAgent.reset();
  SuperiorSeoCompetitorAgent.reset();
}
