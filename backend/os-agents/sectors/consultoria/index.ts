import { ConsultoriaAnalyticsAgent } from "./ConsultoriaAnalyticsAgent";
import { ConsultoriaAutorityAgent } from "./ConsultoriaAutorityAgent";
import { ConsultoriaEmailAgent } from "./ConsultoriaEmailAgent";
import { ConsultoriaLeadGenAgent } from "./ConsultoriaLeadGenAgent";
import { ConsultoriaPreciosAgent } from "./ConsultoriaPreciosAgent";
import { ConsultoriaReviewsAgent } from "./ConsultoriaReviewsAgent";
import { ConsultoriaSEOAgent } from "./ConsultoriaSEOAgent";
import { ConsultoriaSocialAgent } from "./ConsultoriaSocialAgent";

export type { ConsultoriaInput, ConsultoriaOutput } from "./shared";
export { consultoriaLlmOpts, parseConsultoriaLlmJson, buildConsultoriaPrompt } from "./shared";

export {
  ConsultoriaAutorityAgent,
  getConsultoriaAutorityAgent,
  resetConsultoriaAutorityAgentForTests,
} from "./ConsultoriaAutorityAgent";
export {
  ConsultoriaLeadGenAgent,
  getConsultoriaLeadGenAgent,
  resetConsultoriaLeadGenAgentForTests,
} from "./ConsultoriaLeadGenAgent";
export {
  ConsultoriaPreciosAgent,
  getConsultoriaPreciosAgent,
  resetConsultoriaPreciosAgentForTests,
} from "./ConsultoriaPreciosAgent";
export {
  ConsultoriaSEOAgent,
  getConsultoriaSEOAgent,
  resetConsultoriaSEOAgentForTests,
} from "./ConsultoriaSEOAgent";
export {
  ConsultoriaSocialAgent,
  getConsultoriaSocialAgent,
  resetConsultoriaSocialAgentForTests,
} from "./ConsultoriaSocialAgent";
export {
  ConsultoriaEmailAgent,
  getConsultoriaEmailAgent,
  resetConsultoriaEmailAgentForTests,
} from "./ConsultoriaEmailAgent";
export {
  ConsultoriaReviewsAgent,
  getConsultoriaReviewsAgent,
  resetConsultoriaReviewsAgentForTests,
} from "./ConsultoriaReviewsAgent";
export {
  ConsultoriaAnalyticsAgent,
  getConsultoriaAnalyticsAgent,
  resetConsultoriaAnalyticsAgentForTests,
} from "./ConsultoriaAnalyticsAgent";

export function resetAllConsultoriaAgentsForTests(): void {
  ConsultoriaAutorityAgent.reset();
  ConsultoriaLeadGenAgent.reset();
  ConsultoriaPreciosAgent.reset();
  ConsultoriaSEOAgent.reset();
  ConsultoriaSocialAgent.reset();
  ConsultoriaEmailAgent.reset();
  ConsultoriaReviewsAgent.reset();
  ConsultoriaAnalyticsAgent.reset();
}
