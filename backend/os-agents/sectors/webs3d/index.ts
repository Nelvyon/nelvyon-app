export type { Webs3dInput, Webs3dOutput } from "./shared";
export {
  webs3dLlmOpts as webs3dLlmOpts,
  parseWebs3dLlmJson,
  buildWebs3dPrompt,
  runWebs3dAgentCore,
  getDefaultWebs3dLlm,
} from "./shared";
export * from "./Webs3dPortfolioAgent";
export * from "./Webs3dClientesAgent";
export * from "./Webs3dPreciosAgent";
export * from "./Webs3dSEOAgent";
export * from "./Webs3dSocialAgent";
export * from "./Webs3dEmailAgent";
export * from "./Webs3dReviewsAgent";
export * from "./Webs3dAnalyticsAgent";

import { resetWebs3dAnalyticsAgentForTests } from "./Webs3dAnalyticsAgent";
import { resetWebs3dClientesAgentForTests } from "./Webs3dClientesAgent";
import { resetWebs3dEmailAgentForTests } from "./Webs3dEmailAgent";
import { resetWebs3dPortfolioAgentForTests } from "./Webs3dPortfolioAgent";
import { resetWebs3dPreciosAgentForTests } from "./Webs3dPreciosAgent";
import { resetWebs3dReviewsAgentForTests } from "./Webs3dReviewsAgent";
import { resetWebs3dSEOAgentForTests } from "./Webs3dSEOAgent";
import { resetWebs3dSocialAgentForTests } from "./Webs3dSocialAgent";

export function resetAllWebs3dAgentsForTests(): void {
  resetWebs3dPortfolioAgentForTests();
  resetWebs3dClientesAgentForTests();
  resetWebs3dPreciosAgentForTests();
  resetWebs3dSEOAgentForTests();
  resetWebs3dSocialAgentForTests();
  resetWebs3dEmailAgentForTests();
  resetWebs3dReviewsAgentForTests();
  resetWebs3dAnalyticsAgentForTests();
}
