import { SuperiorLeadEnrichmentCompanyAgent } from "./SuperiorLeadEnrichmentCompanyAgent";
import { SuperiorLeadEnrichmentIntentAgent } from "./SuperiorLeadEnrichmentIntentAgent";
import { SuperiorLeadEnrichmentProfileAgent } from "./SuperiorLeadEnrichmentProfileAgent";
import { SuperiorLeadEnrichmentRoutingAgent } from "./SuperiorLeadEnrichmentRoutingAgent";
import { SuperiorLeadEnrichmentScoringAgent } from "./SuperiorLeadEnrichmentScoringAgent";
import { SuperiorLeadEnrichmentSegmentAgent } from "./SuperiorLeadEnrichmentSegmentAgent";
import { SuperiorLeadEnrichmentSocialAgent } from "./SuperiorLeadEnrichmentSocialAgent";
import { SuperiorLeadEnrichmentVerificationAgent } from "./SuperiorLeadEnrichmentVerificationAgent";

export type { SuperiorLeadEnrichmentInput, SuperiorLeadEnrichmentOutput } from "./shared";
export {
  parseSuperiorLeadEnrichmentLlmJson,
  buildSuperiorLeadEnrichmentPrompt,
  llmOpts as superiorleadenrichmentLlmOpts,
} from "./shared";

export {
  SuperiorLeadEnrichmentProfileAgent,
  getSuperiorLeadEnrichmentProfileAgent,
  resetSuperiorLeadEnrichmentProfileAgentForTests,
} from "./SuperiorLeadEnrichmentProfileAgent";
export {
  SuperiorLeadEnrichmentCompanyAgent,
  getSuperiorLeadEnrichmentCompanyAgent,
  resetSuperiorLeadEnrichmentCompanyAgentForTests,
} from "./SuperiorLeadEnrichmentCompanyAgent";
export {
  SuperiorLeadEnrichmentIntentAgent,
  getSuperiorLeadEnrichmentIntentAgent,
  resetSuperiorLeadEnrichmentIntentAgentForTests,
} from "./SuperiorLeadEnrichmentIntentAgent";
export {
  SuperiorLeadEnrichmentScoringAgent,
  getSuperiorLeadEnrichmentScoringAgent,
  resetSuperiorLeadEnrichmentScoringAgentForTests,
} from "./SuperiorLeadEnrichmentScoringAgent";
export {
  SuperiorLeadEnrichmentSegmentAgent,
  getSuperiorLeadEnrichmentSegmentAgent,
  resetSuperiorLeadEnrichmentSegmentAgentForTests,
} from "./SuperiorLeadEnrichmentSegmentAgent";
export {
  SuperiorLeadEnrichmentVerificationAgent,
  getSuperiorLeadEnrichmentVerificationAgent,
  resetSuperiorLeadEnrichmentVerificationAgentForTests,
} from "./SuperiorLeadEnrichmentVerificationAgent";
export {
  SuperiorLeadEnrichmentSocialAgent,
  getSuperiorLeadEnrichmentSocialAgent,
  resetSuperiorLeadEnrichmentSocialAgentForTests,
} from "./SuperiorLeadEnrichmentSocialAgent";
export {
  SuperiorLeadEnrichmentRoutingAgent,
  getSuperiorLeadEnrichmentRoutingAgent,
  resetSuperiorLeadEnrichmentRoutingAgentForTests,
} from "./SuperiorLeadEnrichmentRoutingAgent";

export function resetAllSuperiorLeadEnrichmentAgentsForTests(): void {
  SuperiorLeadEnrichmentProfileAgent.reset();
  SuperiorLeadEnrichmentCompanyAgent.reset();
  SuperiorLeadEnrichmentIntentAgent.reset();
  SuperiorLeadEnrichmentScoringAgent.reset();
  SuperiorLeadEnrichmentSegmentAgent.reset();
  SuperiorLeadEnrichmentVerificationAgent.reset();
  SuperiorLeadEnrichmentSocialAgent.reset();
  SuperiorLeadEnrichmentRoutingAgent.reset();
}
