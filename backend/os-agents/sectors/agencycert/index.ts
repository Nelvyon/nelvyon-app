import { AgencyCertAnalyticsAgent } from "./AgencyCertAnalyticsAgent";
import { AgencyCertApplicationAgent } from "./AgencyCertApplicationAgent";
import { AgencyCertBadgeAgent } from "./AgencyCertBadgeAgent";
import { AgencyCertEvaluatorAgent } from "./AgencyCertEvaluatorAgent";
import { AgencyCertLeaderboardAgent } from "./AgencyCertLeaderboardAgent";
import { AgencyCertRenewalAgent } from "./AgencyCertRenewalAgent";
import { AgencyCertRewardsAgent } from "./AgencyCertRewardsAgent";
import { AgencyCertTrainingAgent } from "./AgencyCertTrainingAgent";

export type { AgencyCertInput, AgencyCertLevel, AgencyCertOutput } from "./shared";
export { parseAgencyCertLlmJson, buildAgencyCertPrompt, llmOpts as agencyCertLlmOpts } from "./shared";

export {
  AgencyCertApplicationAgent,
  getAgencyCertApplicationAgent,
  resetAgencyCertApplicationAgentForTests,
} from "./AgencyCertApplicationAgent";
export {
  AgencyCertEvaluatorAgent,
  getAgencyCertEvaluatorAgent,
  resetAgencyCertEvaluatorAgentForTests,
} from "./AgencyCertEvaluatorAgent";
export {
  AgencyCertBadgeAgent,
  getAgencyCertBadgeAgent,
  resetAgencyCertBadgeAgentForTests,
} from "./AgencyCertBadgeAgent";
export {
  AgencyCertTrainingAgent,
  getAgencyCertTrainingAgent,
  resetAgencyCertTrainingAgentForTests,
} from "./AgencyCertTrainingAgent";
export {
  AgencyCertRenewalAgent,
  getAgencyCertRenewalAgent,
  resetAgencyCertRenewalAgentForTests,
} from "./AgencyCertRenewalAgent";
export {
  AgencyCertLeaderboardAgent,
  getAgencyCertLeaderboardAgent,
  resetAgencyCertLeaderboardAgentForTests,
} from "./AgencyCertLeaderboardAgent";
export {
  AgencyCertRewardsAgent,
  getAgencyCertRewardsAgent,
  resetAgencyCertRewardsAgentForTests,
} from "./AgencyCertRewardsAgent";
export {
  AgencyCertAnalyticsAgent,
  getAgencyCertAnalyticsAgent,
  resetAgencyCertAnalyticsAgentForTests,
} from "./AgencyCertAnalyticsAgent";

export function resetAllAgencyCertAgentsForTests(): void {
  AgencyCertApplicationAgent.reset();
  AgencyCertEvaluatorAgent.reset();
  AgencyCertBadgeAgent.reset();
  AgencyCertTrainingAgent.reset();
  AgencyCertRenewalAgent.reset();
  AgencyCertLeaderboardAgent.reset();
  AgencyCertRewardsAgent.reset();
  AgencyCertAnalyticsAgent.reset();
}
