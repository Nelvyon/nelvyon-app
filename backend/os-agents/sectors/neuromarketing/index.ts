export type { NeuromarketingInput, NeuromarketingOutput } from "./shared";
export {
  neuromarketingLlmOpts as neuromarketingLlmOpts,
  parseNeuromarketingLlmJson,
  runNeuromarketingAgentCore,
  getDefaultNeuromarketingLlm,
} from "./shared";
export * from "./NeuromarketingSesgosAgent";
export * from "./NeuromarketingCopyAgent";
export * from "./NeuromarketingPricingAgent";
export * from "./NeuromarketingUxAgent";
export * from "./NeuromarketingEmocionesAgent";
export * from "./NeuromarketingConversionAgent";
export * from "./NeuromarketingTestingAgent";
export * from "./NeuromarketingPersonalidadAgent";

import { resetNeuromarketingCopyAgentForTests } from "./NeuromarketingCopyAgent";
import { resetNeuromarketingConversionAgentForTests } from "./NeuromarketingConversionAgent";
import { resetNeuromarketingEmocionesAgentForTests } from "./NeuromarketingEmocionesAgent";
import { resetNeuromarketingPersonalidadAgentForTests } from "./NeuromarketingPersonalidadAgent";
import { resetNeuromarketingPricingAgentForTests } from "./NeuromarketingPricingAgent";
import { resetNeuromarketingSesgosAgentForTests } from "./NeuromarketingSesgosAgent";
import { resetNeuromarketingTestingAgentForTests } from "./NeuromarketingTestingAgent";
import { resetNeuromarketingUxAgentForTests } from "./NeuromarketingUxAgent";

export function resetAllNeuromarketingAgentsForTests(): void {
  resetNeuromarketingSesgosAgentForTests();
  resetNeuromarketingCopyAgentForTests();
  resetNeuromarketingPricingAgentForTests();
  resetNeuromarketingUxAgentForTests();
  resetNeuromarketingEmocionesAgentForTests();
  resetNeuromarketingConversionAgentForTests();
  resetNeuromarketingTestingAgentForTests();
  resetNeuromarketingPersonalidadAgentForTests();
}
