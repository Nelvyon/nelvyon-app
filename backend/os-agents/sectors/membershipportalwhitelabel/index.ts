import { MembershipPortalAccessAgent } from "./MembershipPortalAccessAgent";
import { MembershipPortalAnalyticsAgent } from "./MembershipPortalAnalyticsAgent";
import { MembershipPortalBillingAgent } from "./MembershipPortalBillingAgent";
import { MembershipPortalCommunityAgent } from "./MembershipPortalCommunityAgent";
import { MembershipPortalDesignAgent } from "./MembershipPortalDesignAgent";
import { MembershipPortalEngagementAgent } from "./MembershipPortalEngagementAgent";
import { MembershipPortalOnboardingAgent } from "./MembershipPortalOnboardingAgent";
import { MembershipPortalReportAgent } from "./MembershipPortalReportAgent";

export type { MembershipPortalWhiteLabelInput, MembershipPortalWhiteLabelOutput } from "./shared";
export {
  parseMembershipPortalWhiteLabelLlmJson,
  buildMembershipPortalWhiteLabelPrompt,
  llmOpts as membershipportalwhitelabelLlmOpts,
} from "./shared";

export {
  MembershipPortalDesignAgent,
  getMembershipPortalDesignAgent,
  resetMembershipPortalDesignAgentForTests,
} from "./MembershipPortalDesignAgent";
export {
  MembershipPortalAccessAgent,
  getMembershipPortalAccessAgent,
  resetMembershipPortalAccessAgentForTests,
} from "./MembershipPortalAccessAgent";
export {
  MembershipPortalBillingAgent,
  getMembershipPortalBillingAgent,
  resetMembershipPortalBillingAgentForTests,
} from "./MembershipPortalBillingAgent";
export {
  MembershipPortalCommunityAgent,
  getMembershipPortalCommunityAgent,
  resetMembershipPortalCommunityAgentForTests,
} from "./MembershipPortalCommunityAgent";
export {
  MembershipPortalEngagementAgent,
  getMembershipPortalEngagementAgent,
  resetMembershipPortalEngagementAgentForTests,
} from "./MembershipPortalEngagementAgent";
export {
  MembershipPortalAnalyticsAgent,
  getMembershipPortalAnalyticsAgent,
  resetMembershipPortalAnalyticsAgentForTests,
} from "./MembershipPortalAnalyticsAgent";
export {
  MembershipPortalOnboardingAgent,
  getMembershipPortalOnboardingAgent,
  resetMembershipPortalOnboardingAgentForTests,
} from "./MembershipPortalOnboardingAgent";
export {
  MembershipPortalReportAgent,
  getMembershipPortalReportAgent,
  resetMembershipPortalReportAgentForTests,
} from "./MembershipPortalReportAgent";

export function resetAllMembershipPortalWhiteLabelAgentsForTests(): void {
  MembershipPortalDesignAgent.reset();
  MembershipPortalAccessAgent.reset();
  MembershipPortalBillingAgent.reset();
  MembershipPortalCommunityAgent.reset();
  MembershipPortalEngagementAgent.reset();
  MembershipPortalAnalyticsAgent.reset();
  MembershipPortalOnboardingAgent.reset();
  MembershipPortalReportAgent.reset();
}
