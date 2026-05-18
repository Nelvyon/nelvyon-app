import { DemoAnalyticsInsightAgent } from "./DemoAnalyticsInsightAgent";
import { DemoConversionNudgeAgent } from "./DemoConversionNudgeAgent";
import { DemoFollowUpSequenceAgent } from "./DemoFollowUpSequenceAgent";
import { DemoObjectionHandlerAgent } from "./DemoObjectionHandlerAgent";
import { DemoPersonalizationAgent } from "./DemoPersonalizationAgent";
import { DemoSandboxDataAgent } from "./DemoSandboxDataAgent";
import { DemoScriptGeneratorAgent } from "./DemoScriptGeneratorAgent";
import { DemoValuePropositionAgent } from "./DemoValuePropositionAgent";

export type { DemoInput, DemoOutput } from "./shared";
export { parseDemoLlmJson, buildShowPrompt, llmOpts as demoLlmOpts } from "./shared";

export {
  DemoPersonalizationAgent,
  getDemoPersonalizationAgent,
  resetDemoPersonalizationAgentForTests,
} from "./DemoPersonalizationAgent";
export {
  DemoScriptGeneratorAgent,
  getDemoScriptGeneratorAgent,
  resetDemoScriptGeneratorAgentForTests,
} from "./DemoScriptGeneratorAgent";
export {
  DemoValuePropositionAgent,
  getDemoValuePropositionAgent,
  resetDemoValuePropositionAgentForTests,
} from "./DemoValuePropositionAgent";
export {
  DemoObjectionHandlerAgent,
  getDemoObjectionHandlerAgent,
  resetDemoObjectionHandlerAgentForTests,
} from "./DemoObjectionHandlerAgent";
export {
  DemoSandboxDataAgent,
  getDemoSandboxDataAgent,
  resetDemoSandboxDataAgentForTests,
} from "./DemoSandboxDataAgent";
export {
  DemoConversionNudgeAgent,
  getDemoConversionNudgeAgent,
  resetDemoConversionNudgeAgentForTests,
} from "./DemoConversionNudgeAgent";
export {
  DemoFollowUpSequenceAgent,
  getDemoFollowUpSequenceAgent,
  resetDemoFollowUpSequenceAgentForTests,
} from "./DemoFollowUpSequenceAgent";
export {
  DemoAnalyticsInsightAgent,
  getDemoAnalyticsInsightAgent,
  resetDemoAnalyticsInsightAgentForTests,
} from "./DemoAnalyticsInsightAgent";

export function resetAllDemoAgentsForTests(): void {
  DemoPersonalizationAgent.reset();
  DemoScriptGeneratorAgent.reset();
  DemoValuePropositionAgent.reset();
  DemoObjectionHandlerAgent.reset();
  DemoSandboxDataAgent.reset();
  DemoConversionNudgeAgent.reset();
  DemoFollowUpSequenceAgent.reset();
  DemoAnalyticsInsightAgent.reset();
}
