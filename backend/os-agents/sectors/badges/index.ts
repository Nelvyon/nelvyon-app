import { BadgesAchievementCopyAgent } from "./BadgesAchievementCopyAgent";
import { BadgesCertificationPathAgent } from "./BadgesCertificationPathAgent";
import { BadgesEmailCelebrationAgent } from "./BadgesEmailCelebrationAgent";
import { BadgesLeaderboardAgent } from "./BadgesLeaderboardAgent";
import { BadgesMilestoneTrackerAgent } from "./BadgesMilestoneTrackerAgent";
import { BadgesRetentionTriggerAgent } from "./BadgesRetentionTriggerAgent";
import { BadgesShareableContentAgent } from "./BadgesShareableContentAgent";
import { BadgesSystemDesignerAgent } from "./BadgesSystemDesignerAgent";

export type { BadgesInput, BadgesOutput } from "./shared";
export { parseBadgesLlmJson, buildAchievePrompt, llmOpts as badgesLlmOpts } from "./shared";

export {
  BadgesSystemDesignerAgent,
  getBadgesSystemDesignerAgent,
  resetBadgesSystemDesignerAgentForTests,
} from "./BadgesSystemDesignerAgent";
export {
  BadgesAchievementCopyAgent,
  getBadgesAchievementCopyAgent,
  resetBadgesAchievementCopyAgentForTests,
} from "./BadgesAchievementCopyAgent";
export {
  BadgesMilestoneTrackerAgent,
  getBadgesMilestoneTrackerAgent,
  resetBadgesMilestoneTrackerAgentForTests,
} from "./BadgesMilestoneTrackerAgent";
export {
  BadgesCertificationPathAgent,
  getBadgesCertificationPathAgent,
  resetBadgesCertificationPathAgentForTests,
} from "./BadgesCertificationPathAgent";
export {
  BadgesShareableContentAgent,
  getBadgesShareableContentAgent,
  resetBadgesShareableContentAgentForTests,
} from "./BadgesShareableContentAgent";
export {
  BadgesLeaderboardAgent,
  getBadgesLeaderboardAgent,
  resetBadgesLeaderboardAgentForTests,
} from "./BadgesLeaderboardAgent";
export {
  BadgesEmailCelebrationAgent,
  getBadgesEmailCelebrationAgent,
  resetBadgesEmailCelebrationAgentForTests,
} from "./BadgesEmailCelebrationAgent";
export {
  BadgesRetentionTriggerAgent,
  getBadgesRetentionTriggerAgent,
  resetBadgesRetentionTriggerAgentForTests,
} from "./BadgesRetentionTriggerAgent";

export function resetAllBadgesAgentsForTests(): void {
  BadgesSystemDesignerAgent.reset();
  BadgesAchievementCopyAgent.reset();
  BadgesMilestoneTrackerAgent.reset();
  BadgesCertificationPathAgent.reset();
  BadgesShareableContentAgent.reset();
  BadgesLeaderboardAgent.reset();
  BadgesEmailCelebrationAgent.reset();
  BadgesRetentionTriggerAgent.reset();
}
