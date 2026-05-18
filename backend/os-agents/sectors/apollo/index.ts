import { ApolloAnalyticsAgent } from "./ApolloAnalyticsAgent";
import { ApolloAuthAgent } from "./ApolloAuthAgent";
import { ApolloEmailAgent } from "./ApolloEmailAgent";
import { ApolloEnrichAgent } from "./ApolloEnrichAgent";
import { ApolloIntentAgent } from "./ApolloIntentAgent";
import { ApolloProspectAgent } from "./ApolloProspectAgent";
import { ApolloSequenceAgent } from "./ApolloSequenceAgent";
import { ApolloSyncAgent } from "./ApolloSyncAgent";

export type { ApolloInput, ApolloOutput } from "./shared";
export { parseApolloLlmJson, buildApolloPrompt, llmOpts as apolloLlmOpts } from "./shared";

export {
  ApolloAuthAgent,
  getApolloAuthAgent,
  resetApolloAuthAgentForTests,
} from "./ApolloAuthAgent";
export {
  ApolloProspectAgent,
  getApolloProspectAgent,
  resetApolloProspectAgentForTests,
} from "./ApolloProspectAgent";
export {
  ApolloEnrichAgent,
  getApolloEnrichAgent,
  resetApolloEnrichAgentForTests,
} from "./ApolloEnrichAgent";
export {
  ApolloSequenceAgent,
  getApolloSequenceAgent,
  resetApolloSequenceAgentForTests,
} from "./ApolloSequenceAgent";
export {
  ApolloEmailAgent,
  getApolloEmailAgent,
  resetApolloEmailAgentForTests,
} from "./ApolloEmailAgent";
export {
  ApolloIntentAgent,
  getApolloIntentAgent,
  resetApolloIntentAgentForTests,
} from "./ApolloIntentAgent";
export {
  ApolloAnalyticsAgent,
  getApolloAnalyticsAgent,
  resetApolloAnalyticsAgentForTests,
} from "./ApolloAnalyticsAgent";
export {
  ApolloSyncAgent,
  getApolloSyncAgent,
  resetApolloSyncAgentForTests,
} from "./ApolloSyncAgent";

export function resetAllApolloAgentsForTests(): void {
  ApolloAuthAgent.reset();
  ApolloProspectAgent.reset();
  ApolloEnrichAgent.reset();
  ApolloSequenceAgent.reset();
  ApolloEmailAgent.reset();
  ApolloIntentAgent.reset();
  ApolloAnalyticsAgent.reset();
  ApolloSyncAgent.reset();
}
