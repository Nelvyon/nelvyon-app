import { FunnelMultipasoABAgent } from "./FunnelMultipasoABAgent";
import { FunnelMultipasoAnalyticsAgent } from "./FunnelMultipasoAnalyticsAgent";
import { FunnelMultipasoBuilderAgent } from "./FunnelMultipasoBuilderAgent";
import { FunnelMultipasoConversionAgent } from "./FunnelMultipasoConversionAgent";
import { FunnelMultipasoEmailAgent } from "./FunnelMultipasoEmailAgent";
import { FunnelMultipasoReportAgent } from "./FunnelMultipasoReportAgent";
import { FunnelMultipasoRetargetingAgent } from "./FunnelMultipasoRetargetingAgent";
import { FunnelMultipasoTrafficAgent } from "./FunnelMultipasoTrafficAgent";

export type { FunnelMultipasoInput, FunnelMultipasoOutput } from "./shared";
export { parseFunnelMultipasoLlmJson, buildFunnelMultipasoPrompt, llmOpts as funnelmultipasoLlmOpts } from "./shared";

export {
  FunnelMultipasoBuilderAgent,
  getFunnelMultipasoBuilderAgent,
  resetFunnelMultipasoBuilderAgentForTests,
} from "./FunnelMultipasoBuilderAgent";
export {
  FunnelMultipasoTrafficAgent,
  getFunnelMultipasoTrafficAgent,
  resetFunnelMultipasoTrafficAgentForTests,
} from "./FunnelMultipasoTrafficAgent";
export {
  FunnelMultipasoConversionAgent,
  getFunnelMultipasoConversionAgent,
  resetFunnelMultipasoConversionAgentForTests,
} from "./FunnelMultipasoConversionAgent";
export {
  FunnelMultipasoEmailAgent,
  getFunnelMultipasoEmailAgent,
  resetFunnelMultipasoEmailAgentForTests,
} from "./FunnelMultipasoEmailAgent";
export {
  FunnelMultipasoRetargetingAgent,
  getFunnelMultipasoRetargetingAgent,
  resetFunnelMultipasoRetargetingAgentForTests,
} from "./FunnelMultipasoRetargetingAgent";
export {
  FunnelMultipasoAnalyticsAgent,
  getFunnelMultipasoAnalyticsAgent,
  resetFunnelMultipasoAnalyticsAgentForTests,
} from "./FunnelMultipasoAnalyticsAgent";
export {
  FunnelMultipasoABAgent,
  getFunnelMultipasoABAgent,
  resetFunnelMultipasoABAgentForTests,
} from "./FunnelMultipasoABAgent";
export {
  FunnelMultipasoReportAgent,
  getFunnelMultipasoReportAgent,
  resetFunnelMultipasoReportAgentForTests,
} from "./FunnelMultipasoReportAgent";

export function resetAllFunnelMultipasoAgentsForTests(): void {
  FunnelMultipasoBuilderAgent.reset();
  FunnelMultipasoTrafficAgent.reset();
  FunnelMultipasoConversionAgent.reset();
  FunnelMultipasoEmailAgent.reset();
  FunnelMultipasoRetargetingAgent.reset();
  FunnelMultipasoAnalyticsAgent.reset();
  FunnelMultipasoABAgent.reset();
  FunnelMultipasoReportAgent.reset();
}
