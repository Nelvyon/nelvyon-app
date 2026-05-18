export type { PodcastInput, PodcastOutput } from "./shared";
export {
  podcastLlmOpts as podcastLlmOpts,
  parsePodcastLlmJson,
  buildPodcastPrompt,
  runPodcastAgentCore,
  getDefaultPodcastLlm,
} from "./shared";
export * from "./PodcastGuionAgent";
export * from "./PodcastVozAgent";
export * from "./PodcastMusicaAgent";
export * from "./PodcastEdicionAgent";
export * from "./PodcastTranscripcionAgent";
export * from "./PodcastDistribucionAgent";
export * from "./PodcastAudiogramaAgent";
export * from "./PodcastAnalyticsAgent";

import { resetPodcastAnalyticsAgentForTests } from "./PodcastAnalyticsAgent";
import { resetPodcastAudiogramaAgentForTests } from "./PodcastAudiogramaAgent";
import { resetPodcastDistribucionAgentForTests } from "./PodcastDistribucionAgent";
import { resetPodcastEdicionAgentForTests } from "./PodcastEdicionAgent";
import { resetPodcastGuionAgentForTests } from "./PodcastGuionAgent";
import { resetPodcastMusicaAgentForTests } from "./PodcastMusicaAgent";
import { resetPodcastTranscripcionAgentForTests } from "./PodcastTranscripcionAgent";
import { resetPodcastVozAgentForTests } from "./PodcastVozAgent";

export function resetAllPodcastAgentsForTests(): void {
  resetPodcastGuionAgentForTests();
  resetPodcastVozAgentForTests();
  resetPodcastMusicaAgentForTests();
  resetPodcastEdicionAgentForTests();
  resetPodcastTranscripcionAgentForTests();
  resetPodcastDistribucionAgentForTests();
  resetPodcastAudiogramaAgentForTests();
  resetPodcastAnalyticsAgentForTests();
}
