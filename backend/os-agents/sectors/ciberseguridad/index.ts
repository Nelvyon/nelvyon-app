import { CiberseguridadAnalyticsAgent } from "./CiberseguridadAnalyticsAgent";
import { CiberseguridadAuthorityAgent } from "./CiberseguridadAuthorityAgent";
import { CiberseguridadEmailAgent } from "./CiberseguridadEmailAgent";
import { CiberseguridadLeadGenAgent } from "./CiberseguridadLeadGenAgent";
import { CiberseguridadPreciosAgent } from "./CiberseguridadPreciosAgent";
import { CiberseguridadReviewsAgent } from "./CiberseguridadReviewsAgent";
import { CiberseguridadSEOAgent } from "./CiberseguridadSEOAgent";
import { CiberseguridadSocialAgent } from "./CiberseguridadSocialAgent";

export type { CiberseguridadInput, CiberseguridadOutput } from "./shared";
export { ciberseguridadLlmOpts, parseCiberseguridadLlmJson, buildCiberseguridadPrompt } from "./shared";

export {
  CiberseguridadAuthorityAgent,
  getCiberseguridadAuthorityAgent,
  resetCiberseguridadAuthorityAgentForTests,
} from "./CiberseguridadAuthorityAgent";
export {
  CiberseguridadLeadGenAgent,
  getCiberseguridadLeadGenAgent,
  resetCiberseguridadLeadGenAgentForTests,
} from "./CiberseguridadLeadGenAgent";
export {
  CiberseguridadPreciosAgent,
  getCiberseguridadPreciosAgent,
  resetCiberseguridadPreciosAgentForTests,
} from "./CiberseguridadPreciosAgent";
export {
  CiberseguridadSEOAgent,
  getCiberseguridadSEOAgent,
  resetCiberseguridadSEOAgentForTests,
} from "./CiberseguridadSEOAgent";
export {
  CiberseguridadSocialAgent,
  getCiberseguridadSocialAgent,
  resetCiberseguridadSocialAgentForTests,
} from "./CiberseguridadSocialAgent";
export {
  CiberseguridadEmailAgent,
  getCiberseguridadEmailAgent,
  resetCiberseguridadEmailAgentForTests,
} from "./CiberseguridadEmailAgent";
export {
  CiberseguridadReviewsAgent,
  getCiberseguridadReviewsAgent,
  resetCiberseguridadReviewsAgentForTests,
} from "./CiberseguridadReviewsAgent";
export {
  CiberseguridadAnalyticsAgent,
  getCiberseguridadAnalyticsAgent,
  resetCiberseguridadAnalyticsAgentForTests,
} from "./CiberseguridadAnalyticsAgent";

export function resetAllCiberseguridadAgentsForTests(): void {
  CiberseguridadAuthorityAgent.reset();
  CiberseguridadLeadGenAgent.reset();
  CiberseguridadPreciosAgent.reset();
  CiberseguridadSEOAgent.reset();
  CiberseguridadSocialAgent.reset();
  CiberseguridadEmailAgent.reset();
  CiberseguridadReviewsAgent.reset();
  CiberseguridadAnalyticsAgent.reset();
}
