import { TechnicalSeoAuditCoreWebVitalsAgent } from "./TechnicalSeoAuditCoreWebVitalsAgent";
import { TechnicalSeoAuditCrawlerAgent } from "./TechnicalSeoAuditCrawlerAgent";
import { TechnicalSeoAuditIndexabilityAgent } from "./TechnicalSeoAuditIndexabilityAgent";
import { TechnicalSeoAuditInternationalAgent } from "./TechnicalSeoAuditInternationalAgent";
import { TechnicalSeoAuditMobileAgent } from "./TechnicalSeoAuditMobileAgent";
import { TechnicalSeoAuditReportAgent } from "./TechnicalSeoAuditReportAgent";
import { TechnicalSeoAuditSecurityAgent } from "./TechnicalSeoAuditSecurityAgent";
import { TechnicalSeoAuditStructuredDataAgent } from "./TechnicalSeoAuditStructuredDataAgent";

export type { TechnicalSeoAuditInput, TechnicalSeoAuditOutput } from "./shared";
export {
  parseTechnicalSeoAuditLlmJson,
  buildTechnicalSeoAuditPrompt,
  llmOpts as technicalseoauditLlmOpts,
} from "./shared";

export {
  TechnicalSeoAuditCrawlerAgent,
  getTechnicalSeoAuditCrawlerAgent,
  resetTechnicalSeoAuditCrawlerAgentForTests,
} from "./TechnicalSeoAuditCrawlerAgent";
export {
  TechnicalSeoAuditCoreWebVitalsAgent,
  getTechnicalSeoAuditCoreWebVitalsAgent,
  resetTechnicalSeoAuditCoreWebVitalsAgentForTests,
} from "./TechnicalSeoAuditCoreWebVitalsAgent";
export {
  TechnicalSeoAuditIndexabilityAgent,
  getTechnicalSeoAuditIndexabilityAgent,
  resetTechnicalSeoAuditIndexabilityAgentForTests,
} from "./TechnicalSeoAuditIndexabilityAgent";
export {
  TechnicalSeoAuditStructuredDataAgent,
  getTechnicalSeoAuditStructuredDataAgent,
  resetTechnicalSeoAuditStructuredDataAgentForTests,
} from "./TechnicalSeoAuditStructuredDataAgent";
export {
  TechnicalSeoAuditSecurityAgent,
  getTechnicalSeoAuditSecurityAgent,
  resetTechnicalSeoAuditSecurityAgentForTests,
} from "./TechnicalSeoAuditSecurityAgent";
export {
  TechnicalSeoAuditMobileAgent,
  getTechnicalSeoAuditMobileAgent,
  resetTechnicalSeoAuditMobileAgentForTests,
} from "./TechnicalSeoAuditMobileAgent";
export {
  TechnicalSeoAuditInternationalAgent,
  getTechnicalSeoAuditInternationalAgent,
  resetTechnicalSeoAuditInternationalAgentForTests,
} from "./TechnicalSeoAuditInternationalAgent";
export {
  TechnicalSeoAuditReportAgent,
  getTechnicalSeoAuditReportAgent,
  resetTechnicalSeoAuditReportAgentForTests,
} from "./TechnicalSeoAuditReportAgent";

export function resetAllTechnicalSeoAuditAgentsForTests(): void {
  TechnicalSeoAuditCrawlerAgent.reset();
  TechnicalSeoAuditCoreWebVitalsAgent.reset();
  TechnicalSeoAuditIndexabilityAgent.reset();
  TechnicalSeoAuditStructuredDataAgent.reset();
  TechnicalSeoAuditSecurityAgent.reset();
  TechnicalSeoAuditMobileAgent.reset();
  TechnicalSeoAuditInternationalAgent.reset();
  TechnicalSeoAuditReportAgent.reset();
}
