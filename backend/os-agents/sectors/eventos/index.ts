import { EventosAnalyticsAgent } from "./EventosAnalyticsAgent";
import { EventosClientesAgent } from "./EventosClientesAgent";
import { EventosEmailAgent } from "./EventosEmailAgent";
import { EventosPortfolioAgent } from "./EventosPortfolioAgent";
import { EventosPreciosAgent } from "./EventosPreciosAgent";
import { EventosReviewsAgent } from "./EventosReviewsAgent";
import { EventosSEOAgent } from "./EventosSEOAgent";
import { EventosSocialAgent } from "./EventosSocialAgent";

export type { EventosInput, EventosOutput } from "./shared";
export { eventosLlmOpts, parseEventosLlmJson, buildEventosPrompt } from "./shared";

export {
  EventosPortfolioAgent,
  getEventosPortfolioAgent,
  resetEventosPortfolioAgentForTests,
} from "./EventosPortfolioAgent";
export {
  EventosClientesAgent,
  getEventosClientesAgent,
  resetEventosClientesAgentForTests,
} from "./EventosClientesAgent";
export {
  EventosPreciosAgent,
  getEventosPreciosAgent,
  resetEventosPreciosAgentForTests,
} from "./EventosPreciosAgent";
export { EventosSEOAgent, getEventosSEOAgent, resetEventosSEOAgentForTests } from "./EventosSEOAgent";
export {
  EventosSocialAgent,
  getEventosSocialAgent,
  resetEventosSocialAgentForTests,
} from "./EventosSocialAgent";
export {
  EventosEmailAgent,
  getEventosEmailAgent,
  resetEventosEmailAgentForTests,
} from "./EventosEmailAgent";
export {
  EventosReviewsAgent,
  getEventosReviewsAgent,
  resetEventosReviewsAgentForTests,
} from "./EventosReviewsAgent";
export {
  EventosAnalyticsAgent,
  getEventosAnalyticsAgent,
  resetEventosAnalyticsAgentForTests,
} from "./EventosAnalyticsAgent";

export function resetAllEventosAgentsForTests(): void {
  EventosPortfolioAgent.reset();
  EventosClientesAgent.reset();
  EventosPreciosAgent.reset();
  EventosSEOAgent.reset();
  EventosSocialAgent.reset();
  EventosEmailAgent.reset();
  EventosReviewsAgent.reset();
  EventosAnalyticsAgent.reset();
}
