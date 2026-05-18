import { KlaviyoABTestAgent } from "./KlaviyoABTestAgent";
import { KlaviyoAnalyticsAgent } from "./KlaviyoAnalyticsAgent";
import { KlaviyoAuthAgent } from "./KlaviyoAuthAgent";
import { KlaviyoCampaignAgent } from "./KlaviyoCampaignAgent";
import { KlaviyoFlowAgent } from "./KlaviyoFlowAgent";
import { KlaviyoSegmentAgent } from "./KlaviyoSegmentAgent";
import { KlaviyoSyncAgent } from "./KlaviyoSyncAgent";
import { KlaviyoTemplateAgent } from "./KlaviyoTemplateAgent";

export type { KlaviyoInput, KlaviyoOutput } from "./shared";
export { parseKlaviyoLlmJson, buildKlaviyoPrompt, llmOpts as klaviyoLlmOpts } from "./shared";

export {
  KlaviyoAuthAgent,
  getKlaviyoAuthAgent,
  resetKlaviyoAuthAgentForTests,
} from "./KlaviyoAuthAgent";
export {
  KlaviyoSegmentAgent,
  getKlaviyoSegmentAgent,
  resetKlaviyoSegmentAgentForTests,
} from "./KlaviyoSegmentAgent";
export {
  KlaviyoFlowAgent,
  getKlaviyoFlowAgent,
  resetKlaviyoFlowAgentForTests,
} from "./KlaviyoFlowAgent";
export {
  KlaviyoCampaignAgent,
  getKlaviyoCampaignAgent,
  resetKlaviyoCampaignAgentForTests,
} from "./KlaviyoCampaignAgent";
export {
  KlaviyoTemplateAgent,
  getKlaviyoTemplateAgent,
  resetKlaviyoTemplateAgentForTests,
} from "./KlaviyoTemplateAgent";
export {
  KlaviyoAnalyticsAgent,
  getKlaviyoAnalyticsAgent,
  resetKlaviyoAnalyticsAgentForTests,
} from "./KlaviyoAnalyticsAgent";
export {
  KlaviyoSyncAgent,
  getKlaviyoSyncAgent,
  resetKlaviyoSyncAgentForTests,
} from "./KlaviyoSyncAgent";
export {
  KlaviyoABTestAgent,
  getKlaviyoABTestAgent,
  resetKlaviyoABTestAgentForTests,
} from "./KlaviyoABTestAgent";

export function resetAllKlaviyoAgentsForTests(): void {
  KlaviyoAuthAgent.reset();
  KlaviyoSegmentAgent.reset();
  KlaviyoFlowAgent.reset();
  KlaviyoCampaignAgent.reset();
  KlaviyoTemplateAgent.reset();
  KlaviyoAnalyticsAgent.reset();
  KlaviyoSyncAgent.reset();
  KlaviyoABTestAgent.reset();
}
