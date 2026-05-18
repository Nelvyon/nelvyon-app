export type { CopywritingInput, CopywritingOutput } from "./shared";
export {
  copywritingLlmOpts as copywritingLlmOpts,
  parseCopywritingLlmJson,
  buildCopywritingPrompt,
  runCopywritingAgentCore,
  getDefaultCopywritingLlm,
} from "./shared";
export * from "./CopywritingVentasAgent";
export * from "./CopywritingHeadlinesAgent";
export * from "./CopywritingEmailsAgent";
export * from "./CopywritingLandingAgent";
export * from "./CopywritingAdsAgent";
export * from "./CopywritingGuionesAgent";
export * from "./CopywritingSeoAgent";
export * from "./CopywritingStorytellingAgent";

import { resetCopywritingAdsAgentForTests } from "./CopywritingAdsAgent";
import { resetCopywritingEmailsAgentForTests } from "./CopywritingEmailsAgent";
import { resetCopywritingGuionesAgentForTests } from "./CopywritingGuionesAgent";
import { resetCopywritingHeadlinesAgentForTests } from "./CopywritingHeadlinesAgent";
import { resetCopywritingLandingAgentForTests } from "./CopywritingLandingAgent";
import { resetCopywritingSeoAgentForTests } from "./CopywritingSeoAgent";
import { resetCopywritingStorytellingAgentForTests } from "./CopywritingStorytellingAgent";
import { resetCopywritingVentasAgentForTests } from "./CopywritingVentasAgent";

export function resetAllCopywritingAgentsForTests(): void {
  resetCopywritingVentasAgentForTests();
  resetCopywritingHeadlinesAgentForTests();
  resetCopywritingEmailsAgentForTests();
  resetCopywritingLandingAgentForTests();
  resetCopywritingAdsAgentForTests();
  resetCopywritingGuionesAgentForTests();
  resetCopywritingSeoAgentForTests();
  resetCopywritingStorytellingAgentForTests();
}
