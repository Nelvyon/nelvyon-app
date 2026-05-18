export type { PartnershipInput, PartnershipOutput } from "./shared";
export {
  partnershipLlmOpts as partnershipLlmOpts,
  parsePartnershipLlmJson,
  buildPartnershipPrompt,
  runPartnershipAgentCore,
  getDefaultPartnershipLlm,
} from "./shared";
export * from "./PartnershipIdentificacionAgent";
export * from "./PartnershipPropuestaAgent";
export * from "./PartnershipAfiliadosAgent";
export * from "./PartnershipIntegracionesAgent";
export * from "./PartnershipComarketingAgent";
export * from "./PartnershipTrackingAgent";
export * from "./PartnershipOnboardingAgent";
export * from "./PartnershipEcosistemaAgent";

import { resetPartnershipAfiliadosAgentForTests } from "./PartnershipAfiliadosAgent";
import { resetPartnershipComarketingAgentForTests } from "./PartnershipComarketingAgent";
import { resetPartnershipEcosistemaAgentForTests } from "./PartnershipEcosistemaAgent";
import { resetPartnershipIdentificacionAgentForTests } from "./PartnershipIdentificacionAgent";
import { resetPartnershipIntegracionesAgentForTests } from "./PartnershipIntegracionesAgent";
import { resetPartnershipOnboardingAgentForTests } from "./PartnershipOnboardingAgent";
import { resetPartnershipPropuestaAgentForTests } from "./PartnershipPropuestaAgent";
import { resetPartnershipTrackingAgentForTests } from "./PartnershipTrackingAgent";

export function resetAllPartnershipAgentsForTests(): void {
  resetPartnershipIdentificacionAgentForTests();
  resetPartnershipPropuestaAgentForTests();
  resetPartnershipAfiliadosAgentForTests();
  resetPartnershipIntegracionesAgentForTests();
  resetPartnershipComarketingAgentForTests();
  resetPartnershipTrackingAgentForTests();
  resetPartnershipOnboardingAgentForTests();
  resetPartnershipEcosistemaAgentForTests();
}
