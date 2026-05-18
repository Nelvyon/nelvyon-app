export type { CustomerJourneyInput, CustomerJourneyOutput } from "./shared";
export {
  customerJourneyLlmOpts as customerJourneyLlmOpts,
  parseCustomerJourneyLlmJson,
  buildCustomerJourneyPrompt,
  runCustomerJourneyAgentCore,
  getDefaultCustomerJourneyLlm,
} from "./shared";
export * from "./CustomerJourneyMapeoAgent";
export * from "./CustomerJourneyFriccionAgent";
export * from "./CustomerJourneyPersonalizacionAgent";
export * from "./CustomerJourneyNurturingAgent";
export * from "./CustomerJourneyRecuperacionAgent";
export * from "./CustomerJourneyMetricasAgent";
export * from "./CustomerJourneyOptimizadorAgent";
export * from "./CustomerJourneyOmnichannelAgent";

import { resetCustomerJourneyFriccionAgentForTests } from "./CustomerJourneyFriccionAgent";
import { resetCustomerJourneyMapeoAgentForTests } from "./CustomerJourneyMapeoAgent";
import { resetCustomerJourneyMetricasAgentForTests } from "./CustomerJourneyMetricasAgent";
import { resetCustomerJourneyNurturingAgentForTests } from "./CustomerJourneyNurturingAgent";
import { resetCustomerJourneyOmnichannelAgentForTests } from "./CustomerJourneyOmnichannelAgent";
import { resetCustomerJourneyOptimizadorAgentForTests } from "./CustomerJourneyOptimizadorAgent";
import { resetCustomerJourneyPersonalizacionAgentForTests } from "./CustomerJourneyPersonalizacionAgent";
import { resetCustomerJourneyRecuperacionAgentForTests } from "./CustomerJourneyRecuperacionAgent";

export function resetAllCustomerJourneyAgentsForTests(): void {
  resetCustomerJourneyMapeoAgentForTests();
  resetCustomerJourneyFriccionAgentForTests();
  resetCustomerJourneyPersonalizacionAgentForTests();
  resetCustomerJourneyNurturingAgentForTests();
  resetCustomerJourneyRecuperacionAgentForTests();
  resetCustomerJourneyMetricasAgentForTests();
  resetCustomerJourneyOptimizadorAgentForTests();
  resetCustomerJourneyOmnichannelAgentForTests();
}
