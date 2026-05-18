import { LeaderboardBadgeAgent } from "./LeaderboardBadgeAgent";
import { LeaderboardChallengeAgent } from "./LeaderboardChallengeAgent";
import { LeaderboardNotifierAgent } from "./LeaderboardNotifierAgent";
import { LeaderboardPublicPageAgent } from "./LeaderboardPublicPageAgent";
import { LeaderboardRankingAgent } from "./LeaderboardRankingAgent";
import { LeaderboardRewardAgent } from "./LeaderboardRewardAgent";
import { LeaderboardSnapshotAgent } from "./LeaderboardSnapshotAgent";
import { LeaderboardViralAgent } from "./LeaderboardViralAgent";

export type { LeaderboardInput, LeaderboardOutput, LeaderboardScope } from "./shared";
export { parseLeaderboardLlmJson, buildLeaderboardPrompt, llmOpts as leaderboardLlmOpts } from "./shared";

export {
  LeaderboardRankingAgent,
  getLeaderboardRankingAgent,
  resetLeaderboardRankingAgentForTests,
} from "./LeaderboardRankingAgent";
export {
  LeaderboardBadgeAgent,
  getLeaderboardBadgeAgent,
  resetLeaderboardBadgeAgentForTests,
} from "./LeaderboardBadgeAgent";
export {
  LeaderboardNotifierAgent,
  getLeaderboardNotifierAgent,
  resetLeaderboardNotifierAgentForTests,
} from "./LeaderboardNotifierAgent";
export {
  LeaderboardPublicPageAgent,
  getLeaderboardPublicPageAgent,
  resetLeaderboardPublicPageAgentForTests,
} from "./LeaderboardPublicPageAgent";
export {
  LeaderboardChallengeAgent,
  getLeaderboardChallengeAgent,
  resetLeaderboardChallengeAgentForTests,
} from "./LeaderboardChallengeAgent";
export {
  LeaderboardRewardAgent,
  getLeaderboardRewardAgent,
  resetLeaderboardRewardAgentForTests,
} from "./LeaderboardRewardAgent";
export {
  LeaderboardSnapshotAgent,
  getLeaderboardSnapshotAgent,
  resetLeaderboardSnapshotAgentForTests,
} from "./LeaderboardSnapshotAgent";
export {
  LeaderboardViralAgent,
  getLeaderboardViralAgent,
  resetLeaderboardViralAgentForTests,
} from "./LeaderboardViralAgent";

export function resetAllLeaderboardAgentsForTests(): void {
  LeaderboardRankingAgent.reset();
  LeaderboardBadgeAgent.reset();
  LeaderboardNotifierAgent.reset();
  LeaderboardPublicPageAgent.reset();
  LeaderboardChallengeAgent.reset();
  LeaderboardRewardAgent.reset();
  LeaderboardSnapshotAgent.reset();
  LeaderboardViralAgent.reset();
}
