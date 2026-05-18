import { AntiGenericCalibrationAgent } from "./AntiGenericCalibrationAgent";
import { AntiGenericDataAgent } from "./AntiGenericDataAgent";
import { AntiGenericDetectorAgent } from "./AntiGenericDetectorAgent";
import { AntiGenericFeedbackAgent } from "./AntiGenericFeedbackAgent";
import { AntiGenericRewriterAgent } from "./AntiGenericRewriterAgent";
import { AntiGenericScoreAgent } from "./AntiGenericScoreAgent";
import { AntiGenericSectorAgent } from "./AntiGenericSectorAgent";
import { AntiGenericToneAgent } from "./AntiGenericToneAgent";

export type { AntiGenericInput, AntiGenericOutput } from "./shared";
export { parseAntiGenericLlmJson, buildAntiGenericPrompt, llmOpts as antiGenericLlmOpts } from "./shared";

export {
  AntiGenericDetectorAgent,
  getAntiGenericDetectorAgent,
  resetAntiGenericDetectorAgentForTests,
} from "./AntiGenericDetectorAgent";
export {
  AntiGenericRewriterAgent,
  getAntiGenericRewriterAgent,
  resetAntiGenericRewriterAgentForTests,
} from "./AntiGenericRewriterAgent";
export {
  AntiGenericSectorAgent,
  getAntiGenericSectorAgent,
  resetAntiGenericSectorAgentForTests,
} from "./AntiGenericSectorAgent";
export {
  AntiGenericDataAgent,
  getAntiGenericDataAgent,
  resetAntiGenericDataAgentForTests,
} from "./AntiGenericDataAgent";
export {
  AntiGenericToneAgent,
  getAntiGenericToneAgent,
  resetAntiGenericToneAgentForTests,
} from "./AntiGenericToneAgent";
export {
  AntiGenericScoreAgent,
  getAntiGenericScoreAgent,
  resetAntiGenericScoreAgentForTests,
} from "./AntiGenericScoreAgent";
export {
  AntiGenericFeedbackAgent,
  getAntiGenericFeedbackAgent,
  resetAntiGenericFeedbackAgentForTests,
} from "./AntiGenericFeedbackAgent";
export {
  AntiGenericCalibrationAgent,
  getAntiGenericCalibrationAgent,
  resetAntiGenericCalibrationAgentForTests,
} from "./AntiGenericCalibrationAgent";

export function resetAllAntiGenericAgentsForTests(): void {
  AntiGenericDetectorAgent.reset();
  AntiGenericRewriterAgent.reset();
  AntiGenericSectorAgent.reset();
  AntiGenericDataAgent.reset();
  AntiGenericToneAgent.reset();
  AntiGenericScoreAgent.reset();
  AntiGenericFeedbackAgent.reset();
  AntiGenericCalibrationAgent.reset();
}
