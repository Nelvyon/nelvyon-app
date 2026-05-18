export type { FotografiaInput, FotografiaOutput } from "./shared";
export {
  fotografiaLlmOpts as fotografiaLlmOpts,
  parseFotografiaLlmJson,
  buildFotografiaPrompt,
  runFotografiaAgentCore,
  getDefaultFotografiaLlm,
} from "./shared";
export * from "./FotografiaPortfolioAgent";
export * from "./FotografiaClientesAgent";
export * from "./FotografiaPreciosAgent";
export * from "./FotografiaSEOAgent";
export * from "./FotografiaSocialAgent";
export * from "./FotografiaEmailAgent";
export * from "./FotografiaReviewsAgent";
export * from "./FotografiaAnalyticsAgent";

import { resetFotografiaAnalyticsAgentForTests } from "./FotografiaAnalyticsAgent";
import { resetFotografiaClientesAgentForTests } from "./FotografiaClientesAgent";
import { resetFotografiaEmailAgentForTests } from "./FotografiaEmailAgent";
import { resetFotografiaPortfolioAgentForTests } from "./FotografiaPortfolioAgent";
import { resetFotografiaPreciosAgentForTests } from "./FotografiaPreciosAgent";
import { resetFotografiaReviewsAgentForTests } from "./FotografiaReviewsAgent";
import { resetFotografiaSEOAgentForTests } from "./FotografiaSEOAgent";
import { resetFotografiaSocialAgentForTests } from "./FotografiaSocialAgent";

export function resetAllFotografiaAgentsForTests(): void {
  resetFotografiaPortfolioAgentForTests();
  resetFotografiaClientesAgentForTests();
  resetFotografiaPreciosAgentForTests();
  resetFotografiaSEOAgentForTests();
  resetFotografiaSocialAgentForTests();
  resetFotografiaEmailAgentForTests();
  resetFotografiaReviewsAgentForTests();
  resetFotografiaAnalyticsAgentForTests();
}
