import { LeadEnrichCompanyAgent } from "./LeadEnrichCompanyAgent";
import { LeadEnrichContactAgent } from "./LeadEnrichContactAgent";
import { LeadEnrichIntentAgent } from "./LeadEnrichIntentAgent";
import { LeadEnrichProfileAgent } from "./LeadEnrichProfileAgent";
import { LeadEnrichReportAgent } from "./LeadEnrichReportAgent";
import { LeadEnrichScoreAgent } from "./LeadEnrichScoreAgent";
import { LeadEnrichSegmentAgent } from "./LeadEnrichSegmentAgent";
import { LeadEnrichSyncAgent } from "./LeadEnrichSyncAgent";

export type { LeadEnrichInput, LeadEnrichOutput } from "./shared";
export { parseLeadEnrichLlmJson, buildLeadEnrichPrompt, llmOpts as leadEnrichLlmOpts } from "./shared";

export {
  LeadEnrichProfileAgent,
  getLeadEnrichProfileAgent,
  resetLeadEnrichProfileAgentForTests,
} from "./LeadEnrichProfileAgent";
export {
  LeadEnrichCompanyAgent,
  getLeadEnrichCompanyAgent,
  resetLeadEnrichCompanyAgentForTests,
} from "./LeadEnrichCompanyAgent";
export {
  LeadEnrichIntentAgent,
  getLeadEnrichIntentAgent,
  resetLeadEnrichIntentAgentForTests,
} from "./LeadEnrichIntentAgent";
export {
  LeadEnrichScoreAgent,
  getLeadEnrichScoreAgent,
  resetLeadEnrichScoreAgentForTests,
} from "./LeadEnrichScoreAgent";
export {
  LeadEnrichSegmentAgent,
  getLeadEnrichSegmentAgent,
  resetLeadEnrichSegmentAgentForTests,
} from "./LeadEnrichSegmentAgent";
export {
  LeadEnrichContactAgent,
  getLeadEnrichContactAgent,
  resetLeadEnrichContactAgentForTests,
} from "./LeadEnrichContactAgent";
export {
  LeadEnrichSyncAgent,
  getLeadEnrichSyncAgent,
  resetLeadEnrichSyncAgentForTests,
} from "./LeadEnrichSyncAgent";
export {
  LeadEnrichReportAgent,
  getLeadEnrichReportAgent,
  resetLeadEnrichReportAgentForTests,
} from "./LeadEnrichReportAgent";

export function resetAllLeadEnrichAgentsForTests(): void {
  LeadEnrichProfileAgent.reset();
  LeadEnrichCompanyAgent.reset();
  LeadEnrichIntentAgent.reset();
  LeadEnrichScoreAgent.reset();
  LeadEnrichSegmentAgent.reset();
  LeadEnrichContactAgent.reset();
  LeadEnrichSyncAgent.reset();
  LeadEnrichReportAgent.reset();
}
