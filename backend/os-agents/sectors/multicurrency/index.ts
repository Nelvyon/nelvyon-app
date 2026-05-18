import { MultiCurrencyBillingAgent } from "./MultiCurrencyBillingAgent";
import { MultiCurrencyConverterAgent } from "./MultiCurrencyConverterAgent";
import { MultiCurrencyDetectorAgent } from "./MultiCurrencyDetectorAgent";
import { MultiCurrencyDisplayAgent } from "./MultiCurrencyDisplayAgent";
import { MultiCurrencyPricingAgent } from "./MultiCurrencyPricingAgent";
import { MultiCurrencyRateUpdaterAgent } from "./MultiCurrencyRateUpdaterAgent";
import { MultiCurrencyReportAgent } from "./MultiCurrencyReportAgent";
import { MultiCurrencyRiskAgent } from "./MultiCurrencyRiskAgent";

export type { MultiCurrencyCode, MultiCurrencyInput, MultiCurrencyOutput } from "./shared";
export {
  parseMultiCurrencyLlmJson,
  buildMultiCurrencyPrompt,
  llmOpts as multiCurrencyLlmOpts,
} from "./shared";

export {
  MultiCurrencyDetectorAgent,
  getMultiCurrencyDetectorAgent,
  resetMultiCurrencyDetectorAgentForTests,
} from "./MultiCurrencyDetectorAgent";
export {
  MultiCurrencyConverterAgent,
  getMultiCurrencyConverterAgent,
  resetMultiCurrencyConverterAgentForTests,
} from "./MultiCurrencyConverterAgent";
export {
  MultiCurrencyPricingAgent,
  getMultiCurrencyPricingAgent,
  resetMultiCurrencyPricingAgentForTests,
} from "./MultiCurrencyPricingAgent";
export {
  MultiCurrencyDisplayAgent,
  getMultiCurrencyDisplayAgent,
  resetMultiCurrencyDisplayAgentForTests,
} from "./MultiCurrencyDisplayAgent";
export {
  MultiCurrencyBillingAgent,
  getMultiCurrencyBillingAgent,
  resetMultiCurrencyBillingAgentForTests,
} from "./MultiCurrencyBillingAgent";
export {
  MultiCurrencyRateUpdaterAgent,
  getMultiCurrencyRateUpdaterAgent,
  resetMultiCurrencyRateUpdaterAgentForTests,
} from "./MultiCurrencyRateUpdaterAgent";
export {
  MultiCurrencyReportAgent,
  getMultiCurrencyReportAgent,
  resetMultiCurrencyReportAgentForTests,
} from "./MultiCurrencyReportAgent";
export {
  MultiCurrencyRiskAgent,
  getMultiCurrencyRiskAgent,
  resetMultiCurrencyRiskAgentForTests,
} from "./MultiCurrencyRiskAgent";

export function resetAllMultiCurrencyAgentsForTests(): void {
  MultiCurrencyDetectorAgent.reset();
  MultiCurrencyConverterAgent.reset();
  MultiCurrencyPricingAgent.reset();
  MultiCurrencyDisplayAgent.reset();
  MultiCurrencyBillingAgent.reset();
  MultiCurrencyRateUpdaterAgent.reset();
  MultiCurrencyReportAgent.reset();
  MultiCurrencyRiskAgent.reset();
}
