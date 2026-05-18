import { SuperiorEmailABAgent } from "./SuperiorEmailABAgent";
import { SuperiorEmailAnalyticsAgent } from "./SuperiorEmailAnalyticsAgent";
import { SuperiorEmailAutomationAgent } from "./SuperiorEmailAutomationAgent";
import { SuperiorEmailCopyAgent } from "./SuperiorEmailCopyAgent";
import { SuperiorEmailDeliverabilityAgent } from "./SuperiorEmailDeliverabilityAgent";
import { SuperiorEmailDesignAgent } from "./SuperiorEmailDesignAgent";
import { SuperiorEmailPersonalizationAgent } from "./SuperiorEmailPersonalizationAgent";
import { SuperiorEmailTimingAgent } from "./SuperiorEmailTimingAgent";

export type { SuperiorEmailInput, SuperiorEmailOutput } from "./shared";
export { parseSuperiorEmailLlmJson, buildSuperiorEmailPrompt, llmOpts as superiorEmailLlmOpts } from "./shared";

export {
  SuperiorEmailPersonalizationAgent,
  getSuperiorEmailPersonalizationAgent,
  resetSuperiorEmailPersonalizationAgentForTests,
} from "./SuperiorEmailPersonalizationAgent";
export {
  SuperiorEmailTimingAgent,
  getSuperiorEmailTimingAgent,
  resetSuperiorEmailTimingAgentForTests,
} from "./SuperiorEmailTimingAgent";
export {
  SuperiorEmailCopyAgent,
  getSuperiorEmailCopyAgent,
  resetSuperiorEmailCopyAgentForTests,
} from "./SuperiorEmailCopyAgent";
export {
  SuperiorEmailDesignAgent,
  getSuperiorEmailDesignAgent,
  resetSuperiorEmailDesignAgentForTests,
} from "./SuperiorEmailDesignAgent";
export {
  SuperiorEmailDeliverabilityAgent,
  getSuperiorEmailDeliverabilityAgent,
  resetSuperiorEmailDeliverabilityAgentForTests,
} from "./SuperiorEmailDeliverabilityAgent";
export {
  SuperiorEmailAutomationAgent,
  getSuperiorEmailAutomationAgent,
  resetSuperiorEmailAutomationAgentForTests,
} from "./SuperiorEmailAutomationAgent";
export {
  SuperiorEmailABAgent,
  getSuperiorEmailABAgent,
  resetSuperiorEmailABAgentForTests,
} from "./SuperiorEmailABAgent";
export {
  SuperiorEmailAnalyticsAgent,
  getSuperiorEmailAnalyticsAgent,
  resetSuperiorEmailAnalyticsAgentForTests,
} from "./SuperiorEmailAnalyticsAgent";

export function resetAllSuperiorEmailAgentsForTests(): void {
  SuperiorEmailPersonalizationAgent.reset();
  SuperiorEmailTimingAgent.reset();
  SuperiorEmailCopyAgent.reset();
  SuperiorEmailDesignAgent.reset();
  SuperiorEmailDeliverabilityAgent.reset();
  SuperiorEmailAutomationAgent.reset();
  SuperiorEmailABAgent.reset();
  SuperiorEmailAnalyticsAgent.reset();
}
