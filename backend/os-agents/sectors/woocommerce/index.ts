import { WooCommerceAbandonedCartAgent } from "./WooCommerceAbandonedCartAgent";
import { WooCommerceAnalyticsAgent } from "./WooCommerceAnalyticsAgent";
import { WooCommerceAuthAgent } from "./WooCommerceAuthAgent";
import { WooCommerceEmailAgent } from "./WooCommerceEmailAgent";
import { WooCommerceOrderAgent } from "./WooCommerceOrderAgent";
import { WooCommerceProductAgent } from "./WooCommerceProductAgent";
import { WooCommerceReviewAgent } from "./WooCommerceReviewAgent";
import { WooCommerceSEOAgent } from "./WooCommerceSEOAgent";

export type { WooCommerceBuyerSegment, WooCommerceInput, WooCommerceOutput } from "./shared";
export { parseWooCommerceLlmJson, buildWooCommercePrompt, llmOpts as wooCommerceLlmOpts } from "./shared";

export {
  WooCommerceAuthAgent,
  getWooCommerceAuthAgent,
  resetWooCommerceAuthAgentForTests,
} from "./WooCommerceAuthAgent";
export {
  WooCommerceProductAgent,
  getWooCommerceProductAgent,
  resetWooCommerceProductAgentForTests,
} from "./WooCommerceProductAgent";
export {
  WooCommerceOrderAgent,
  getWooCommerceOrderAgent,
  resetWooCommerceOrderAgentForTests,
} from "./WooCommerceOrderAgent";
export {
  WooCommerceAbandonedCartAgent,
  getWooCommerceAbandonedCartAgent,
  resetWooCommerceAbandonedCartAgentForTests,
} from "./WooCommerceAbandonedCartAgent";
export {
  WooCommerceSEOAgent,
  getWooCommerceSEOAgent,
  resetWooCommerceSEOAgentForTests,
} from "./WooCommerceSEOAgent";
export {
  WooCommerceReviewAgent,
  getWooCommerceReviewAgent,
  resetWooCommerceReviewAgentForTests,
} from "./WooCommerceReviewAgent";
export {
  WooCommerceAnalyticsAgent,
  getWooCommerceAnalyticsAgent,
  resetWooCommerceAnalyticsAgentForTests,
} from "./WooCommerceAnalyticsAgent";
export {
  WooCommerceEmailAgent,
  getWooCommerceEmailAgent,
  resetWooCommerceEmailAgentForTests,
} from "./WooCommerceEmailAgent";

export function resetAllWooCommerceAgentsForTests(): void {
  WooCommerceAuthAgent.reset();
  WooCommerceProductAgent.reset();
  WooCommerceOrderAgent.reset();
  WooCommerceAbandonedCartAgent.reset();
  WooCommerceSEOAgent.reset();
  WooCommerceReviewAgent.reset();
  WooCommerceAnalyticsAgent.reset();
  WooCommerceEmailAgent.reset();
}
