export type { FintechInput, FintechOutput } from "./shared";
export {
  fintechLlmOpts as fintechLlmOpts,
  parseFintechLlmJson,
  buildFintechPrompt,
  runFintechAgentCore,
  getDefaultFintechLlm,
} from "./shared";
export * from "./FintechAdquisicionAgent";
export * from "./FintechActivacionAgent";
export * from "./FintechPreciosAgent";
export * from "./FintechSEOAgent";
export * from "./FintechSocialAgent";
export * from "./FintechEmailAgent";
export * from "./FintechReviewsAgent";
export * from "./FintechAnalyticsAgent";

import { resetFintechActivacionAgentForTests } from "./FintechActivacionAgent";
import { resetFintechAdquisicionAgentForTests } from "./FintechAdquisicionAgent";
import { resetFintechAnalyticsAgentForTests } from "./FintechAnalyticsAgent";
import { resetFintechEmailAgentForTests } from "./FintechEmailAgent";
import { resetFintechPreciosAgentForTests } from "./FintechPreciosAgent";
import { resetFintechReviewsAgentForTests } from "./FintechReviewsAgent";
import { resetFintechSEOAgentForTests } from "./FintechSEOAgent";
import { resetFintechSocialAgentForTests } from "./FintechSocialAgent";

export function resetAllFintechAgentsForTests(): void {
  resetFintechAdquisicionAgentForTests();
  resetFintechActivacionAgentForTests();
  resetFintechPreciosAgentForTests();
  resetFintechSEOAgentForTests();
  resetFintechSocialAgentForTests();
  resetFintechEmailAgentForTests();
  resetFintechReviewsAgentForTests();
  resetFintechAnalyticsAgentForTests();
}
