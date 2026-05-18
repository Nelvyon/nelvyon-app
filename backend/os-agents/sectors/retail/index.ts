import { RetailAnalyticsAgent } from "./RetailAnalyticsAgent";
import { RetailEmailSMSAgent } from "./RetailEmailSMSAgent";
import { RetailFidelizacionAgent } from "./RetailFidelizacionAgent";
import { RetailInventarioAgent } from "./RetailInventarioAgent";
import { RetailPreciosAgent } from "./RetailPreciosAgent";
import { RetailPresenciaAgent } from "./RetailPresenciaAgent";
import { RetailReviewsAgent } from "./RetailReviewsAgent";
import { RetailSocialAgent } from "./RetailSocialAgent";

export type { RetailInput, RetailOutput } from "./shared";
export { parseRetailLlmJson, buildRetailPrompt, llmOpts as retailLlmOpts } from "./shared";

export {
  RetailPresenciaAgent,
  getRetailPresenciaAgent,
  resetRetailPresenciaAgentForTests,
} from "./RetailPresenciaAgent";
export {
  RetailInventarioAgent,
  getRetailInventarioAgent,
  resetRetailInventarioAgentForTests,
} from "./RetailInventarioAgent";
export { RetailPreciosAgent, getRetailPreciosAgent, resetRetailPreciosAgentForTests } from "./RetailPreciosAgent";
export {
  RetailFidelizacionAgent,
  getRetailFidelizacionAgent,
  resetRetailFidelizacionAgentForTests,
} from "./RetailFidelizacionAgent";
export {
  RetailEmailSMSAgent,
  getRetailEmailSMSAgent,
  resetRetailEmailSMSAgentForTests,
} from "./RetailEmailSMSAgent";
export { RetailSocialAgent, getRetailSocialAgent, resetRetailSocialAgentForTests } from "./RetailSocialAgent";
export { RetailReviewsAgent, getRetailReviewsAgent, resetRetailReviewsAgentForTests } from "./RetailReviewsAgent";
export {
  RetailAnalyticsAgent,
  getRetailAnalyticsAgent,
  resetRetailAnalyticsAgentForTests,
} from "./RetailAnalyticsAgent";

export function resetAllRetailAgentsForTests(): void {
  RetailPresenciaAgent.reset();
  RetailInventarioAgent.reset();
  RetailPreciosAgent.reset();
  RetailFidelizacionAgent.reset();
  RetailEmailSMSAgent.reset();
  RetailSocialAgent.reset();
  RetailReviewsAgent.reset();
  RetailAnalyticsAgent.reset();
}
