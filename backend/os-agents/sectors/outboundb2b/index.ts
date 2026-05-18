import { OutboundB2BAnalyticsAgent } from "./OutboundB2BAnalyticsAgent";
import { OutboundB2BCopywriterAgent } from "./OutboundB2BCopywriterAgent";
import { OutboundB2BFollowUpAgent } from "./OutboundB2BFollowUpAgent";
import { OutboundB2BMeetingAgent } from "./OutboundB2BMeetingAgent";
import { OutboundB2BProspectorAgent } from "./OutboundB2BProspectorAgent";
import { OutboundB2BQualifierAgent } from "./OutboundB2BQualifierAgent";
import { OutboundB2BResearchAgent } from "./OutboundB2BResearchAgent";
import { OutboundB2BSequenceAgent } from "./OutboundB2BSequenceAgent";

export type { OutboundB2BInput, OutboundB2BOutput } from "./shared";
export { parseOutboundB2BLlmJson, buildOutboundB2BPrompt, llmOpts as outboundB2BLlmOpts } from "./shared";

export {
  OutboundB2BProspectorAgent,
  getOutboundB2BProspectorAgent,
  resetOutboundB2BProspectorAgentForTests,
} from "./OutboundB2BProspectorAgent";
export {
  OutboundB2BResearchAgent,
  getOutboundB2BResearchAgent,
  resetOutboundB2BResearchAgentForTests,
} from "./OutboundB2BResearchAgent";
export {
  OutboundB2BCopywriterAgent,
  getOutboundB2BCopywriterAgent,
  resetOutboundB2BCopywriterAgentForTests,
} from "./OutboundB2BCopywriterAgent";
export {
  OutboundB2BSequenceAgent,
  getOutboundB2BSequenceAgent,
  resetOutboundB2BSequenceAgentForTests,
} from "./OutboundB2BSequenceAgent";
export {
  OutboundB2BFollowUpAgent,
  getOutboundB2BFollowUpAgent,
  resetOutboundB2BFollowUpAgentForTests,
} from "./OutboundB2BFollowUpAgent";
export {
  OutboundB2BQualifierAgent,
  getOutboundB2BQualifierAgent,
  resetOutboundB2BQualifierAgentForTests,
} from "./OutboundB2BQualifierAgent";
export {
  OutboundB2BMeetingAgent,
  getOutboundB2BMeetingAgent,
  resetOutboundB2BMeetingAgentForTests,
} from "./OutboundB2BMeetingAgent";
export {
  OutboundB2BAnalyticsAgent,
  getOutboundB2BAnalyticsAgent,
  resetOutboundB2BAnalyticsAgentForTests,
} from "./OutboundB2BAnalyticsAgent";

export function resetAllOutboundB2BAgentsForTests(): void {
  OutboundB2BProspectorAgent.reset();
  OutboundB2BResearchAgent.reset();
  OutboundB2BCopywriterAgent.reset();
  OutboundB2BSequenceAgent.reset();
  OutboundB2BFollowUpAgent.reset();
  OutboundB2BQualifierAgent.reset();
  OutboundB2BMeetingAgent.reset();
  OutboundB2BAnalyticsAgent.reset();
}
