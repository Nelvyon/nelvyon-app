import { QrCodeGeneratorBrandingAgent } from "./QrCodeGeneratorBrandingAgent";
import { QrCodeGeneratorBulkAgent } from "./QrCodeGeneratorBulkAgent";
import { QrCodeGeneratorCampaignAgent } from "./QrCodeGeneratorCampaignAgent";
import { QrCodeGeneratorCreatorAgent } from "./QrCodeGeneratorCreatorAgent";
import { QrCodeGeneratorDynamicAgent } from "./QrCodeGeneratorDynamicAgent";
import { QrCodeGeneratorPrintAgent } from "./QrCodeGeneratorPrintAgent";
import { QrCodeGeneratorReportAgent } from "./QrCodeGeneratorReportAgent";
import { QrCodeGeneratorTrackingAgent } from "./QrCodeGeneratorTrackingAgent";

export type { QrCodeGeneratorInput, QrCodeGeneratorOutput } from "./shared";
export { parseQrCodeGeneratorLlmJson, buildQrCodeGeneratorPrompt, llmOpts as qrcodegeneratorLlmOpts } from "./shared";

export {
  QrCodeGeneratorCreatorAgent,
  getQrCodeGeneratorCreatorAgent,
  resetQrCodeGeneratorCreatorAgentForTests,
} from "./QrCodeGeneratorCreatorAgent";
export {
  QrCodeGeneratorBrandingAgent,
  getQrCodeGeneratorBrandingAgent,
  resetQrCodeGeneratorBrandingAgentForTests,
} from "./QrCodeGeneratorBrandingAgent";
export {
  QrCodeGeneratorDynamicAgent,
  getQrCodeGeneratorDynamicAgent,
  resetQrCodeGeneratorDynamicAgentForTests,
} from "./QrCodeGeneratorDynamicAgent";
export {
  QrCodeGeneratorTrackingAgent,
  getQrCodeGeneratorTrackingAgent,
  resetQrCodeGeneratorTrackingAgentForTests,
} from "./QrCodeGeneratorTrackingAgent";
export {
  QrCodeGeneratorCampaignAgent,
  getQrCodeGeneratorCampaignAgent,
  resetQrCodeGeneratorCampaignAgentForTests,
} from "./QrCodeGeneratorCampaignAgent";
export {
  QrCodeGeneratorBulkAgent,
  getQrCodeGeneratorBulkAgent,
  resetQrCodeGeneratorBulkAgentForTests,
} from "./QrCodeGeneratorBulkAgent";
export {
  QrCodeGeneratorPrintAgent,
  getQrCodeGeneratorPrintAgent,
  resetQrCodeGeneratorPrintAgentForTests,
} from "./QrCodeGeneratorPrintAgent";
export {
  QrCodeGeneratorReportAgent,
  getQrCodeGeneratorReportAgent,
  resetQrCodeGeneratorReportAgentForTests,
} from "./QrCodeGeneratorReportAgent";

export function resetAllQrCodeGeneratorAgentsForTests(): void {
  QrCodeGeneratorCreatorAgent.reset();
  QrCodeGeneratorBrandingAgent.reset();
  QrCodeGeneratorDynamicAgent.reset();
  QrCodeGeneratorTrackingAgent.reset();
  QrCodeGeneratorCampaignAgent.reset();
  QrCodeGeneratorBulkAgent.reset();
  QrCodeGeneratorPrintAgent.reset();
  QrCodeGeneratorReportAgent.reset();
}
