import { AnimacionAnalyticsAgent } from "./AnimacionAnalyticsAgent";
import { AnimacionClientesAgent } from "./AnimacionClientesAgent";
import { AnimacionEmailAgent } from "./AnimacionEmailAgent";
import { AnimacionPortfolioAgent } from "./AnimacionPortfolioAgent";
import { AnimacionPreciosAgent } from "./AnimacionPreciosAgent";
import { AnimacionReviewsAgent } from "./AnimacionReviewsAgent";
import { AnimacionSEOAgent } from "./AnimacionSEOAgent";
import { AnimacionSocialAgent } from "./AnimacionSocialAgent";

export type { AnimacionInput, AnimacionOutput } from "./shared";
export { animacionLlmOpts, parseAnimacionLlmJson, buildAnimacionPrompt } from "./shared";

export {
  AnimacionPortfolioAgent,
  getAnimacionPortfolioAgent,
  resetAnimacionPortfolioAgentForTests,
} from "./AnimacionPortfolioAgent";
export {
  AnimacionClientesAgent,
  getAnimacionClientesAgent,
  resetAnimacionClientesAgentForTests,
} from "./AnimacionClientesAgent";
export {
  AnimacionPreciosAgent,
  getAnimacionPreciosAgent,
  resetAnimacionPreciosAgentForTests,
} from "./AnimacionPreciosAgent";
export { AnimacionSEOAgent, getAnimacionSEOAgent, resetAnimacionSEOAgentForTests } from "./AnimacionSEOAgent";
export {
  AnimacionSocialAgent,
  getAnimacionSocialAgent,
  resetAnimacionSocialAgentForTests,
} from "./AnimacionSocialAgent";
export {
  AnimacionEmailAgent,
  getAnimacionEmailAgent,
  resetAnimacionEmailAgentForTests,
} from "./AnimacionEmailAgent";
export {
  AnimacionReviewsAgent,
  getAnimacionReviewsAgent,
  resetAnimacionReviewsAgentForTests,
} from "./AnimacionReviewsAgent";
export {
  AnimacionAnalyticsAgent,
  getAnimacionAnalyticsAgent,
  resetAnimacionAnalyticsAgentForTests,
} from "./AnimacionAnalyticsAgent";

export function resetAllAnimacionAgentsForTests(): void {
  AnimacionPortfolioAgent.reset();
  AnimacionClientesAgent.reset();
  AnimacionPreciosAgent.reset();
  AnimacionSEOAgent.reset();
  AnimacionSocialAgent.reset();
  AnimacionEmailAgent.reset();
  AnimacionReviewsAgent.reset();
  AnimacionAnalyticsAgent.reset();
}
