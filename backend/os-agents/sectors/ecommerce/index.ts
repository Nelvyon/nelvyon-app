import { CartAbandonmentAgent } from "./CartAbandonmentAgent";
import { EcommerceAdsAgent } from "./EcommerceAdsAgent";
import { EcommerceAnalyticsAgent } from "./EcommerceAnalyticsAgent";
import { EcommerceAuditAgent } from "./EcommerceAuditAgent";
import { EcommercePersonalizationAgent } from "./EcommercePersonalizationAgent";
import { EcommerceSEOAgent } from "./EcommerceSEOAgent";
import { InventoryIntelAgent } from "./InventoryIntelAgent";
import { ProductOptimizationAgent } from "./ProductOptimizationAgent";

export type { EcommerceInput, EcommerceOutput } from "./shared";
export { parseEcommerceLlmJson, buildEcommercePrompt, llmOpts as ecommerceLlmOpts } from "./shared";

export {
  EcommerceAuditAgent,
  getEcommerceAuditAgent,
  resetEcommerceAuditAgentForTests,
} from "./EcommerceAuditAgent";
export {
  ProductOptimizationAgent,
  getProductOptimizationAgent,
  resetProductOptimizationAgentForTests,
} from "./ProductOptimizationAgent";
export {
  CartAbandonmentAgent,
  getCartAbandonmentAgent,
  resetCartAbandonmentAgentForTests,
} from "./CartAbandonmentAgent";
export {
  EcommercePersonalizationAgent,
  getEcommercePersonalizationAgent,
  resetEcommercePersonalizationAgentForTests,
} from "./EcommercePersonalizationAgent";
export { EcommerceSEOAgent, getEcommerceSEOAgent, resetEcommerceSEOAgentForTests } from "./EcommerceSEOAgent";
export { EcommerceAdsAgent, getEcommerceAdsAgent, resetEcommerceAdsAgentForTests } from "./EcommerceAdsAgent";
export {
  InventoryIntelAgent,
  getInventoryIntelAgent,
  resetInventoryIntelAgentForTests,
} from "./InventoryIntelAgent";
export {
  EcommerceAnalyticsAgent,
  getEcommerceAnalyticsAgent,
  resetEcommerceAnalyticsAgentForTests,
} from "./EcommerceAnalyticsAgent";

export function resetAllEcommerceAgentsForTests(): void {
  EcommerceAuditAgent.reset();
  ProductOptimizationAgent.reset();
  CartAbandonmentAgent.reset();
  EcommercePersonalizationAgent.reset();
  EcommerceSEOAgent.reset();
  EcommerceAdsAgent.reset();
  InventoryIntelAgent.reset();
  EcommerceAnalyticsAgent.reset();
}
