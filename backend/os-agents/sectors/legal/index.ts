export type { LegalInput, LegalOutput } from "./shared";
export {
  legalLlmOpts as legalLlmOpts,
  parseLegalLlmJson,
  buildLegalPrompt,
  runLegalAgentCore,
  getDefaultLegalLlm,
} from "./shared";

export type { LegalMarketingInput, LegalMarketingOutput } from "./legalMarketingShared";
export { legalMarketingLlmOpts } from "./legalMarketingShared";

export { LegalFirmProfileAgent, getLegalFirmProfileAgent, resetLegalFirmProfileAgentForTests, type LegalFirmProfileAgentDeps } from "./LegalFirmProfileAgent";
export { LegalContentMarketingAgent, getLegalContentMarketingAgent, resetLegalContentMarketingAgentForTests, type LegalContentMarketingAgentDeps } from "./LegalContentMarketingAgent";
export { LegalSEOAgent, getLegalSEOAgent, resetLegalSEOAgentForTests, type LegalSEOAgentDeps } from "./LegalSEOAgent";
export { LegalAdsAgent, getLegalAdsAgent, resetLegalAdsAgentForTests, type LegalAdsAgentDeps } from "./LegalAdsAgent";
export { LegalClientEmailAgent, getLegalClientEmailAgent, resetLegalClientEmailAgentForTests, type LegalClientEmailAgentDeps } from "./LegalClientEmailAgent";
export {
  LegalConsultationNurturingAgent,
  getLegalConsultationNurturingAgent,
  resetLegalConsultationNurturingAgentForTests,
  type LegalConsultationNurturingAgentDeps,
} from "./LegalConsultationNurturingAgent";
export { LegalReputationAgent, getLegalReputationAgent, resetLegalReputationAgentForTests, type LegalReputationAgentDeps } from "./LegalReputationAgent";
export { LegalReferralAgent, getLegalReferralAgent, resetLegalReferralAgentForTests, type LegalReferralAgentDeps } from "./LegalReferralAgent";
export {
  LegalThoughtLeadershipAgent,
  getLegalThoughtLeadershipAgent,
  resetLegalThoughtLeadershipAgentForTests,
  type LegalThoughtLeadershipAgentDeps,
} from "./LegalThoughtLeadershipAgent";

export * from "./LegalGdprAgent";
export * from "./LegalTosAgent";
export * from "./LegalPrivacidadAgent";
export * from "./LegalContratosAgent";
export * from "./LegalNdaAgent";
export * from "./LegalSlaAgent";
export * from "./LegalJurisdiccionAgent";
export * from "./LegalActualizacionAgent";

import { resetLegalActualizacionAgentForTests } from "./LegalActualizacionAgent";
import { resetLegalContratosAgentForTests } from "./LegalContratosAgent";
import { resetLegalGdprAgentForTests } from "./LegalGdprAgent";
import { resetLegalJurisdiccionAgentForTests } from "./LegalJurisdiccionAgent";
import { resetLegalNdaAgentForTests } from "./LegalNdaAgent";
import { resetLegalPrivacidadAgentForTests } from "./LegalPrivacidadAgent";
import { resetLegalSlaAgentForTests } from "./LegalSlaAgent";
import { resetLegalTosAgentForTests } from "./LegalTosAgent";

export function resetAllLegalAgentsForTests(): void {
  resetLegalGdprAgentForTests();
  resetLegalTosAgentForTests();
  resetLegalPrivacidadAgentForTests();
  resetLegalContratosAgentForTests();
  resetLegalNdaAgentForTests();
  resetLegalSlaAgentForTests();
  resetLegalJurisdiccionAgentForTests();
  resetLegalActualizacionAgentForTests();
}
