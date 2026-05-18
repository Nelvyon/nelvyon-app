import { PublicApiAnalyticsAgent } from "./PublicApiAnalyticsAgent";
import { PublicApiAuthAgent } from "./PublicApiAuthAgent";
import { PublicApiDocsAgent } from "./PublicApiDocsAgent";
import { PublicApiRateLimiterAgent } from "./PublicApiRateLimiterAgent";
import { PublicApiRouterAgent } from "./PublicApiRouterAgent";
import { PublicApiSandboxAgent } from "./PublicApiSandboxAgent";
import { PublicApiWebhookAgent } from "./PublicApiWebhookAgent";
import { PublicApiWebhookDispatchAgent } from "./PublicApiWebhookDispatchAgent";

export type { PublicApiInput, PublicApiOutput, PublicApiPlan, PublicApiWebhookEvent } from "./shared";
export { parsePublicApiLlmJson, buildPublicApiPrompt, llmOpts as publicApiLlmOpts } from "./shared";

export {
  PublicApiAuthAgent,
  getPublicApiAuthAgent,
  resetPublicApiAuthAgentForTests,
} from "./PublicApiAuthAgent";
export {
  PublicApiRateLimiterAgent,
  getPublicApiRateLimiterAgent,
  resetPublicApiRateLimiterAgentForTests,
} from "./PublicApiRateLimiterAgent";
export {
  PublicApiRouterAgent,
  getPublicApiRouterAgent,
  resetPublicApiRouterAgentForTests,
} from "./PublicApiRouterAgent";
export {
  PublicApiDocsAgent,
  getPublicApiDocsAgent,
  resetPublicApiDocsAgentForTests,
} from "./PublicApiDocsAgent";
export {
  PublicApiWebhookAgent,
  getPublicApiWebhookAgent,
  resetPublicApiWebhookAgentForTests,
} from "./PublicApiWebhookAgent";
export {
  PublicApiWebhookDispatchAgent,
  getPublicApiWebhookDispatchAgent,
  resetPublicApiWebhookDispatchAgentForTests,
} from "./PublicApiWebhookDispatchAgent";
export {
  PublicApiAnalyticsAgent,
  getPublicApiAnalyticsAgent,
  resetPublicApiAnalyticsAgentForTests,
} from "./PublicApiAnalyticsAgent";
export {
  PublicApiSandboxAgent,
  getPublicApiSandboxAgent,
  resetPublicApiSandboxAgentForTests,
} from "./PublicApiSandboxAgent";

export function resetAllPublicApiAgentsForTests(): void {
  PublicApiAuthAgent.reset();
  PublicApiRateLimiterAgent.reset();
  PublicApiRouterAgent.reset();
  PublicApiDocsAgent.reset();
  PublicApiWebhookAgent.reset();
  PublicApiWebhookDispatchAgent.reset();
  PublicApiAnalyticsAgent.reset();
  PublicApiSandboxAgent.reset();
}
