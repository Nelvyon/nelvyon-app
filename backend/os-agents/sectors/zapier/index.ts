import { ZapierActionAgent } from "./ZapierActionAgent";
import { ZapierAnalyticsAgent } from "./ZapierAnalyticsAgent";
import { ZapierAuthAgent } from "./ZapierAuthAgent";
import { ZapierErrorAgent } from "./ZapierErrorAgent";
import { ZapierMappingAgent } from "./ZapierMappingAgent";
import { ZapierTemplateAgent } from "./ZapierTemplateAgent";
import { ZapierTriggerAgent } from "./ZapierTriggerAgent";
import { ZapierWebhookAgent } from "./ZapierWebhookAgent";

export type {
  ZapierActionType,
  ZapierInput,
  ZapierIntegrationPlatform,
  ZapierOutput,
  ZapierTriggerEvent,
} from "./shared";
export { parseZapierLlmJson, buildZapierPrompt, llmOpts as zapierLlmOpts } from "./shared";

export {
  ZapierTriggerAgent,
  getZapierTriggerAgent,
  resetZapierTriggerAgentForTests,
} from "./ZapierTriggerAgent";
export {
  ZapierActionAgent,
  getZapierActionAgent,
  resetZapierActionAgentForTests,
} from "./ZapierActionAgent";
export {
  ZapierAuthAgent,
  getZapierAuthAgent,
  resetZapierAuthAgentForTests,
} from "./ZapierAuthAgent";
export {
  ZapierWebhookAgent,
  getZapierWebhookAgent,
  resetZapierWebhookAgentForTests,
} from "./ZapierWebhookAgent";
export {
  ZapierMappingAgent,
  getZapierMappingAgent,
  resetZapierMappingAgentForTests,
} from "./ZapierMappingAgent";
export {
  ZapierErrorAgent,
  getZapierErrorAgent,
  resetZapierErrorAgentForTests,
} from "./ZapierErrorAgent";
export {
  ZapierAnalyticsAgent,
  getZapierAnalyticsAgent,
  resetZapierAnalyticsAgentForTests,
} from "./ZapierAnalyticsAgent";
export {
  ZapierTemplateAgent,
  getZapierTemplateAgent,
  resetZapierTemplateAgentForTests,
} from "./ZapierTemplateAgent";

export function resetAllZapierAgentsForTests(): void {
  ZapierTriggerAgent.reset();
  ZapierActionAgent.reset();
  ZapierAuthAgent.reset();
  ZapierWebhookAgent.reset();
  ZapierMappingAgent.reset();
  ZapierErrorAgent.reset();
  ZapierAnalyticsAgent.reset();
  ZapierTemplateAgent.reset();
}
