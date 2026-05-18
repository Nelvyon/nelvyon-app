import { EsteticaAnalyticsAgent } from "./EsteticaAnalyticsAgent";
import { EsteticaClientesAgent } from "./EsteticaClientesAgent";
import { EsteticaEmailAgent } from "./EsteticaEmailAgent";
import { EsteticaPreciosAgent } from "./EsteticaPreciosAgent";
import { EsteticaReservasAgent } from "./EsteticaReservasAgent";
import { EsteticaReviewsAgent } from "./EsteticaReviewsAgent";
import { EsteticaSEOAgent } from "./EsteticaSEOAgent";
import { EsteticaSocialAgent } from "./EsteticaSocialAgent";

export type { EsteticaInput, EsteticaOutput } from "./shared";
export { esteticaLlmOpts, parseEsteticaLlmJson, buildEsteticaPrompt } from "./shared";

export {
  EsteticaReservasAgent,
  getEsteticaReservasAgent,
  resetEsteticaReservasAgentForTests,
} from "./EsteticaReservasAgent";
export {
  EsteticaClientesAgent,
  getEsteticaClientesAgent,
  resetEsteticaClientesAgentForTests,
} from "./EsteticaClientesAgent";
export {
  EsteticaPreciosAgent,
  getEsteticaPreciosAgent,
  resetEsteticaPreciosAgentForTests,
} from "./EsteticaPreciosAgent";
export { EsteticaSEOAgent, getEsteticaSEOAgent, resetEsteticaSEOAgentForTests } from "./EsteticaSEOAgent";
export {
  EsteticaSocialAgent,
  getEsteticaSocialAgent,
  resetEsteticaSocialAgentForTests,
} from "./EsteticaSocialAgent";
export {
  EsteticaEmailAgent,
  getEsteticaEmailAgent,
  resetEsteticaEmailAgentForTests,
} from "./EsteticaEmailAgent";
export {
  EsteticaReviewsAgent,
  getEsteticaReviewsAgent,
  resetEsteticaReviewsAgentForTests,
} from "./EsteticaReviewsAgent";
export {
  EsteticaAnalyticsAgent,
  getEsteticaAnalyticsAgent,
  resetEsteticaAnalyticsAgentForTests,
} from "./EsteticaAnalyticsAgent";

export function resetAllEsteticaAgentsForTests(): void {
  EsteticaReservasAgent.reset();
  EsteticaClientesAgent.reset();
  EsteticaPreciosAgent.reset();
  EsteticaSEOAgent.reset();
  EsteticaSocialAgent.reset();
  EsteticaEmailAgent.reset();
  EsteticaReviewsAgent.reset();
  EsteticaAnalyticsAgent.reset();
}
