export type { SocialvideoInput, SocialvideoOutput } from "./shared";
export {
  socialvideoLlmOpts as socialvideoLlmOpts,
  parseSocialvideoLlmJson,
  runSocialvideoAgentCore,
  getDefaultSocialvideoLlm,
} from "./shared";
export * from "./SocialvideoEstrategiaAgent";
export * from "./SocialvideoGuionesAgent";
export * from "./SocialvideoCalendarioAgent";
export * from "./SocialvideoTendenciasAgent";
export * from "./SocialvideoProduccionAgent";
export * from "./SocialvideoSubtitulosAgent";
export * from "./SocialvideoDistribucionAgent";
export * from "./SocialvideoAnalyticsAgent";

import { resetSocialvideoAnalyticsAgentForTests } from "./SocialvideoAnalyticsAgent";
import { resetSocialvideoCalendarioAgentForTests } from "./SocialvideoCalendarioAgent";
import { resetSocialvideoDistribucionAgentForTests } from "./SocialvideoDistribucionAgent";
import { resetSocialvideoEstrategiaAgentForTests } from "./SocialvideoEstrategiaAgent";
import { resetSocialvideoGuionesAgentForTests } from "./SocialvideoGuionesAgent";
import { resetSocialvideoProduccionAgentForTests } from "./SocialvideoProduccionAgent";
import { resetSocialvideoSubtitulosAgentForTests } from "./SocialvideoSubtitulosAgent";
import { resetSocialvideoTendenciasAgentForTests } from "./SocialvideoTendenciasAgent";

export function resetAllSocialvideoAgentsForTests(): void {
  resetSocialvideoEstrategiaAgentForTests();
  resetSocialvideoGuionesAgentForTests();
  resetSocialvideoCalendarioAgentForTests();
  resetSocialvideoTendenciasAgentForTests();
  resetSocialvideoProduccionAgentForTests();
  resetSocialvideoSubtitulosAgentForTests();
  resetSocialvideoDistribucionAgentForTests();
  resetSocialvideoAnalyticsAgentForTests();
}
