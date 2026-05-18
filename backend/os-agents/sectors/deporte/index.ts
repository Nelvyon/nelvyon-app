export type { DeporteInput, DeporteOutput } from "./shared";
export {
  deporteLlmOpts as deporteLlmOpts,
  parseDeporteLlmJson,
  buildDeportePrompt,
  runDeporteAgentCore,
  getDefaultDeporteLlm,
} from "./shared";
export * from "./DeporteFansAgent";
export * from "./DeportePatrociniosAgent";
export * from "./DeportePreciosAgent";
export * from "./DeporteSEOAgent";
export * from "./DeporteSocialAgent";
export * from "./DeporteEmailAgent";
export * from "./DeporteReviewsAgent";
export * from "./DeporteAnalyticsAgent";

import { resetDeporteAnalyticsAgentForTests } from "./DeporteAnalyticsAgent";
import { resetDeporteEmailAgentForTests } from "./DeporteEmailAgent";
import { resetDeporteFansAgentForTests } from "./DeporteFansAgent";
import { resetDeportePatrociniosAgentForTests } from "./DeportePatrociniosAgent";
import { resetDeportePreciosAgentForTests } from "./DeportePreciosAgent";
import { resetDeporteReviewsAgentForTests } from "./DeporteReviewsAgent";
import { resetDeporteSEOAgentForTests } from "./DeporteSEOAgent";
import { resetDeporteSocialAgentForTests } from "./DeporteSocialAgent";

export function resetAllDeporteAgentsForTests(): void {
  resetDeporteFansAgentForTests();
  resetDeportePatrociniosAgentForTests();
  resetDeportePreciosAgentForTests();
  resetDeporteSEOAgentForTests();
  resetDeporteSocialAgentForTests();
  resetDeporteEmailAgentForTests();
  resetDeporteReviewsAgentForTests();
  resetDeporteAnalyticsAgentForTests();
}
