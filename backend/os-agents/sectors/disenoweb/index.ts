import { DisenoWebAnalyticsAgent } from "./DisenoWebAnalyticsAgent";
import { DisenoWebAuditAgent } from "./DisenoWebAuditAgent";
import { DisenoWebConversionAgent } from "./DisenoWebConversionAgent";
import { DisenoWebCopyAgent } from "./DisenoWebCopyAgent";
import { DisenoWebGeneratorAgent } from "./DisenoWebGeneratorAgent";
import { DisenoWebMaintenanceAgent } from "./DisenoWebMaintenanceAgent";
import { DisenoWebResponsiveAgent } from "./DisenoWebResponsiveAgent";
import { DisenoWebSEOAgent } from "./DisenoWebSEOAgent";

export type { DisenoWebInput, DisenoWebOutput } from "./shared";
export { parseDisenoWebLlmJson, buildDisenoWebPrompt, llmOpts as disenowebLlmOpts } from "./shared";

export {
  DisenoWebAuditAgent,
  getDisenoWebAuditAgent,
  resetDisenoWebAuditAgentForTests,
} from "./DisenoWebAuditAgent";
export {
  DisenoWebGeneratorAgent,
  getDisenoWebGeneratorAgent,
  resetDisenoWebGeneratorAgentForTests,
} from "./DisenoWebGeneratorAgent";
export { DisenoWebSEOAgent, getDisenoWebSEOAgent, resetDisenoWebSEOAgentForTests } from "./DisenoWebSEOAgent";
export { DisenoWebCopyAgent, getDisenoWebCopyAgent, resetDisenoWebCopyAgentForTests } from "./DisenoWebCopyAgent";
export {
  DisenoWebConversionAgent,
  getDisenoWebConversionAgent,
  resetDisenoWebConversionAgentForTests,
} from "./DisenoWebConversionAgent";
export {
  DisenoWebResponsiveAgent,
  getDisenoWebResponsiveAgent,
  resetDisenoWebResponsiveAgentForTests,
} from "./DisenoWebResponsiveAgent";
export {
  DisenoWebAnalyticsAgent,
  getDisenoWebAnalyticsAgent,
  resetDisenoWebAnalyticsAgentForTests,
} from "./DisenoWebAnalyticsAgent";
export {
  DisenoWebMaintenanceAgent,
  getDisenoWebMaintenanceAgent,
  resetDisenoWebMaintenanceAgentForTests,
} from "./DisenoWebMaintenanceAgent";

export function resetAllDisenoWebAgentsForTests(): void {
  DisenoWebAuditAgent.reset();
  DisenoWebGeneratorAgent.reset();
  DisenoWebSEOAgent.reset();
  DisenoWebCopyAgent.reset();
  DisenoWebConversionAgent.reset();
  DisenoWebResponsiveAgent.reset();
  DisenoWebAnalyticsAgent.reset();
  DisenoWebMaintenanceAgent.reset();
}
