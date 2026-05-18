export type { ArquitecturaInput, ArquitecturaOutput } from "./shared";
export {
  arquitecturaLlmOpts as arquitecturaLlmOpts,
  parseArquitecturaLlmJson,
  buildArquitecturaPrompt,
  runArquitecturaAgentCore,
  getDefaultArquitecturaLlm,
} from "./shared";
export * from "./ArquitecturaPortfolioAgent";
export * from "./ArquitecturaClientesAgent";
export * from "./ArquitecturaPreciosAgent";
export * from "./ArquitecturaSEOAgent";
export * from "./ArquitecturaSocialAgent";
export * from "./ArquitecturaEmailAgent";
export * from "./ArquitecturaReviewsAgent";
export * from "./ArquitecturaAnalyticsAgent";

import { resetArquitecturaAnalyticsAgentForTests } from "./ArquitecturaAnalyticsAgent";
import { resetArquitecturaClientesAgentForTests } from "./ArquitecturaClientesAgent";
import { resetArquitecturaEmailAgentForTests } from "./ArquitecturaEmailAgent";
import { resetArquitecturaPortfolioAgentForTests } from "./ArquitecturaPortfolioAgent";
import { resetArquitecturaPreciosAgentForTests } from "./ArquitecturaPreciosAgent";
import { resetArquitecturaReviewsAgentForTests } from "./ArquitecturaReviewsAgent";
import { resetArquitecturaSEOAgentForTests } from "./ArquitecturaSEOAgent";
import { resetArquitecturaSocialAgentForTests } from "./ArquitecturaSocialAgent";

export function resetAllArquitecturaAgentsForTests(): void {
  resetArquitecturaPortfolioAgentForTests();
  resetArquitecturaClientesAgentForTests();
  resetArquitecturaPreciosAgentForTests();
  resetArquitecturaSEOAgentForTests();
  resetArquitecturaSocialAgentForTests();
  resetArquitecturaEmailAgentForTests();
  resetArquitecturaReviewsAgentForTests();
  resetArquitecturaAnalyticsAgentForTests();
}
