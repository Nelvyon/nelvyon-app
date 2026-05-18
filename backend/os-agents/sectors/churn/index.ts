import { ChurnEscalationTriggerAgent } from "./ChurnEscalationTriggerAgent";
import { ChurnReengagementSequenceAgent } from "./ChurnReengagementSequenceAgent";
import { ChurnRetentionOfferAgent } from "./ChurnRetentionOfferAgent";
import { ChurnRiskScorerAgent } from "./ChurnRiskScorerAgent";
import { ChurnRootCauseAnalystAgent } from "./ChurnRootCauseAnalystAgent";
import { ChurnSegmentClassifierAgent } from "./ChurnSegmentClassifierAgent";
import { ChurnSignalDetectorAgent } from "./ChurnSignalDetectorAgent";
import { ChurnSuccessStoryAgent } from "./ChurnSuccessStoryAgent";

export type { ChurnInput, ChurnOutput, ChurnRiskLevel } from "./shared";
export { parseChurnLlmJson, buildRetainPrompt, churnTemperature, llmOpts as churnLlmOpts } from "./shared";

export {
  ChurnRiskScorerAgent,
  getChurnRiskScorerAgent,
  resetChurnRiskScorerAgentForTests,
} from "./ChurnRiskScorerAgent";
export {
  ChurnSignalDetectorAgent,
  getChurnSignalDetectorAgent,
  resetChurnSignalDetectorAgentForTests,
} from "./ChurnSignalDetectorAgent";
export {
  ChurnSegmentClassifierAgent,
  getChurnSegmentClassifierAgent,
  resetChurnSegmentClassifierAgentForTests,
} from "./ChurnSegmentClassifierAgent";
export {
  ChurnRetentionOfferAgent,
  getChurnRetentionOfferAgent,
  resetChurnRetentionOfferAgentForTests,
} from "./ChurnRetentionOfferAgent";
export {
  ChurnReengagementSequenceAgent,
  getChurnReengagementSequenceAgent,
  resetChurnReengagementSequenceAgentForTests,
} from "./ChurnReengagementSequenceAgent";
export {
  ChurnRootCauseAnalystAgent,
  getChurnRootCauseAnalystAgent,
  resetChurnRootCauseAnalystAgentForTests,
} from "./ChurnRootCauseAnalystAgent";
export {
  ChurnSuccessStoryAgent,
  getChurnSuccessStoryAgent,
  resetChurnSuccessStoryAgentForTests,
} from "./ChurnSuccessStoryAgent";
export {
  ChurnEscalationTriggerAgent,
  getChurnEscalationTriggerAgent,
  resetChurnEscalationTriggerAgentForTests,
} from "./ChurnEscalationTriggerAgent";

export function resetAllChurnAgentsForTests(): void {
  ChurnRiskScorerAgent.reset();
  ChurnSignalDetectorAgent.reset();
  ChurnSegmentClassifierAgent.reset();
  ChurnRetentionOfferAgent.reset();
  ChurnReengagementSequenceAgent.reset();
  ChurnRootCauseAnalystAgent.reset();
  ChurnSuccessStoryAgent.reset();
  ChurnEscalationTriggerAgent.reset();
}
