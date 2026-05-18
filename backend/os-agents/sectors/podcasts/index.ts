export type { PodcastsInput, PodcastsOutput } from "./shared";
export {
  podcastsLlmOpts as podcastsLlmOpts,
  parsePodcastsLlmJson,
  buildPodcastsPrompt,
  runPodcastsAgentCore,
  getDefaultPodcastsLlm,
} from "./shared";
export * from "./PodcastsAudienciaAgent";
export * from "./PodcastsMonetizacionAgent";
export * from "./PodcastsPreciosAgent";
export * from "./PodcastsSEOAgent";
export * from "./PodcastsSocialAgent";
export * from "./PodcastsEmailAgent";
export * from "./PodcastsReviewsAgent";
export * from "./PodcastsAnalyticsAgent";

import { resetPodcastsAnalyticsAgentForTests } from "./PodcastsAnalyticsAgent";
import { resetPodcastsAudienciaAgentForTests } from "./PodcastsAudienciaAgent";
import { resetPodcastsEmailAgentForTests } from "./PodcastsEmailAgent";
import { resetPodcastsMonetizacionAgentForTests } from "./PodcastsMonetizacionAgent";
import { resetPodcastsPreciosAgentForTests } from "./PodcastsPreciosAgent";
import { resetPodcastsReviewsAgentForTests } from "./PodcastsReviewsAgent";
import { resetPodcastsSEOAgentForTests } from "./PodcastsSEOAgent";
import { resetPodcastsSocialAgentForTests } from "./PodcastsSocialAgent";

export function resetAllPodcastsAgentsForTests(): void {
  resetPodcastsAudienciaAgentForTests();
  resetPodcastsMonetizacionAgentForTests();
  resetPodcastsPreciosAgentForTests();
  resetPodcastsSEOAgentForTests();
  resetPodcastsSocialAgentForTests();
  resetPodcastsEmailAgentForTests();
  resetPodcastsReviewsAgentForTests();
  resetPodcastsAnalyticsAgentForTests();
}
