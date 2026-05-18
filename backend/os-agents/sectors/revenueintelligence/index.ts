import { CallCoachingAgent } from "./CallCoachingAgent";
import { CallTranscriptionAgent } from "./CallTranscriptionAgent";
import { CompetitorMentionAgent } from "./CompetitorMentionAgent";
import { DealRiskAgent } from "./DealRiskAgent";
import { NextStepAgent } from "./NextStepAgent";
import { RevenueForecasterAgent } from "./RevenueForecasterAgent";
import { TalkRatioAgent } from "./TalkRatioAgent";
import { WinLossAgent } from "./WinLossAgent";

export type { RevenueIntelligenceInput, RevenueIntelligenceOutput } from "./shared";
export {
  parseRevenueIntelligenceLlmJson,
  buildRevenueIntelligencePrompt,
  llmOpts as revenueintelligenceLlmOpts,
} from "./shared";

export {
  CallTranscriptionAgent,
  getCallTranscriptionAgent,
  resetCallTranscriptionAgentForTests,
} from "./CallTranscriptionAgent";
export { DealRiskAgent, getDealRiskAgent, resetDealRiskAgentForTests } from "./DealRiskAgent";
export { WinLossAgent, getWinLossAgent, resetWinLossAgentForTests } from "./WinLossAgent";
export {
  CallCoachingAgent,
  getCallCoachingAgent,
  resetCallCoachingAgentForTests,
} from "./CallCoachingAgent";
export {
  RevenueForecasterAgent,
  getRevenueForecasterAgent,
  resetRevenueForecasterAgentForTests,
} from "./RevenueForecasterAgent";
export {
  CompetitorMentionAgent,
  getCompetitorMentionAgent,
  resetCompetitorMentionAgentForTests,
} from "./CompetitorMentionAgent";
export { TalkRatioAgent, getTalkRatioAgent, resetTalkRatioAgentForTests } from "./TalkRatioAgent";
export { NextStepAgent, getNextStepAgent, resetNextStepAgentForTests } from "./NextStepAgent";

export function resetAllRevenueIntelligenceAgentsForTests(): void {
  CallTranscriptionAgent.reset();
  DealRiskAgent.reset();
  WinLossAgent.reset();
  CallCoachingAgent.reset();
  RevenueForecasterAgent.reset();
  CompetitorMentionAgent.reset();
  TalkRatioAgent.reset();
  NextStepAgent.reset();
}
