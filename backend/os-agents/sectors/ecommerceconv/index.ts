export type { EcommerceConvInput, EcommerceConvOutput } from "./shared";
export {
  ecommerceConvLlmOpts as ecommerceConvLlmOpts,
  parseEcommerceConvLlmJson,
  buildEcommerceConvPrompt,
  runEcommerceConvAgentCore,
  getDefaultEcommerceConvLlm,
} from "./shared";
export * from "./EcommerceConvCarritoAgent";
export * from "./EcommerceConvUpsellAgent";
export * from "./EcommerceConvProductoAgent";
export * from "./EcommerceConvCheckoutAgent";
export * from "./EcommerceConvPersonalizacionAgent";
export * from "./EcommerceConvReviewsAgent";
export * from "./EcommerceConvFidelizacionAgent";
export * from "./EcommerceConvPreciosAgent";

import { resetEcommerceConvCarritoAgentForTests } from "./EcommerceConvCarritoAgent";
import { resetEcommerceConvCheckoutAgentForTests } from "./EcommerceConvCheckoutAgent";
import { resetEcommerceConvFidelizacionAgentForTests } from "./EcommerceConvFidelizacionAgent";
import { resetEcommerceConvPersonalizacionAgentForTests } from "./EcommerceConvPersonalizacionAgent";
import { resetEcommerceConvPreciosAgentForTests } from "./EcommerceConvPreciosAgent";
import { resetEcommerceConvProductoAgentForTests } from "./EcommerceConvProductoAgent";
import { resetEcommerceConvReviewsAgentForTests } from "./EcommerceConvReviewsAgent";
import { resetEcommerceConvUpsellAgentForTests } from "./EcommerceConvUpsellAgent";

export function resetAllEcommerceConvAgentsForTests(): void {
  resetEcommerceConvCarritoAgentForTests();
  resetEcommerceConvUpsellAgentForTests();
  resetEcommerceConvProductoAgentForTests();
  resetEcommerceConvCheckoutAgentForTests();
  resetEcommerceConvPersonalizacionAgentForTests();
  resetEcommerceConvReviewsAgentForTests();
  resetEcommerceConvFidelizacionAgentForTests();
  resetEcommerceConvPreciosAgentForTests();
}
