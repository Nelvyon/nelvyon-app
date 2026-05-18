import { AccountScoringAgent } from "./AccountScoringAgent";
import { BuyerIntentAgent } from "./BuyerIntentAgent";
import { CompetitorIntelAgent } from "./CompetitorIntelAgent";
import { DealIntelligenceAgent } from "./DealIntelligenceAgent";
import { MarketIntelAgent } from "./MarketIntelAgent";
import { ProspectResearchAgent } from "./ProspectResearchAgent";
import { SalesPlaybookAgent } from "./SalesPlaybookAgent";
import { SalesSignalAgent } from "./SalesSignalAgent";

export type { SalesIntelligenceInput, SalesIntelligenceOutput } from "./shared";
export { parseSalesIntelligenceLlmJson, buildSalesIntelligencePrompt, llmOpts as salesintelligenceLlmOpts } from "./shared";

export { BuyerIntentAgent, getBuyerIntentAgent, resetBuyerIntentAgentForTests } from "./BuyerIntentAgent";
export {
  AccountScoringAgent,
  getAccountScoringAgent,
  resetAccountScoringAgentForTests,
} from "./AccountScoringAgent";
export { SalesSignalAgent, getSalesSignalAgent, resetSalesSignalAgentForTests } from "./SalesSignalAgent";
export {
  CompetitorIntelAgent,
  getCompetitorIntelAgent,
  resetCompetitorIntelAgentForTests,
} from "./CompetitorIntelAgent";
export {
  ProspectResearchAgent,
  getProspectResearchAgent,
  resetProspectResearchAgentForTests,
} from "./ProspectResearchAgent";
export {
  DealIntelligenceAgent,
  getDealIntelligenceAgent,
  resetDealIntelligenceAgentForTests,
} from "./DealIntelligenceAgent";
export { MarketIntelAgent, getMarketIntelAgent, resetMarketIntelAgentForTests } from "./MarketIntelAgent";
export {
  SalesPlaybookAgent,
  getSalesPlaybookAgent,
  resetSalesPlaybookAgentForTests,
} from "./SalesPlaybookAgent";

export function resetAllSalesIntelligenceAgentsForTests(): void {
  BuyerIntentAgent.reset();
  AccountScoringAgent.reset();
  SalesSignalAgent.reset();
  CompetitorIntelAgent.reset();
  ProspectResearchAgent.reset();
  DealIntelligenceAgent.reset();
  MarketIntelAgent.reset();
  SalesPlaybookAgent.reset();
}
