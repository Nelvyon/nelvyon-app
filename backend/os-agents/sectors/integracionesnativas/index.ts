import { IntegracionesNativasAuditAgent } from "./IntegracionesNativasAuditAgent";
import { IntegracionesNativasGA4Agent } from "./IntegracionesNativasGA4Agent";
import { IntegracionesNativasGoogleAdsAgent } from "./IntegracionesNativasGoogleAdsAgent";
import { IntegracionesNativasMetaAgent } from "./IntegracionesNativasMetaAgent";
import { IntegracionesNativasReportAgent } from "./IntegracionesNativasReportAgent";
import { IntegracionesNativasShopifyAgent } from "./IntegracionesNativasShopifyAgent";
import { IntegracionesNativasSyncAgent } from "./IntegracionesNativasSyncAgent";
import { IntegracionesNativasTikTokAgent } from "./IntegracionesNativasTikTokAgent";

export type { IntegracionesNativasInput, IntegracionesNativasOutput } from "./shared";
export {
  parseIntegracionesNativasLlmJson,
  buildIntegracionesNativasPrompt,
  llmOpts as integracionesnativasLlmOpts,
} from "./shared";

export {
  IntegracionesNativasGA4Agent,
  getIntegracionesNativasGA4Agent,
  resetIntegracionesNativasGA4AgentForTests,
} from "./IntegracionesNativasGA4Agent";
export {
  IntegracionesNativasMetaAgent,
  getIntegracionesNativasMetaAgent,
  resetIntegracionesNativasMetaAgentForTests,
} from "./IntegracionesNativasMetaAgent";
export {
  IntegracionesNativasGoogleAdsAgent,
  getIntegracionesNativasGoogleAdsAgent,
  resetIntegracionesNativasGoogleAdsAgentForTests,
} from "./IntegracionesNativasGoogleAdsAgent";
export {
  IntegracionesNativasShopifyAgent,
  getIntegracionesNativasShopifyAgent,
  resetIntegracionesNativasShopifyAgentForTests,
} from "./IntegracionesNativasShopifyAgent";
export {
  IntegracionesNativasTikTokAgent,
  getIntegracionesNativasTikTokAgent,
  resetIntegracionesNativasTikTokAgentForTests,
} from "./IntegracionesNativasTikTokAgent";
export {
  IntegracionesNativasSyncAgent,
  getIntegracionesNativasSyncAgent,
  resetIntegracionesNativasSyncAgentForTests,
} from "./IntegracionesNativasSyncAgent";
export {
  IntegracionesNativasAuditAgent,
  getIntegracionesNativasAuditAgent,
  resetIntegracionesNativasAuditAgentForTests,
} from "./IntegracionesNativasAuditAgent";
export {
  IntegracionesNativasReportAgent,
  getIntegracionesNativasReportAgent,
  resetIntegracionesNativasReportAgentForTests,
} from "./IntegracionesNativasReportAgent";

export function resetAllIntegracionesNativasAgentsForTests(): void {
  IntegracionesNativasGA4Agent.reset();
  IntegracionesNativasMetaAgent.reset();
  IntegracionesNativasGoogleAdsAgent.reset();
  IntegracionesNativasShopifyAgent.reset();
  IntegracionesNativasTikTokAgent.reset();
  IntegracionesNativasSyncAgent.reset();
  IntegracionesNativasAuditAgent.reset();
  IntegracionesNativasReportAgent.reset();
}
