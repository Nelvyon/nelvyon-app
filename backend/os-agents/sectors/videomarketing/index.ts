export type { VideoMarketingInput, VideoMarketingOutput } from "./shared";
export {
  videoMarketingLlmOpts as videoMarketingLlmOpts,
  parseVideoMarketingLlmJson,
  buildVideoMarketingPrompt,
  runVideoMarketingAgentCore,
  getDefaultVideoMarketingLlm,
} from "./shared";
export * from "./VideoMarketingGuionAgent";
export * from "./VideoMarketingGeneracionAgent";
export * from "./VideoMarketingPresentadorAgent";
export * from "./VideoMarketingVozAgent";
export * from "./VideoMarketingMusicaAgent";
export * from "./VideoMarketingFormatsAgent";
export * from "./VideoMarketingThumbnailAgent";
export * from "./VideoMarketingDistribucionAgent";

import { resetVideoMarketingDistribucionAgentForTests } from "./VideoMarketingDistribucionAgent";
import { resetVideoMarketingFormatsAgentForTests } from "./VideoMarketingFormatsAgent";
import { resetVideoMarketingGeneracionAgentForTests } from "./VideoMarketingGeneracionAgent";
import { resetVideoMarketingGuionAgentForTests } from "./VideoMarketingGuionAgent";
import { resetVideoMarketingMusicaAgentForTests } from "./VideoMarketingMusicaAgent";
import { resetVideoMarketingPresentadorAgentForTests } from "./VideoMarketingPresentadorAgent";
import { resetVideoMarketingThumbnailAgentForTests } from "./VideoMarketingThumbnailAgent";
import { resetVideoMarketingVozAgentForTests } from "./VideoMarketingVozAgent";

export function resetAllVideoMarketingAgentsForTests(): void {
  resetVideoMarketingGuionAgentForTests();
  resetVideoMarketingGeneracionAgentForTests();
  resetVideoMarketingPresentadorAgentForTests();
  resetVideoMarketingVozAgentForTests();
  resetVideoMarketingMusicaAgentForTests();
  resetVideoMarketingFormatsAgentForTests();
  resetVideoMarketingThumbnailAgentForTests();
  resetVideoMarketingDistribucionAgentForTests();
}
