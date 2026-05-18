import { AppBuilderWhiteLabelAnalyticsAgent } from "./AppBuilderWhiteLabelAnalyticsAgent";
import { AppBuilderWhiteLabelBuilderAgent } from "./AppBuilderWhiteLabelBuilderAgent";
import { AppBuilderWhiteLabelDesignAgent } from "./AppBuilderWhiteLabelDesignAgent";
import { AppBuilderWhiteLabelIntegrationAgent } from "./AppBuilderWhiteLabelIntegrationAgent";
import { AppBuilderWhiteLabelMonetizationAgent } from "./AppBuilderWhiteLabelMonetizationAgent";
import { AppBuilderWhiteLabelPublishAgent } from "./AppBuilderWhiteLabelPublishAgent";
import { AppBuilderWhiteLabelReportAgent } from "./AppBuilderWhiteLabelReportAgent";
import { AppBuilderWhiteLabelUpdateAgent } from "./AppBuilderWhiteLabelUpdateAgent";

export type { AppBuilderWhiteLabelInput, AppBuilderWhiteLabelOutput } from "./shared";
export {
  parseAppBuilderWhiteLabelLlmJson,
  buildAppBuilderWhiteLabelPrompt,
  llmOpts as appbuilderwhitelabelLlmOpts,
} from "./shared";

export {
  AppBuilderWhiteLabelDesignAgent,
  getAppBuilderWhiteLabelDesignAgent,
  resetAppBuilderWhiteLabelDesignAgentForTests,
} from "./AppBuilderWhiteLabelDesignAgent";
export {
  AppBuilderWhiteLabelBuilderAgent,
  getAppBuilderWhiteLabelBuilderAgent,
  resetAppBuilderWhiteLabelBuilderAgentForTests,
} from "./AppBuilderWhiteLabelBuilderAgent";
export {
  AppBuilderWhiteLabelPublishAgent,
  getAppBuilderWhiteLabelPublishAgent,
  resetAppBuilderWhiteLabelPublishAgentForTests,
} from "./AppBuilderWhiteLabelPublishAgent";
export {
  AppBuilderWhiteLabelIntegrationAgent,
  getAppBuilderWhiteLabelIntegrationAgent,
  resetAppBuilderWhiteLabelIntegrationAgentForTests,
} from "./AppBuilderWhiteLabelIntegrationAgent";
export {
  AppBuilderWhiteLabelAnalyticsAgent,
  getAppBuilderWhiteLabelAnalyticsAgent,
  resetAppBuilderWhiteLabelAnalyticsAgentForTests,
} from "./AppBuilderWhiteLabelAnalyticsAgent";
export {
  AppBuilderWhiteLabelUpdateAgent,
  getAppBuilderWhiteLabelUpdateAgent,
  resetAppBuilderWhiteLabelUpdateAgentForTests,
} from "./AppBuilderWhiteLabelUpdateAgent";
export {
  AppBuilderWhiteLabelMonetizationAgent,
  getAppBuilderWhiteLabelMonetizationAgent,
  resetAppBuilderWhiteLabelMonetizationAgentForTests,
} from "./AppBuilderWhiteLabelMonetizationAgent";
export {
  AppBuilderWhiteLabelReportAgent,
  getAppBuilderWhiteLabelReportAgent,
  resetAppBuilderWhiteLabelReportAgentForTests,
} from "./AppBuilderWhiteLabelReportAgent";

export function resetAllAppBuilderWhiteLabelAgentsForTests(): void {
  AppBuilderWhiteLabelDesignAgent.reset();
  AppBuilderWhiteLabelBuilderAgent.reset();
  AppBuilderWhiteLabelPublishAgent.reset();
  AppBuilderWhiteLabelIntegrationAgent.reset();
  AppBuilderWhiteLabelAnalyticsAgent.reset();
  AppBuilderWhiteLabelUpdateAgent.reset();
  AppBuilderWhiteLabelMonetizationAgent.reset();
  AppBuilderWhiteLabelReportAgent.reset();
}
