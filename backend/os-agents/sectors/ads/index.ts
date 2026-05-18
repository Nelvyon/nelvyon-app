export type { AdsInput, AdsOutput } from "./shared";
export {
  adsLlmOpts as adsLlmOpts,
  parseAdsLlmJson,
  runAdsAgentCore,
  getDefaultAdsLlm,
} from "./shared";
export * from "./AdsEstrategiaAgent";
export * from "./AdsGoogleAgent";
export * from "./AdsMetaAgent";
export * from "./AdsTiktokAgent";
export * from "./AdsAudienciasAgent";
export * from "./AdsCreatividadesAgent";
export * from "./AdsAttributionAgent";
export * from "./AdsOptimizacionAgent";

import { resetAdsAttributionAgentForTests } from "./AdsAttributionAgent";
import { resetAdsAudienciasAgentForTests } from "./AdsAudienciasAgent";
import { resetAdsCreatividadesAgentForTests } from "./AdsCreatividadesAgent";
import { resetAdsEstrategiaAgentForTests } from "./AdsEstrategiaAgent";
import { resetAdsGoogleAgentForTests } from "./AdsGoogleAgent";
import { resetAdsMetaAgentForTests } from "./AdsMetaAgent";
import { resetAdsOptimizacionAgentForTests } from "./AdsOptimizacionAgent";
import { resetAdsTiktokAgentForTests } from "./AdsTiktokAgent";

export function resetAllAdsAgentsForTests(): void {
  resetAdsEstrategiaAgentForTests();
  resetAdsGoogleAgentForTests();
  resetAdsMetaAgentForTests();
  resetAdsTiktokAgentForTests();
  resetAdsAudienciasAgentForTests();
  resetAdsCreatividadesAgentForTests();
  resetAdsAttributionAgentForTests();
  resetAdsOptimizacionAgentForTests();
}
