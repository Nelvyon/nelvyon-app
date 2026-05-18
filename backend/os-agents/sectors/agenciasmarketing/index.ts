import { AgencyBillingAgent } from "./AgencyBillingAgent";
import { AgencyContentAgent } from "./AgencyContentAgent";
import { AgencySEOAgent } from "./AgencySEOAgent";
import { CampaignManagementAgent } from "./CampaignManagementAgent";
import { ClientReportingAgent } from "./ClientReportingAgent";
import { ProspectingAgencyAgent } from "./ProspectingAgencyAgent";
import { TeamProductivityAgent } from "./TeamProductivityAgent";
import { WhiteLabelDashboardAgent } from "./WhiteLabelDashboardAgent";

export type { AgenciasMarketingInput, AgenciasMarketingOutput } from "./shared";
export {
  parseAgenciasMarketingLlmJson,
  buildAgenciasMarketingPrompt,
  llmOpts as agenciasmarketingLlmOpts,
} from "./shared";

export {
  ClientReportingAgent,
  getClientReportingAgent,
  resetClientReportingAgentForTests,
} from "./ClientReportingAgent";
export {
  CampaignManagementAgent,
  getCampaignManagementAgent,
  resetCampaignManagementAgentForTests,
} from "./CampaignManagementAgent";
export {
  ProspectingAgencyAgent,
  getProspectingAgencyAgent,
  resetProspectingAgencyAgentForTests,
} from "./ProspectingAgencyAgent";
export {
  WhiteLabelDashboardAgent,
  getWhiteLabelDashboardAgent,
  resetWhiteLabelDashboardAgentForTests,
} from "./WhiteLabelDashboardAgent";
export {
  AgencyBillingAgent,
  getAgencyBillingAgent,
  resetAgencyBillingAgentForTests,
} from "./AgencyBillingAgent";
export {
  TeamProductivityAgent,
  getTeamProductivityAgent,
  resetTeamProductivityAgentForTests,
} from "./TeamProductivityAgent";
export { AgencySEOAgent, getAgencySEOAgent, resetAgencySEOAgentForTests } from "./AgencySEOAgent";
export {
  AgencyContentAgent,
  getAgencyContentAgent,
  resetAgencyContentAgentForTests,
} from "./AgencyContentAgent";

export function resetAllAgenciasMarketingAgentsForTests(): void {
  ClientReportingAgent.reset();
  CampaignManagementAgent.reset();
  ProspectingAgencyAgent.reset();
  WhiteLabelDashboardAgent.reset();
  AgencyBillingAgent.reset();
  TeamProductivityAgent.reset();
  AgencySEOAgent.reset();
  AgencyContentAgent.reset();
}
