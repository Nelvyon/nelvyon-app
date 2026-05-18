import { AudiovisualAnalyticsAgent } from "./AudiovisualAnalyticsAgent";
import { AudiovisualClientesAgent } from "./AudiovisualClientesAgent";
import { AudiovisualEmailAgent } from "./AudiovisualEmailAgent";
import { AudiovisualPortfolioAgent } from "./AudiovisualPortfolioAgent";
import { AudiovisualPreciosAgent } from "./AudiovisualPreciosAgent";
import { AudiovisualReviewsAgent } from "./AudiovisualReviewsAgent";
import { AudiovisualSEOAgent } from "./AudiovisualSEOAgent";
import { AudiovisualSocialAgent } from "./AudiovisualSocialAgent";

export type { AudiovisualInput, AudiovisualOutput } from "./shared";
export { audiovisualLlmOpts, parseAudiovisualLlmJson, buildAudiovisualPrompt } from "./shared";

export {
  AudiovisualPortfolioAgent,
  getAudiovisualPortfolioAgent,
  resetAudiovisualPortfolioAgentForTests,
} from "./AudiovisualPortfolioAgent";
export {
  AudiovisualClientesAgent,
  getAudiovisualClientesAgent,
  resetAudiovisualClientesAgentForTests,
} from "./AudiovisualClientesAgent";
export {
  AudiovisualPreciosAgent,
  getAudiovisualPreciosAgent,
  resetAudiovisualPreciosAgentForTests,
} from "./AudiovisualPreciosAgent";
export { AudiovisualSEOAgent, getAudiovisualSEOAgent, resetAudiovisualSEOAgentForTests } from "./AudiovisualSEOAgent";
export {
  AudiovisualSocialAgent,
  getAudiovisualSocialAgent,
  resetAudiovisualSocialAgentForTests,
} from "./AudiovisualSocialAgent";
export {
  AudiovisualEmailAgent,
  getAudiovisualEmailAgent,
  resetAudiovisualEmailAgentForTests,
} from "./AudiovisualEmailAgent";
export {
  AudiovisualReviewsAgent,
  getAudiovisualReviewsAgent,
  resetAudiovisualReviewsAgentForTests,
} from "./AudiovisualReviewsAgent";
export {
  AudiovisualAnalyticsAgent,
  getAudiovisualAnalyticsAgent,
  resetAudiovisualAnalyticsAgentForTests,
} from "./AudiovisualAnalyticsAgent";

export function resetAllAudiovisualAgentsForTests(): void {
  AudiovisualPortfolioAgent.reset();
  AudiovisualClientesAgent.reset();
  AudiovisualPreciosAgent.reset();
  AudiovisualSEOAgent.reset();
  AudiovisualSocialAgent.reset();
  AudiovisualEmailAgent.reset();
  AudiovisualReviewsAgent.reset();
  AudiovisualAnalyticsAgent.reset();
}
