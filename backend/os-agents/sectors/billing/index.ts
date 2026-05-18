import { BillingAlertAgent } from "./BillingAlertAgent";
import { BillingCohortAgent } from "./BillingCohortAgent";
import { BillingDunningAgent } from "./BillingDunningAgent";
import { BillingForecastAgent } from "./BillingForecastAgent";
import { BillingInvoiceAgent } from "./BillingInvoiceAgent";
import { BillingPricingAgent } from "./BillingPricingAgent";
import { BillingRevenueAgent } from "./BillingRevenueAgent";
import { BillingSubscriptionAgent } from "./BillingSubscriptionAgent";

export type { BillingInput, BillingOutput } from "./shared";
export { parseBillingLlmJson, buildBillingPrompt, llmOpts as billingLlmOpts } from "./shared";

export {
  BillingSubscriptionAgent,
  getBillingSubscriptionAgent,
  resetBillingSubscriptionAgentForTests,
} from "./BillingSubscriptionAgent";
export {
  BillingDunningAgent,
  getBillingDunningAgent,
  resetBillingDunningAgentForTests,
} from "./BillingDunningAgent";
export {
  BillingRevenueAgent,
  getBillingRevenueAgent,
  resetBillingRevenueAgentForTests,
} from "./BillingRevenueAgent";
export {
  BillingForecastAgent,
  getBillingForecastAgent,
  resetBillingForecastAgentForTests,
} from "./BillingForecastAgent";
export {
  BillingInvoiceAgent,
  getBillingInvoiceAgent,
  resetBillingInvoiceAgentForTests,
} from "./BillingInvoiceAgent";
export {
  BillingPricingAgent,
  getBillingPricingAgent,
  resetBillingPricingAgentForTests,
} from "./BillingPricingAgent";
export {
  BillingAlertAgent,
  getBillingAlertAgent,
  resetBillingAlertAgentForTests,
} from "./BillingAlertAgent";
export {
  BillingCohortAgent,
  getBillingCohortAgent,
  resetBillingCohortAgentForTests,
} from "./BillingCohortAgent";

export function resetAllBillingAgentsForTests(): void {
  BillingSubscriptionAgent.reset();
  BillingDunningAgent.reset();
  BillingRevenueAgent.reset();
  BillingForecastAgent.reset();
  BillingInvoiceAgent.reset();
  BillingPricingAgent.reset();
  BillingAlertAgent.reset();
  BillingCohortAgent.reset();
}
