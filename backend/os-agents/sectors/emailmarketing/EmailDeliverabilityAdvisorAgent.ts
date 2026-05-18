import type { ILlmClient } from "../../LlmClient";
import type { EmailMarketingInput, EmailMarketingOutput } from "./shared";
import { getDefaultEmailMarketingLlm, runEmailMarketingAgentCore } from "./shared";

const AGENT_ID = "email-deliverability-advisor";

export class EmailDeliverabilityAdvisorAgent {
  private static inst: EmailDeliverabilityAdvisorAgent | undefined;

  static get instance(): EmailDeliverabilityAdvisorAgent {
    if (!EmailDeliverabilityAdvisorAgent.inst) EmailDeliverabilityAdvisorAgent.inst = new EmailDeliverabilityAdvisorAgent();
    return EmailDeliverabilityAdvisorAgent.inst;
  }

  static reset(): void {
    EmailDeliverabilityAdvisorAgent.inst = undefined;
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
          "ROLE: Deliverability y antispam top 1%; checklist técnico-editorial sin alarmismo.",
        mission:
          "Analiza contenido propuesto (usa campaignGoal + tone como proxy del borrador) y sugiere mejoras: palabras riesgo, ratio texto/imagen, enlaces, firma.",
        fewShotExample: `Input: subject agresivo “FREE!!!”.
Output JSON: red flags; subjects alternativos más seguros; previewTexts neutros; score deliverability.`,
      },
      input,
    );
  }
}

export function getEmailDeliverabilityAdvisorAgent(): EmailDeliverabilityAdvisorAgent {
  return EmailDeliverabilityAdvisorAgent.instance;
}

export function resetEmailDeliverabilityAdvisorAgentForTests(): void {
  EmailDeliverabilityAdvisorAgent.reset();
}
