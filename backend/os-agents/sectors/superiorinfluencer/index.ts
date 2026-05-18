import { SuperiorInfluencerAuditAgent } from "./SuperiorInfluencerAuditAgent";
import { SuperiorInfluencerCampaignAgent } from "./SuperiorInfluencerCampaignAgent";
import { SuperiorInfluencerDiscoveryAgent } from "./SuperiorInfluencerDiscoveryAgent";
import { SuperiorInfluencerNegotiationAgent } from "./SuperiorInfluencerNegotiationAgent";
import { SuperiorInfluencerOutreachAgent } from "./SuperiorInfluencerOutreachAgent";
import { SuperiorInfluencerRelationshipAgent } from "./SuperiorInfluencerRelationshipAgent";
import { SuperiorInfluencerROIAgent } from "./SuperiorInfluencerROIAgent";
import { SuperiorInfluencerTrackingAgent } from "./SuperiorInfluencerTrackingAgent";

export type { SuperiorInfluencerInput, SuperiorInfluencerOutput } from "./shared";
export { parseSuperiorInfluencerLlmJson, buildSuperiorInfluencerPrompt, llmOpts as superiorinfluencerLlmOpts } from "./shared";

export {
  SuperiorInfluencerDiscoveryAgent,
  getSuperiorInfluencerDiscoveryAgent,
  resetSuperiorInfluencerDiscoveryAgentForTests,
} from "./SuperiorInfluencerDiscoveryAgent";
export {
  SuperiorInfluencerAuditAgent,
  getSuperiorInfluencerAuditAgent,
  resetSuperiorInfluencerAuditAgentForTests,
} from "./SuperiorInfluencerAuditAgent";
export {
  SuperiorInfluencerOutreachAgent,
  getSuperiorInfluencerOutreachAgent,
  resetSuperiorInfluencerOutreachAgentForTests,
} from "./SuperiorInfluencerOutreachAgent";
export {
  SuperiorInfluencerNegotiationAgent,
  getSuperiorInfluencerNegotiationAgent,
  resetSuperiorInfluencerNegotiationAgentForTests,
} from "./SuperiorInfluencerNegotiationAgent";
export {
  SuperiorInfluencerCampaignAgent,
  getSuperiorInfluencerCampaignAgent,
  resetSuperiorInfluencerCampaignAgentForTests,
} from "./SuperiorInfluencerCampaignAgent";
export {
  SuperiorInfluencerTrackingAgent,
  getSuperiorInfluencerTrackingAgent,
  resetSuperiorInfluencerTrackingAgentForTests,
} from "./SuperiorInfluencerTrackingAgent";
export {
  SuperiorInfluencerROIAgent,
  getSuperiorInfluencerROIAgent,
  resetSuperiorInfluencerROIAgentForTests,
} from "./SuperiorInfluencerROIAgent";
export {
  SuperiorInfluencerRelationshipAgent,
  getSuperiorInfluencerRelationshipAgent,
  resetSuperiorInfluencerRelationshipAgentForTests,
} from "./SuperiorInfluencerRelationshipAgent";

export function resetAllSuperiorInfluencerAgentsForTests(): void {
  SuperiorInfluencerDiscoveryAgent.reset();
  SuperiorInfluencerAuditAgent.reset();
  SuperiorInfluencerOutreachAgent.reset();
  SuperiorInfluencerNegotiationAgent.reset();
  SuperiorInfluencerCampaignAgent.reset();
  SuperiorInfluencerTrackingAgent.reset();
  SuperiorInfluencerROIAgent.reset();
  SuperiorInfluencerRelationshipAgent.reset();
}
