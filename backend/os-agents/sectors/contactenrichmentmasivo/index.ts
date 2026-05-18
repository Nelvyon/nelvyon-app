import { ContactEnrichmentMasivoCompanyAgent } from "./ContactEnrichmentMasivoCompanyAgent";
import { ContactEnrichmentMasivoDedupeAgent } from "./ContactEnrichmentMasivoDedupeAgent";
import { ContactEnrichmentMasivoEmailAgent } from "./ContactEnrichmentMasivoEmailAgent";
import { ContactEnrichmentMasivoICPAgent } from "./ContactEnrichmentMasivoICPAgent";
import { ContactEnrichmentMasivoLinkedInAgent } from "./ContactEnrichmentMasivoLinkedInAgent";
import { ContactEnrichmentMasivoPhoneAgent } from "./ContactEnrichmentMasivoPhoneAgent";
import { ContactEnrichmentMasivoReportAgent } from "./ContactEnrichmentMasivoReportAgent";
import { ContactEnrichmentMasivoSocialAgent } from "./ContactEnrichmentMasivoSocialAgent";

export type { ContactEnrichmentMasivoInput, ContactEnrichmentMasivoOutput } from "./shared";
export {
  parseContactEnrichmentMasivoLlmJson,
  buildContactEnrichmentMasivoPrompt,
  llmOpts as contactenrichmentmasivoLlmOpts,
} from "./shared";

export {
  ContactEnrichmentMasivoEmailAgent,
  getContactEnrichmentMasivoEmailAgent,
  resetContactEnrichmentMasivoEmailAgentForTests,
} from "./ContactEnrichmentMasivoEmailAgent";
export {
  ContactEnrichmentMasivoPhoneAgent,
  getContactEnrichmentMasivoPhoneAgent,
  resetContactEnrichmentMasivoPhoneAgentForTests,
} from "./ContactEnrichmentMasivoPhoneAgent";
export {
  ContactEnrichmentMasivoLinkedInAgent,
  getContactEnrichmentMasivoLinkedInAgent,
  resetContactEnrichmentMasivoLinkedInAgentForTests,
} from "./ContactEnrichmentMasivoLinkedInAgent";
export {
  ContactEnrichmentMasivoCompanyAgent,
  getContactEnrichmentMasivoCompanyAgent,
  resetContactEnrichmentMasivoCompanyAgentForTests,
} from "./ContactEnrichmentMasivoCompanyAgent";
export {
  ContactEnrichmentMasivoSocialAgent,
  getContactEnrichmentMasivoSocialAgent,
  resetContactEnrichmentMasivoSocialAgentForTests,
} from "./ContactEnrichmentMasivoSocialAgent";
export {
  ContactEnrichmentMasivoICPAgent,
  getContactEnrichmentMasivoICPAgent,
  resetContactEnrichmentMasivoICPAgentForTests,
} from "./ContactEnrichmentMasivoICPAgent";
export {
  ContactEnrichmentMasivoDedupeAgent,
  getContactEnrichmentMasivoDedupeAgent,
  resetContactEnrichmentMasivoDedupeAgentForTests,
} from "./ContactEnrichmentMasivoDedupeAgent";
export {
  ContactEnrichmentMasivoReportAgent,
  getContactEnrichmentMasivoReportAgent,
  resetContactEnrichmentMasivoReportAgentForTests,
} from "./ContactEnrichmentMasivoReportAgent";

export function resetAllContactEnrichmentMasivoAgentsForTests(): void {
  ContactEnrichmentMasivoEmailAgent.reset();
  ContactEnrichmentMasivoPhoneAgent.reset();
  ContactEnrichmentMasivoLinkedInAgent.reset();
  ContactEnrichmentMasivoCompanyAgent.reset();
  ContactEnrichmentMasivoSocialAgent.reset();
  ContactEnrichmentMasivoICPAgent.reset();
  ContactEnrichmentMasivoDedupeAgent.reset();
  ContactEnrichmentMasivoReportAgent.reset();
}
