import { InfluencerBriefGeneratorAgent } from "./InfluencerBriefGeneratorAgent";
import { InfluencerCampaignReportAgent } from "./InfluencerCampaignReportAgent";
import { InfluencerContentCalendarAgent } from "./InfluencerContentCalendarAgent";
import { InfluencerContractTermsAgent } from "./InfluencerContractTermsAgent";
import { InfluencerDiscoveryAgent } from "./InfluencerDiscoveryAgent";
import { InfluencerFitScorerAgent } from "./InfluencerFitScorerAgent";
import { InfluencerOutreachCrafterAgent } from "./InfluencerOutreachCrafterAgent";
import { InfluencerROIProjectorAgent } from "./InfluencerROIProjectorAgent";

export type { InfluencerReachInput, InfluencerReachOutput } from "./influencerReachShared";
export {
  parseInfluencerReachLlmJson,
  buildReachPrompt,
  influencerTemperature,
  llmOpts as influencerReachLlmOpts,
} from "./influencerReachShared";

export type { InfluencerInput, InfluencerOutput } from "./shared";
export {
  influencerLlmOpts as influencerLlmOpts,
  parseInfluencerLlmJson,
  buildInfluencerPrompt,
  runInfluencerAgentCore,
  getDefaultInfluencerLlm,
} from "./shared";

export {
  InfluencerDiscoveryAgent,
  getInfluencerDiscoveryAgent,
  resetInfluencerDiscoveryAgentForTests,
} from "./InfluencerDiscoveryAgent";
export {
  InfluencerFitScorerAgent,
  getInfluencerFitScorerAgent,
  resetInfluencerFitScorerAgentForTests,
} from "./InfluencerFitScorerAgent";
export {
  InfluencerOutreachCrafterAgent,
  getInfluencerOutreachCrafterAgent,
  resetInfluencerOutreachCrafterAgentForTests,
} from "./InfluencerOutreachCrafterAgent";
export {
  InfluencerBriefGeneratorAgent,
  getInfluencerBriefGeneratorAgent,
  resetInfluencerBriefGeneratorAgentForTests,
} from "./InfluencerBriefGeneratorAgent";
export {
  InfluencerContractTermsAgent,
  getInfluencerContractTermsAgent,
  resetInfluencerContractTermsAgentForTests,
} from "./InfluencerContractTermsAgent";
export {
  InfluencerROIProjectorAgent,
  getInfluencerROIProjectorAgent,
  resetInfluencerROIProjectorAgentForTests,
} from "./InfluencerROIProjectorAgent";
export {
  InfluencerContentCalendarAgent,
  getInfluencerContentCalendarAgent,
  resetInfluencerContentCalendarAgentForTests,
} from "./InfluencerContentCalendarAgent";
export {
  InfluencerCampaignReportAgent,
  getInfluencerCampaignReportAgent,
  resetInfluencerCampaignReportAgentForTests,
} from "./InfluencerCampaignReportAgent";

export * from "./InfluencerIdentidadAgent";
export * from "./InfluencerContenidoAgent";
export * from "./InfluencerAvatarAgent";
export * from "./InfluencerVozAgent";
export * from "./InfluencerCalendarioAgent";
export * from "./InfluencerComunidadAgent";
export * from "./InfluencerMonetizacionAgent";
export * from "./InfluencerAnalyticsAgent";

import { resetInfluencerAnalyticsAgentForTests } from "./InfluencerAnalyticsAgent";
import { resetInfluencerAvatarAgentForTests } from "./InfluencerAvatarAgent";
import { resetInfluencerCalendarioAgentForTests } from "./InfluencerCalendarioAgent";
import { resetInfluencerContenidoAgentForTests } from "./InfluencerContenidoAgent";
import { resetInfluencerComunidadAgentForTests } from "./InfluencerComunidadAgent";
import { resetInfluencerIdentidadAgentForTests } from "./InfluencerIdentidadAgent";
import { resetInfluencerMonetizacionAgentForTests } from "./InfluencerMonetizacionAgent";
import { resetInfluencerVozAgentForTests } from "./InfluencerVozAgent";

export function resetAllInfluencerAgentsForTests(): void {
  InfluencerDiscoveryAgent.reset();
  InfluencerFitScorerAgent.reset();
  InfluencerOutreachCrafterAgent.reset();
  InfluencerBriefGeneratorAgent.reset();
  InfluencerContractTermsAgent.reset();
  InfluencerROIProjectorAgent.reset();
  InfluencerContentCalendarAgent.reset();
  InfluencerCampaignReportAgent.reset();
  resetInfluencerIdentidadAgentForTests();
  resetInfluencerContenidoAgentForTests();
  resetInfluencerAvatarAgentForTests();
  resetInfluencerVozAgentForTests();
  resetInfluencerCalendarioAgentForTests();
  resetInfluencerComunidadAgentForTests();
  resetInfluencerMonetizacionAgentForTests();
  resetInfluencerAnalyticsAgentForTests();
}
