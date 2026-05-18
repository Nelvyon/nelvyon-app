import { FiscalBillingDetectorAgent } from "./FiscalBillingDetectorAgent";
import { FiscalBillingExemptAgent } from "./FiscalBillingExemptAgent";
import { FiscalBillingInvoiceAgent } from "./FiscalBillingInvoiceAgent";
import { FiscalBillingKitDigitalAgent } from "./FiscalBillingKitDigitalAgent";
import { FiscalBillingReportAgent } from "./FiscalBillingReportAgent";
import { FiscalBillingReverseChargeAgent } from "./FiscalBillingReverseChargeAgent";
import { FiscalBillingVATAgent } from "./FiscalBillingVATAgent";
import { FiscalBillingValidatorAgent } from "./FiscalBillingValidatorAgent";

export type { FiscalBillingCountryCode, FiscalBillingInput, FiscalBillingOutput } from "./shared";
export {
  parseFiscalBillingLlmJson,
  buildFiscalBillingPrompt,
  llmOpts as fiscalBillingLlmOpts,
} from "./shared";

export {
  FiscalBillingDetectorAgent,
  getFiscalBillingDetectorAgent,
  resetFiscalBillingDetectorAgentForTests,
} from "./FiscalBillingDetectorAgent";
export {
  FiscalBillingVATAgent,
  getFiscalBillingVATAgent,
  resetFiscalBillingVATAgentForTests,
} from "./FiscalBillingVATAgent";
export {
  FiscalBillingInvoiceAgent,
  getFiscalBillingInvoiceAgent,
  resetFiscalBillingInvoiceAgentForTests,
} from "./FiscalBillingInvoiceAgent";
export {
  FiscalBillingKitDigitalAgent,
  getFiscalBillingKitDigitalAgent,
  resetFiscalBillingKitDigitalAgentForTests,
} from "./FiscalBillingKitDigitalAgent";
export {
  FiscalBillingReverseChargeAgent,
  getFiscalBillingReverseChargeAgent,
  resetFiscalBillingReverseChargeAgentForTests,
} from "./FiscalBillingReverseChargeAgent";
export {
  FiscalBillingExemptAgent,
  getFiscalBillingExemptAgent,
  resetFiscalBillingExemptAgentForTests,
} from "./FiscalBillingExemptAgent";
export {
  FiscalBillingReportAgent,
  getFiscalBillingReportAgent,
  resetFiscalBillingReportAgentForTests,
} from "./FiscalBillingReportAgent";
export {
  FiscalBillingValidatorAgent,
  getFiscalBillingValidatorAgent,
  resetFiscalBillingValidatorAgentForTests,
} from "./FiscalBillingValidatorAgent";

export function resetAllFiscalBillingAgentsForTests(): void {
  FiscalBillingDetectorAgent.reset();
  FiscalBillingVATAgent.reset();
  FiscalBillingInvoiceAgent.reset();
  FiscalBillingKitDigitalAgent.reset();
  FiscalBillingReverseChargeAgent.reset();
  FiscalBillingExemptAgent.reset();
  FiscalBillingReportAgent.reset();
  FiscalBillingValidatorAgent.reset();
}
