import { TelecomAdquisicionAgent } from "./TelecomAdquisicionAgent";
import { TelecomAnalyticsAgent } from "./TelecomAnalyticsAgent";
import { TelecomEmailAgent } from "./TelecomEmailAgent";
import { TelecomPreciosAgent } from "./TelecomPreciosAgent";
import { TelecomRetencionAgent } from "./TelecomRetencionAgent";
import { TelecomReviewsAgent } from "./TelecomReviewsAgent";
import { TelecomSEOAgent } from "./TelecomSEOAgent";
import { TelecomSocialAgent } from "./TelecomSocialAgent";

export type { TelecomunicacionesInput, TelecomunicacionesOutput } from "./shared";
export { telecomunicacionesLlmOpts, parseTelecomunicacionesLlmJson, buildTelecomunicacionesPrompt } from "./shared";

export {
  TelecomAdquisicionAgent,
  getTelecomAdquisicionAgent,
  resetTelecomAdquisicionAgentForTests,
} from "./TelecomAdquisicionAgent";
export {
  TelecomRetencionAgent,
  getTelecomRetencionAgent,
  resetTelecomRetencionAgentForTests,
} from "./TelecomRetencionAgent";
export { TelecomPreciosAgent, getTelecomPreciosAgent, resetTelecomPreciosAgentForTests } from "./TelecomPreciosAgent";
export { TelecomSEOAgent, getTelecomSEOAgent, resetTelecomSEOAgentForTests } from "./TelecomSEOAgent";
export { TelecomSocialAgent, getTelecomSocialAgent, resetTelecomSocialAgentForTests } from "./TelecomSocialAgent";
export { TelecomEmailAgent, getTelecomEmailAgent, resetTelecomEmailAgentForTests } from "./TelecomEmailAgent";
export { TelecomReviewsAgent, getTelecomReviewsAgent, resetTelecomReviewsAgentForTests } from "./TelecomReviewsAgent";
export {
  TelecomAnalyticsAgent,
  getTelecomAnalyticsAgent,
  resetTelecomAnalyticsAgentForTests,
} from "./TelecomAnalyticsAgent";

export function resetAllTelecomunicacionesAgentsForTests(): void {
  TelecomAdquisicionAgent.reset();
  TelecomRetencionAgent.reset();
  TelecomPreciosAgent.reset();
  TelecomSEOAgent.reset();
  TelecomSocialAgent.reset();
  TelecomEmailAgent.reset();
  TelecomReviewsAgent.reset();
  TelecomAnalyticsAgent.reset();
}
