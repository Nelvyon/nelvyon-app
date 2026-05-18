import { ScalingAnnualConversionAgent } from "./ScalingAnnualConversionAgent";
import { ScalingDowngradeRiskAgent } from "./ScalingDowngradeRiskAgent";
import { ScalingExpansionRevenueAgent } from "./ScalingExpansionRevenueAgent";
import { ScalingFrictionReducerAgent } from "./ScalingFrictionReducerAgent";
import { ScalingPricingAnchorAgent } from "./ScalingPricingAnchorAgent";
import { ScalingTimingOptimizerAgent } from "./ScalingTimingOptimizerAgent";
import { ScalingUpgradeProposerAgent } from "./ScalingUpgradeProposerAgent";
import { ScalingUsageAnalyzerAgent } from "./ScalingUsageAnalyzerAgent";

export type { ScalingInput, ScalingOutput } from "./shared";
export { parseScalingLlmJson, buildExpandPrompt, llmOpts as scalingLlmOpts } from "./shared";

export {
  ScalingUsageAnalyzerAgent,
  getScalingUsageAnalyzerAgent,
  resetScalingUsageAnalyzerAgentForTests,
} from "./ScalingUsageAnalyzerAgent";
export {
  ScalingUpgradeProposerAgent,
  getScalingUpgradeProposerAgent,
  resetScalingUpgradeProposerAgentForTests,
} from "./ScalingUpgradeProposerAgent";
export {
  ScalingPricingAnchorAgent,
  getScalingPricingAnchorAgent,
  resetScalingPricingAnchorAgentForTests,
} from "./ScalingPricingAnchorAgent";
export {
  ScalingFrictionReducerAgent,
  getScalingFrictionReducerAgent,
  resetScalingFrictionReducerAgentForTests,
} from "./ScalingFrictionReducerAgent";
export {
  ScalingTimingOptimizerAgent,
  getScalingTimingOptimizerAgent,
  resetScalingTimingOptimizerAgentForTests,
} from "./ScalingTimingOptimizerAgent";
export {
  ScalingDowngradeRiskAgent,
  getScalingDowngradeRiskAgent,
  resetScalingDowngradeRiskAgentForTests,
} from "./ScalingDowngradeRiskAgent";
export {
  ScalingAnnualConversionAgent,
  getScalingAnnualConversionAgent,
  resetScalingAnnualConversionAgentForTests,
} from "./ScalingAnnualConversionAgent";
export {
  ScalingExpansionRevenueAgent,
  getScalingExpansionRevenueAgent,
  resetScalingExpansionRevenueAgentForTests,
} from "./ScalingExpansionRevenueAgent";

export function resetAllScalingAgentsForTests(): void {
  ScalingUsageAnalyzerAgent.reset();
  ScalingUpgradeProposerAgent.reset();
  ScalingPricingAnchorAgent.reset();
  ScalingFrictionReducerAgent.reset();
  ScalingTimingOptimizerAgent.reset();
  ScalingDowngradeRiskAgent.reset();
  ScalingAnnualConversionAgent.reset();
  ScalingExpansionRevenueAgent.reset();
}
