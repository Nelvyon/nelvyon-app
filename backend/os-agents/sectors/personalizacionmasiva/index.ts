import { PersonalizacionMasivaAdsAgent } from "./PersonalizacionMasivaAdsAgent";
import { PersonalizacionMasivaAnalyticsAgent } from "./PersonalizacionMasivaAnalyticsAgent";
import { PersonalizacionMasivaContentAgent } from "./PersonalizacionMasivaContentAgent";
import { PersonalizacionMasivaEmailAgent } from "./PersonalizacionMasivaEmailAgent";
import { PersonalizacionMasivaOfferAgent } from "./PersonalizacionMasivaOfferAgent";
import { PersonalizacionMasivaSegmentAgent } from "./PersonalizacionMasivaSegmentAgent";
import { PersonalizacionMasivaTimingAgent } from "./PersonalizacionMasivaTimingAgent";
import { PersonalizacionMasivaWebAgent } from "./PersonalizacionMasivaWebAgent";

export type { PersonalizacionMasivaInput, PersonalizacionMasivaOutput } from "./shared";
export {
  parsePersonalizacionMasivaLlmJson,
  buildPersonalizacionMasivaPrompt,
  llmOpts as personalizacionmasivaLlmOpts,
} from "./shared";

export {
  PersonalizacionMasivaSegmentAgent,
  getPersonalizacionMasivaSegmentAgent,
  resetPersonalizacionMasivaSegmentAgentForTests,
} from "./PersonalizacionMasivaSegmentAgent";
export {
  PersonalizacionMasivaContentAgent,
  getPersonalizacionMasivaContentAgent,
  resetPersonalizacionMasivaContentAgentForTests,
} from "./PersonalizacionMasivaContentAgent";
export {
  PersonalizacionMasivaEmailAgent,
  getPersonalizacionMasivaEmailAgent,
  resetPersonalizacionMasivaEmailAgentForTests,
} from "./PersonalizacionMasivaEmailAgent";
export {
  PersonalizacionMasivaWebAgent,
  getPersonalizacionMasivaWebAgent,
  resetPersonalizacionMasivaWebAgentForTests,
} from "./PersonalizacionMasivaWebAgent";
export {
  PersonalizacionMasivaAdsAgent,
  getPersonalizacionMasivaAdsAgent,
  resetPersonalizacionMasivaAdsAgentForTests,
} from "./PersonalizacionMasivaAdsAgent";
export {
  PersonalizacionMasivaTimingAgent,
  getPersonalizacionMasivaTimingAgent,
  resetPersonalizacionMasivaTimingAgentForTests,
} from "./PersonalizacionMasivaTimingAgent";
export {
  PersonalizacionMasivaOfferAgent,
  getPersonalizacionMasivaOfferAgent,
  resetPersonalizacionMasivaOfferAgentForTests,
} from "./PersonalizacionMasivaOfferAgent";
export {
  PersonalizacionMasivaAnalyticsAgent,
  getPersonalizacionMasivaAnalyticsAgent,
  resetPersonalizacionMasivaAnalyticsAgentForTests,
} from "./PersonalizacionMasivaAnalyticsAgent";

export function resetAllPersonalizacionMasivaAgentsForTests(): void {
  PersonalizacionMasivaSegmentAgent.reset();
  PersonalizacionMasivaContentAgent.reset();
  PersonalizacionMasivaEmailAgent.reset();
  PersonalizacionMasivaWebAgent.reset();
  PersonalizacionMasivaAdsAgent.reset();
  PersonalizacionMasivaTimingAgent.reset();
  PersonalizacionMasivaOfferAgent.reset();
  PersonalizacionMasivaAnalyticsAgent.reset();
}
