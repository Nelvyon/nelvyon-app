import { EmailAbandonedCartAgent } from "./EmailAbandonedCartAgent";
import { EmailDeliverabilityAdvisorAgent } from "./EmailDeliverabilityAdvisorAgent";
import { EmailNewsletterBuilderAgent } from "./EmailNewsletterBuilderAgent";
import { EmailNurtureSequenceAgent } from "./EmailNurtureSequenceAgent";
import { EmailPersonalizationEngineAgent } from "./EmailPersonalizationEngineAgent";
import { EmailPromotionalCampaignAgent } from "./EmailPromotionalCampaignAgent";
import { EmailReactivationAgent } from "./EmailReactivationAgent";
import { EmailSubjectLineOptimizerAgent } from "./EmailSubjectLineOptimizerAgent";
import { EmailWelcomeSequenceAgent } from "./EmailWelcomeSequenceAgent";

export type { EmailMarketingInput, EmailMarketingOutput } from "./shared";
export {
  parseEmailMarketingLlmJson,
  buildInboxPrompt,
  emailMarketingTemperature,
  llmOpts as emailMarketingLlmOpts,
} from "./shared";

export {
  EmailSubjectLineOptimizerAgent,
  getEmailSubjectLineOptimizerAgent,
  resetEmailSubjectLineOptimizerAgentForTests,
} from "./EmailSubjectLineOptimizerAgent";
export {
  EmailWelcomeSequenceAgent,
  getEmailWelcomeSequenceAgent,
  resetEmailWelcomeSequenceAgentForTests,
} from "./EmailWelcomeSequenceAgent";
export {
  EmailNurtureSequenceAgent,
  getEmailNurtureSequenceAgent,
  resetEmailNurtureSequenceAgentForTests,
} from "./EmailNurtureSequenceAgent";
export {
  EmailReactivationAgent,
  getEmailReactivationAgent,
  resetEmailReactivationAgentForTests,
} from "./EmailReactivationAgent";
export {
  EmailPromotionalCampaignAgent,
  getEmailPromotionalCampaignAgent,
  resetEmailPromotionalCampaignAgentForTests,
} from "./EmailPromotionalCampaignAgent";
export {
  EmailAbandonedCartAgent,
  getEmailAbandonedCartAgent,
  resetEmailAbandonedCartAgentForTests,
} from "./EmailAbandonedCartAgent";
export {
  EmailNewsletterBuilderAgent,
  getEmailNewsletterBuilderAgent,
  resetEmailNewsletterBuilderAgentForTests,
} from "./EmailNewsletterBuilderAgent";
export {
  EmailPersonalizationEngineAgent,
  getEmailPersonalizationEngineAgent,
  resetEmailPersonalizationEngineAgentForTests,
} from "./EmailPersonalizationEngineAgent";
export {
  EmailDeliverabilityAdvisorAgent,
  getEmailDeliverabilityAdvisorAgent,
  resetEmailDeliverabilityAdvisorAgentForTests,
} from "./EmailDeliverabilityAdvisorAgent";

export function resetAllEmailMarketingAgentsForTests(): void {
  EmailSubjectLineOptimizerAgent.reset();
  EmailWelcomeSequenceAgent.reset();
  EmailNurtureSequenceAgent.reset();
  EmailReactivationAgent.reset();
  EmailPromotionalCampaignAgent.reset();
  EmailAbandonedCartAgent.reset();
  EmailNewsletterBuilderAgent.reset();
  EmailPersonalizationEngineAgent.reset();
  EmailDeliverabilityAdvisorAgent.reset();
}
