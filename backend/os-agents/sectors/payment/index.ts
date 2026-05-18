import { PaymentDunningSequenceAgent } from "./PaymentDunningSequenceAgent";
import { PaymentEscalationAgent } from "./PaymentEscalationAgent";
import { PaymentFirmNoticeAgent } from "./PaymentFirmNoticeAgent";
import { PaymentLegalNoticeAgent } from "./PaymentLegalNoticeAgent";
import { PaymentRecoveryOfferAgent } from "./PaymentRecoveryOfferAgent";
import { PaymentRiskProfilerAgent } from "./PaymentRiskProfilerAgent";
import { PaymentSoftReminderAgent } from "./PaymentSoftReminderAgent";
import { PaymentWinbackAgent } from "./PaymentWinbackAgent";

export type { PaymentInput, PaymentOutput } from "./shared";
export { parsePaymentLlmJson, buildRecoverPrompt, llmOpts as paymentLlmOpts } from "./shared";

export {
  PaymentDunningSequenceAgent,
  getPaymentDunningSequenceAgent,
  resetPaymentDunningSequenceAgentForTests,
} from "./PaymentDunningSequenceAgent";
export {
  PaymentSoftReminderAgent,
  getPaymentSoftReminderAgent,
  resetPaymentSoftReminderAgentForTests,
} from "./PaymentSoftReminderAgent";
export {
  PaymentFirmNoticeAgent,
  getPaymentFirmNoticeAgent,
  resetPaymentFirmNoticeAgentForTests,
} from "./PaymentFirmNoticeAgent";
export {
  PaymentRecoveryOfferAgent,
  getPaymentRecoveryOfferAgent,
  resetPaymentRecoveryOfferAgentForTests,
} from "./PaymentRecoveryOfferAgent";
export {
  PaymentEscalationAgent,
  getPaymentEscalationAgent,
  resetPaymentEscalationAgentForTests,
} from "./PaymentEscalationAgent";
export {
  PaymentWinbackAgent,
  getPaymentWinbackAgent,
  resetPaymentWinbackAgentForTests,
} from "./PaymentWinbackAgent";
export {
  PaymentRiskProfilerAgent,
  getPaymentRiskProfilerAgent,
  resetPaymentRiskProfilerAgentForTests,
} from "./PaymentRiskProfilerAgent";
export {
  PaymentLegalNoticeAgent,
  getPaymentLegalNoticeAgent,
  resetPaymentLegalNoticeAgentForTests,
} from "./PaymentLegalNoticeAgent";

export function resetAllPaymentAgentsForTests(): void {
  PaymentDunningSequenceAgent.reset();
  PaymentSoftReminderAgent.reset();
  PaymentFirmNoticeAgent.reset();
  PaymentRecoveryOfferAgent.reset();
  PaymentEscalationAgent.reset();
  PaymentWinbackAgent.reset();
  PaymentRiskProfilerAgent.reset();
  PaymentLegalNoticeAgent.reset();
}
