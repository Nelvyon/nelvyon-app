export type { TransporteInput, TransporteOutput } from "./shared";
export {
  transporteLlmOpts as transporteLlmOpts,
  parseTransporteLlmJson,
  buildTransportePrompt,
  runTransporteAgentCore,
  getDefaultTransporteLlm,
} from "./shared";
export * from "./TransporteClientesAgent";
export * from "./TransporteFlotaAgent";
export * from "./TransportePreciosAgent";
export * from "./TransporteSEOAgent";
export * from "./TransporteSocialAgent";
export * from "./TransporteEmailAgent";
export * from "./TransporteReviewsAgent";
export * from "./TransporteAnalyticsAgent";

import { resetTransporteAnalyticsAgentForTests } from "./TransporteAnalyticsAgent";
import { resetTransporteClientesAgentForTests } from "./TransporteClientesAgent";
import { resetTransporteEmailAgentForTests } from "./TransporteEmailAgent";
import { resetTransporteFlotaAgentForTests } from "./TransporteFlotaAgent";
import { resetTransportePreciosAgentForTests } from "./TransportePreciosAgent";
import { resetTransporteReviewsAgentForTests } from "./TransporteReviewsAgent";
import { resetTransporteSEOAgentForTests } from "./TransporteSEOAgent";
import { resetTransporteSocialAgentForTests } from "./TransporteSocialAgent";

export function resetAllTransporteAgentsForTests(): void {
  resetTransporteClientesAgentForTests();
  resetTransporteFlotaAgentForTests();
  resetTransportePreciosAgentForTests();
  resetTransporteSEOAgentForTests();
  resetTransporteSocialAgentForTests();
  resetTransporteEmailAgentForTests();
  resetTransporteReviewsAgentForTests();
  resetTransporteAnalyticsAgentForTests();
}
