import { SuperiorLandingPageABAgent } from "./SuperiorLandingPageABAgent";
import { SuperiorLandingPageAnalyticsAgent } from "./SuperiorLandingPageAnalyticsAgent";
import { SuperiorLandingPageBuilderAgent } from "./SuperiorLandingPageBuilderAgent";
import { SuperiorLandingPageConversionAgent } from "./SuperiorLandingPageConversionAgent";
import { SuperiorLandingPageCopyAgent } from "./SuperiorLandingPageCopyAgent";
import { SuperiorLandingPagePersonalizationAgent } from "./SuperiorLandingPagePersonalizationAgent";
import { SuperiorLandingPageSEOAgent } from "./SuperiorLandingPageSEOAgent";
import { SuperiorLandingPageSpeedAgent } from "./SuperiorLandingPageSpeedAgent";

export type { SuperiorLandingPageInput, SuperiorLandingPageOutput } from "./shared";
export {
  parseSuperiorLandingPageLlmJson,
  buildSuperiorLandingPagePrompt,
  llmOpts as superiorlandingpageLlmOpts,
} from "./shared";

export {
  SuperiorLandingPageBuilderAgent,
  getSuperiorLandingPageBuilderAgent,
  resetSuperiorLandingPageBuilderAgentForTests,
} from "./SuperiorLandingPageBuilderAgent";
export {
  SuperiorLandingPageCopyAgent,
  getSuperiorLandingPageCopyAgent,
  resetSuperiorLandingPageCopyAgentForTests,
} from "./SuperiorLandingPageCopyAgent";
export {
  SuperiorLandingPageSEOAgent,
  getSuperiorLandingPageSEOAgent,
  resetSuperiorLandingPageSEOAgentForTests,
} from "./SuperiorLandingPageSEOAgent";
export {
  SuperiorLandingPageABAgent,
  getSuperiorLandingPageABAgent,
  resetSuperiorLandingPageABAgentForTests,
} from "./SuperiorLandingPageABAgent";
export {
  SuperiorLandingPagePersonalizationAgent,
  getSuperiorLandingPagePersonalizationAgent,
  resetSuperiorLandingPagePersonalizationAgentForTests,
} from "./SuperiorLandingPagePersonalizationAgent";
export {
  SuperiorLandingPageAnalyticsAgent,
  getSuperiorLandingPageAnalyticsAgent,
  resetSuperiorLandingPageAnalyticsAgentForTests,
} from "./SuperiorLandingPageAnalyticsAgent";
export {
  SuperiorLandingPageSpeedAgent,
  getSuperiorLandingPageSpeedAgent,
  resetSuperiorLandingPageSpeedAgentForTests,
} from "./SuperiorLandingPageSpeedAgent";
export {
  SuperiorLandingPageConversionAgent,
  getSuperiorLandingPageConversionAgent,
  resetSuperiorLandingPageConversionAgentForTests,
} from "./SuperiorLandingPageConversionAgent";

export function resetAllSuperiorLandingPageAgentsForTests(): void {
  SuperiorLandingPageBuilderAgent.reset();
  SuperiorLandingPageCopyAgent.reset();
  SuperiorLandingPageSEOAgent.reset();
  SuperiorLandingPageABAgent.reset();
  SuperiorLandingPagePersonalizationAgent.reset();
  SuperiorLandingPageAnalyticsAgent.reset();
  SuperiorLandingPageSpeedAgent.reset();
  SuperiorLandingPageConversionAgent.reset();
}
