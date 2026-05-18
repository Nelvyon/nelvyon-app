import { MarketplaceAnalyticsAgent } from "./MarketplaceAnalyticsAgent";
import { MarketplaceCategoryAgent } from "./MarketplaceCategoryAgent";
import { MarketplaceListingAgent } from "./MarketplaceListingAgent";
import { MarketplacePayoutAgent } from "./MarketplacePayoutAgent";
import { MarketplaceQAAgent } from "./MarketplaceQAAgent";
import { MarketplaceRecommenderAgent } from "./MarketplaceRecommenderAgent";
import { MarketplaceReviewAgent } from "./MarketplaceReviewAgent";
import { MarketplaceSearchAgent } from "./MarketplaceSearchAgent";

export type { MarketplaceInput, MarketplaceOutput } from "./shared";
export { parseMarketplaceLlmJson, buildMarketplacePrompt, llmOpts as marketplaceLlmOpts } from "./shared";

export {
  MarketplaceListingAgent,
  getMarketplaceListingAgent,
  resetMarketplaceListingAgentForTests,
} from "./MarketplaceListingAgent";
export {
  MarketplaceReviewAgent,
  getMarketplaceReviewAgent,
  resetMarketplaceReviewAgentForTests,
} from "./MarketplaceReviewAgent";
export {
  MarketplacePayoutAgent,
  getMarketplacePayoutAgent,
  resetMarketplacePayoutAgentForTests,
} from "./MarketplacePayoutAgent";
export {
  MarketplaceQAAgent,
  getMarketplaceQAAgent,
  resetMarketplaceQAAgentForTests,
} from "./MarketplaceQAAgent";
export {
  MarketplaceCategoryAgent,
  getMarketplaceCategoryAgent,
  resetMarketplaceCategoryAgentForTests,
} from "./MarketplaceCategoryAgent";
export {
  MarketplaceSearchAgent,
  getMarketplaceSearchAgent,
  resetMarketplaceSearchAgentForTests,
} from "./MarketplaceSearchAgent";
export {
  MarketplaceAnalyticsAgent,
  getMarketplaceAnalyticsAgent,
  resetMarketplaceAnalyticsAgentForTests,
} from "./MarketplaceAnalyticsAgent";
export {
  MarketplaceRecommenderAgent,
  getMarketplaceRecommenderAgent,
  resetMarketplaceRecommenderAgentForTests,
} from "./MarketplaceRecommenderAgent";

export function resetAllMarketplaceAgentsForTests(): void {
  MarketplaceListingAgent.reset();
  MarketplaceReviewAgent.reset();
  MarketplacePayoutAgent.reset();
  MarketplaceQAAgent.reset();
  MarketplaceCategoryAgent.reset();
  MarketplaceSearchAgent.reset();
  MarketplaceAnalyticsAgent.reset();
  MarketplaceRecommenderAgent.reset();
}
