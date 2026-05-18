import { AudienceSyncAgent } from "./AudienceSyncAgent";
import { ConsentManagementAgent } from "./ConsentManagementAgent";
import { DataEnrichmentCDPAgent } from "./DataEnrichmentCDPAgent";
import { DataIngestionAgent } from "./DataIngestionAgent";
import { IdentityResolutionAgent } from "./IdentityResolutionAgent";
import { PredictiveAudienceAgent } from "./PredictiveAudienceAgent";
import { ProfileUnificationAgent } from "./ProfileUnificationAgent";
import { SegmentBuilderAgent } from "./SegmentBuilderAgent";

export type { CdpInput, CdpOutput } from "./shared";
export { parseCdpLlmJson, buildCdpPrompt, llmOpts as cdpLlmOpts } from "./shared";

export {
  IdentityResolutionAgent,
  getIdentityResolutionAgent,
  resetIdentityResolutionAgentForTests,
} from "./IdentityResolutionAgent";
export {
  ProfileUnificationAgent,
  getProfileUnificationAgent,
  resetProfileUnificationAgentForTests,
} from "./ProfileUnificationAgent";
export {
  SegmentBuilderAgent,
  getSegmentBuilderAgent,
  resetSegmentBuilderAgentForTests,
} from "./SegmentBuilderAgent";
export {
  DataIngestionAgent,
  getDataIngestionAgent,
  resetDataIngestionAgentForTests,
} from "./DataIngestionAgent";
export {
  AudienceSyncAgent,
  getAudienceSyncAgent,
  resetAudienceSyncAgentForTests,
} from "./AudienceSyncAgent";
export {
  ConsentManagementAgent,
  getConsentManagementAgent,
  resetConsentManagementAgentForTests,
} from "./ConsentManagementAgent";
export {
  DataEnrichmentCDPAgent,
  getDataEnrichmentCDPAgent,
  resetDataEnrichmentCDPAgentForTests,
} from "./DataEnrichmentCDPAgent";
export {
  PredictiveAudienceAgent,
  getPredictiveAudienceAgent,
  resetPredictiveAudienceAgentForTests,
} from "./PredictiveAudienceAgent";

export function resetAllCdpAgentsForTests(): void {
  IdentityResolutionAgent.reset();
  ProfileUnificationAgent.reset();
  SegmentBuilderAgent.reset();
  DataIngestionAgent.reset();
  AudienceSyncAgent.reset();
  ConsentManagementAgent.reset();
  DataEnrichmentCDPAgent.reset();
  PredictiveAudienceAgent.reset();
}
