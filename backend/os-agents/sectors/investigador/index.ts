export type { InvestigadorInput, InvestigadorOutput } from "./shared";
export {
  investigadorLlmOpts as investigadorLlmOpts,
  parseInvestigadorLlmJson,
  buildInvestigadorPrompt,
  runInvestigadorAgentCore,
  getDefaultInvestigadorLlm,
} from "./shared";
export * from "./InvestigadorCompetidoresAgent";
export * from "./InvestigadorTendenciasAgent";
export * from "./InvestigadorAudienciaAgent";
export * from "./InvestigadorOportunidadesAgent";
export * from "./InvestigadorKeywordsAgent";
export * from "./InvestigadorPreciosAgent";
export * from "./InvestigadorReportesAgent";
export * from "./InvestigadorSectorialAgent";

import { resetInvestigadorAudienciaAgentForTests } from "./InvestigadorAudienciaAgent";
import { resetInvestigadorCompetidoresAgentForTests } from "./InvestigadorCompetidoresAgent";
import { resetInvestigadorKeywordsAgentForTests } from "./InvestigadorKeywordsAgent";
import { resetInvestigadorOportunidadesAgentForTests } from "./InvestigadorOportunidadesAgent";
import { resetInvestigadorPreciosAgentForTests } from "./InvestigadorPreciosAgent";
import { resetInvestigadorReportesAgentForTests } from "./InvestigadorReportesAgent";
import { resetInvestigadorSectorialAgentForTests } from "./InvestigadorSectorialAgent";
import { resetInvestigadorTendenciasAgentForTests } from "./InvestigadorTendenciasAgent";

export function resetAllInvestigadorAgentsForTests(): void {
  resetInvestigadorCompetidoresAgentForTests();
  resetInvestigadorTendenciasAgentForTests();
  resetInvestigadorAudienciaAgentForTests();
  resetInvestigadorOportunidadesAgentForTests();
  resetInvestigadorKeywordsAgentForTests();
  resetInvestigadorPreciosAgentForTests();
  resetInvestigadorReportesAgentForTests();
  resetInvestigadorSectorialAgentForTests();
}
