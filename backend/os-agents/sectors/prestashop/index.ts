import { PrestaShopAbandonedCartAgent } from "./PrestaShopAbandonedCartAgent";
import { PrestaShopAnalyticsAgent } from "./PrestaShopAnalyticsAgent";
import { PrestaShopAuthAgent } from "./PrestaShopAuthAgent";
import { PrestaShopEmailAgent } from "./PrestaShopEmailAgent";
import { PrestaShopOrderAgent } from "./PrestaShopOrderAgent";
import { PrestaShopProductAgent } from "./PrestaShopProductAgent";
import { PrestaShopReviewAgent } from "./PrestaShopReviewAgent";
import { PrestaShopSEOAgent } from "./PrestaShopSEOAgent";

export type { PrestaShopBuyerSegment, PrestaShopInput, PrestaShopOutput } from "./shared";
export { parsePrestaShopLlmJson, buildPrestaShopPrompt, llmOpts as prestaShopLlmOpts } from "./shared";

export {
  PrestaShopAuthAgent,
  getPrestaShopAuthAgent,
  resetPrestaShopAuthAgentForTests,
} from "./PrestaShopAuthAgent";
export {
  PrestaShopProductAgent,
  getPrestaShopProductAgent,
  resetPrestaShopProductAgentForTests,
} from "./PrestaShopProductAgent";
export {
  PrestaShopOrderAgent,
  getPrestaShopOrderAgent,
  resetPrestaShopOrderAgentForTests,
} from "./PrestaShopOrderAgent";
export {
  PrestaShopAbandonedCartAgent,
  getPrestaShopAbandonedCartAgent,
  resetPrestaShopAbandonedCartAgentForTests,
} from "./PrestaShopAbandonedCartAgent";
export {
  PrestaShopSEOAgent,
  getPrestaShopSEOAgent,
  resetPrestaShopSEOAgentForTests,
} from "./PrestaShopSEOAgent";
export {
  PrestaShopReviewAgent,
  getPrestaShopReviewAgent,
  resetPrestaShopReviewAgentForTests,
} from "./PrestaShopReviewAgent";
export {
  PrestaShopAnalyticsAgent,
  getPrestaShopAnalyticsAgent,
  resetPrestaShopAnalyticsAgentForTests,
} from "./PrestaShopAnalyticsAgent";
export {
  PrestaShopEmailAgent,
  getPrestaShopEmailAgent,
  resetPrestaShopEmailAgentForTests,
} from "./PrestaShopEmailAgent";

export function resetAllPrestaShopAgentsForTests(): void {
  PrestaShopAuthAgent.reset();
  PrestaShopProductAgent.reset();
  PrestaShopOrderAgent.reset();
  PrestaShopAbandonedCartAgent.reset();
  PrestaShopSEOAgent.reset();
  PrestaShopReviewAgent.reset();
  PrestaShopAnalyticsAgent.reset();
  PrestaShopEmailAgent.reset();
}
