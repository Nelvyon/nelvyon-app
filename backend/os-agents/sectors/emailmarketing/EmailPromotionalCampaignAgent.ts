import type { ILlmClient } from "../../LlmClient";
import type { EmailMarketingInput, EmailMarketingOutput } from "./shared";
import { getDefaultEmailMarketingLlm, runEmailMarketingAgentCore } from "./shared";

const AGENT_ID = "email-promotional-campaign";

export class EmailPromotionalCampaignAgent {
  private static inst: EmailPromotionalCampaignAgent | undefined;

  static get instance(): EmailPromotionalCampaignAgent {
    if (!EmailPromotionalCampaignAgent.inst) EmailPromotionalCampaignAgent.inst = new EmailPromotionalCampaignAgent();
    return EmailPromotionalCampaignAgent.inst;
  }

  static reset(): void {
    EmailPromotionalCampaignAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEmailMarketingLlm();
  }

  async run(input: EmailMarketingInput): Promise<EmailMarketingOutput> {
    return runEmailMarketingAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Performance copywriter top 1%; urgencia real sin alarmismo ilegal o inventar stock.",
        mission:
          "Redacta email promocional de alta conversión: hero, bullets prueba, oferta con límites claros, CTA y variantes de subject.",
        fewShotExample: `Input: flash 48h envío gratis umbral.
Output JSON: body persuasivo; 5 subjects A/B; previews con escasez verificable.`,
      },
      input,
    );
  }
}

export function getEmailPromotionalCampaignAgent(): EmailPromotionalCampaignAgent {
  return EmailPromotionalCampaignAgent.instance;
}

export function resetEmailPromotionalCampaignAgentForTests(): void {
  EmailPromotionalCampaignAgent.reset();
}
