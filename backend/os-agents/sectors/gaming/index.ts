export type { GamingInput, GamingOutput } from "./shared";
export {
  gamingLlmOpts as gamingLlmOpts,
  parseGamingLlmJson,
  buildGamingPrompt,
  runGamingAgentCore,
  getDefaultGamingLlm,
} from "./shared";
export * from "./GamingLanzamientoAgent";
export * from "./GamingComunidadAgent";
export * from "./GamingPreciosAgent";
export * from "./GamingSEOAgent";
export * from "./GamingSocialAgent";
export * from "./GamingEmailAgent";
export * from "./GamingReviewsAgent";
export * from "./GamingAnalyticsAgent";

import { resetGamingAnalyticsAgentForTests } from "./GamingAnalyticsAgent";
import { resetGamingComunidadAgentForTests } from "./GamingComunidadAgent";
import { resetGamingEmailAgentForTests } from "./GamingEmailAgent";
import { resetGamingLanzamientoAgentForTests } from "./GamingLanzamientoAgent";
import { resetGamingPreciosAgentForTests } from "./GamingPreciosAgent";
import { resetGamingReviewsAgentForTests } from "./GamingReviewsAgent";
import { resetGamingSEOAgentForTests } from "./GamingSEOAgent";
import { resetGamingSocialAgentForTests } from "./GamingSocialAgent";

export function resetAllGamingAgentsForTests(): void {
  resetGamingLanzamientoAgentForTests();
  resetGamingComunidadAgentForTests();
  resetGamingPreciosAgentForTests();
  resetGamingSEOAgentForTests();
  resetGamingSocialAgentForTests();
  resetGamingEmailAgentForTests();
  resetGamingReviewsAgentForTests();
  resetGamingAnalyticsAgentForTests();
}
