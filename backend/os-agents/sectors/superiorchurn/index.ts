import { SuperiorChurnHealthScoreAgent } from "./SuperiorChurnHealthScoreAgent";
import { SuperiorChurnInterventionAgent } from "./SuperiorChurnInterventionAgent";
import { SuperiorChurnPlaybookAgent } from "./SuperiorChurnPlaybookAgent";
import { SuperiorChurnPredictorAgent } from "./SuperiorChurnPredictorAgent";
import { SuperiorChurnRevenueImpactAgent } from "./SuperiorChurnRevenueImpactAgent";
import { SuperiorChurnSegmentAgent } from "./SuperiorChurnSegmentAgent";
import { SuperiorChurnSignalsAgent } from "./SuperiorChurnSignalsAgent";
import { SuperiorChurnWinbackAgent } from "./SuperiorChurnWinbackAgent";

export type { SuperiorChurnInput, SuperiorChurnOutput } from "./shared";
export { parseSuperiorChurnLlmJson, buildSuperiorChurnPrompt, llmOpts as superiorchurnLlmOpts } from "./shared";

export {
  SuperiorChurnPredictorAgent,
  getSuperiorChurnPredictorAgent,
  resetSuperiorChurnPredictorAgentForTests,
} from "./SuperiorChurnPredictorAgent";
export {
  SuperiorChurnSignalsAgent,
  getSuperiorChurnSignalsAgent,
  resetSuperiorChurnSignalsAgentForTests,
} from "./SuperiorChurnSignalsAgent";
export {
  SuperiorChurnSegmentAgent,
  getSuperiorChurnSegmentAgent,
  resetSuperiorChurnSegmentAgentForTests,
} from "./SuperiorChurnSegmentAgent";
export {
  SuperiorChurnPlaybookAgent,
  getSuperiorChurnPlaybookAgent,
  resetSuperiorChurnPlaybookAgentForTests,
} from "./SuperiorChurnPlaybookAgent";
export {
  SuperiorChurnWinbackAgent,
  getSuperiorChurnWinbackAgent,
  resetSuperiorChurnWinbackAgentForTests,
} from "./SuperiorChurnWinbackAgent";
export {
  SuperiorChurnHealthScoreAgent,
  getSuperiorChurnHealthScoreAgent,
  resetSuperiorChurnHealthScoreAgentForTests,
} from "./SuperiorChurnHealthScoreAgent";
export {
  SuperiorChurnRevenueImpactAgent,
  getSuperiorChurnRevenueImpactAgent,
  resetSuperiorChurnRevenueImpactAgentForTests,
} from "./SuperiorChurnRevenueImpactAgent";
export {
  SuperiorChurnInterventionAgent,
  getSuperiorChurnInterventionAgent,
  resetSuperiorChurnInterventionAgentForTests,
} from "./SuperiorChurnInterventionAgent";

export function resetAllSuperiorChurnAgentsForTests(): void {
  SuperiorChurnPredictorAgent.reset();
  SuperiorChurnSignalsAgent.reset();
  SuperiorChurnSegmentAgent.reset();
  SuperiorChurnPlaybookAgent.reset();
  SuperiorChurnWinbackAgent.reset();
  SuperiorChurnHealthScoreAgent.reset();
  SuperiorChurnRevenueImpactAgent.reset();
  SuperiorChurnInterventionAgent.reset();
}
