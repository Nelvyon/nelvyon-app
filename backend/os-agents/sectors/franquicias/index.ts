import { FranquiciasAnalyticsAgent } from "./FranquiciasAnalyticsAgent";
import { FranquiciasEmailAgent } from "./FranquiciasEmailAgent";
import { FranquiciasExpansionAgent } from "./FranquiciasExpansionAgent";
import { FranquiciasMarketingLocalAgent } from "./FranquiciasMarketingLocalAgent";
import { FranquiciasPreciosAgent } from "./FranquiciasPreciosAgent";
import { FranquiciasReviewsAgent } from "./FranquiciasReviewsAgent";
import { FranquiciasSEOAgent } from "./FranquiciasSEOAgent";
import { FranquiciasSocialAgent } from "./FranquiciasSocialAgent";

export type { FranquiciasInput, FranquiciasOutput } from "./shared";
export { franquiciasLlmOpts, parseFranquiciasLlmJson, buildFranquiciasPrompt } from "./shared";

export {
  FranquiciasExpansionAgent,
  getFranquiciasExpansionAgent,
  resetFranquiciasExpansionAgentForTests,
} from "./FranquiciasExpansionAgent";
export {
  FranquiciasMarketingLocalAgent,
  getFranquiciasMarketingLocalAgent,
  resetFranquiciasMarketingLocalAgentForTests,
} from "./FranquiciasMarketingLocalAgent";
export {
  FranquiciasPreciosAgent,
  getFranquiciasPreciosAgent,
  resetFranquiciasPreciosAgentForTests,
} from "./FranquiciasPreciosAgent";
export {
  FranquiciasSEOAgent,
  getFranquiciasSEOAgent,
  resetFranquiciasSEOAgentForTests,
} from "./FranquiciasSEOAgent";
export {
  FranquiciasSocialAgent,
  getFranquiciasSocialAgent,
  resetFranquiciasSocialAgentForTests,
} from "./FranquiciasSocialAgent";
export {
  FranquiciasEmailAgent,
  getFranquiciasEmailAgent,
  resetFranquiciasEmailAgentForTests,
} from "./FranquiciasEmailAgent";
export {
  FranquiciasReviewsAgent,
  getFranquiciasReviewsAgent,
  resetFranquiciasReviewsAgentForTests,
} from "./FranquiciasReviewsAgent";
export {
  FranquiciasAnalyticsAgent,
  getFranquiciasAnalyticsAgent,
  resetFranquiciasAnalyticsAgentForTests,
} from "./FranquiciasAnalyticsAgent";

export function resetAllFranquiciasAgentsForTests(): void {
  FranquiciasExpansionAgent.reset();
  FranquiciasMarketingLocalAgent.reset();
  FranquiciasPreciosAgent.reset();
  FranquiciasSEOAgent.reset();
  FranquiciasSocialAgent.reset();
  FranquiciasEmailAgent.reset();
  FranquiciasReviewsAgent.reset();
  FranquiciasAnalyticsAgent.reset();
}
