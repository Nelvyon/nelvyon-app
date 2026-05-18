import { PerfPredictorBudgetAgent } from "./PerfPredictorBudgetAgent";
import { PerfPredictorCalibrationAgent } from "./PerfPredictorCalibrationAgent";
import { PerfPredictorChannelAgent } from "./PerfPredictorChannelAgent";
import { PerfPredictorForecastAgent } from "./PerfPredictorForecastAgent";
import { PerfPredictorReportAgent } from "./PerfPredictorReportAgent";
import { PerfPredictorRiskAgent } from "./PerfPredictorRiskAgent";
import { PerfPredictorSeasonAgent } from "./PerfPredictorSeasonAgent";
import { PerfPredictorTrendAgent } from "./PerfPredictorTrendAgent";

export type { PerfPredictorInput, PerfPredictorOutput } from "./shared";
export { parsePerfPredictorLlmJson, buildPerfPredictorPrompt, llmOpts as perfPredictorLlmOpts } from "./shared";

export {
  PerfPredictorForecastAgent,
  getPerfPredictorForecastAgent,
  resetPerfPredictorForecastAgentForTests,
} from "./PerfPredictorForecastAgent";
export {
  PerfPredictorTrendAgent,
  getPerfPredictorTrendAgent,
  resetPerfPredictorTrendAgentForTests,
} from "./PerfPredictorTrendAgent";
export {
  PerfPredictorBudgetAgent,
  getPerfPredictorBudgetAgent,
  resetPerfPredictorBudgetAgentForTests,
} from "./PerfPredictorBudgetAgent";
export {
  PerfPredictorChannelAgent,
  getPerfPredictorChannelAgent,
  resetPerfPredictorChannelAgentForTests,
} from "./PerfPredictorChannelAgent";
export {
  PerfPredictorSeasonAgent,
  getPerfPredictorSeasonAgent,
  resetPerfPredictorSeasonAgentForTests,
} from "./PerfPredictorSeasonAgent";
export {
  PerfPredictorRiskAgent,
  getPerfPredictorRiskAgent,
  resetPerfPredictorRiskAgentForTests,
} from "./PerfPredictorRiskAgent";
export {
  PerfPredictorCalibrationAgent,
  getPerfPredictorCalibrationAgent,
  resetPerfPredictorCalibrationAgentForTests,
} from "./PerfPredictorCalibrationAgent";
export {
  PerfPredictorReportAgent,
  getPerfPredictorReportAgent,
  resetPerfPredictorReportAgentForTests,
} from "./PerfPredictorReportAgent";

export function resetAllPerfPredictorAgentsForTests(): void {
  PerfPredictorForecastAgent.reset();
  PerfPredictorTrendAgent.reset();
  PerfPredictorBudgetAgent.reset();
  PerfPredictorChannelAgent.reset();
  PerfPredictorSeasonAgent.reset();
  PerfPredictorRiskAgent.reset();
  PerfPredictorCalibrationAgent.reset();
  PerfPredictorReportAgent.reset();
}
