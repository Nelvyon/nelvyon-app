export type { GobiernoInput, GobiernoOutput } from "./shared";
export {
  gobiernoLlmOpts as gobiernoLlmOpts,
  parseGobiernoLlmJson,
  buildGobiernoPrompt,
  runGobiernoAgentCore,
  getDefaultGobiernoLlm,
} from "./shared";
export * from "./GobiernoComunicacionAgent";
export * from "./GobiernoParticipacionAgent";
export * from "./GobiernoContenidoAgent";
export * from "./GobiernoSEOAgent";
export * from "./GobiernoSocialAgent";
export * from "./GobiernoEmailAgent";
export * from "./GobiernoReviewsAgent";
export * from "./GobiernoAnalyticsAgent";

import { resetGobiernoAnalyticsAgentForTests } from "./GobiernoAnalyticsAgent";
import { resetGobiernoComunicacionAgentForTests } from "./GobiernoComunicacionAgent";
import { resetGobiernoContenidoAgentForTests } from "./GobiernoContenidoAgent";
import { resetGobiernoEmailAgentForTests } from "./GobiernoEmailAgent";
import { resetGobiernoParticipacionAgentForTests } from "./GobiernoParticipacionAgent";
import { resetGobiernoReviewsAgentForTests } from "./GobiernoReviewsAgent";
import { resetGobiernoSEOAgentForTests } from "./GobiernoSEOAgent";
import { resetGobiernoSocialAgentForTests } from "./GobiernoSocialAgent";

export function resetAllGobiernoAgentsForTests(): void {
  resetGobiernoComunicacionAgentForTests();
  resetGobiernoParticipacionAgentForTests();
  resetGobiernoContenidoAgentForTests();
  resetGobiernoSEOAgentForTests();
  resetGobiernoSocialAgentForTests();
  resetGobiernoEmailAgentForTests();
  resetGobiernoReviewsAgentForTests();
  resetGobiernoAnalyticsAgentForTests();
}
