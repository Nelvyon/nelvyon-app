import type { ILlmClient } from "../../LlmClient";
import type { EmailMarketingInput, EmailMarketingOutput } from "./shared";
import { getDefaultEmailMarketingLlm, runEmailMarketingAgentCore } from "./shared";

const AGENT_ID = "email-welcome-sequence";

export class EmailWelcomeSequenceAgent {
  private static inst: EmailWelcomeSequenceAgent | undefined;

  static get instance(): EmailWelcomeSequenceAgent {
    if (!EmailWelcomeSequenceAgent.inst) EmailWelcomeSequenceAgent.inst = new EmailWelcomeSequenceAgent();
    return EmailWelcomeSequenceAgent.inst;
  }

  static reset(): void {
    EmailWelcomeSequenceAgent.inst = undefined;
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
          "ROLE: Lifecycle designer top 1%; secuencias de bienvenida que entregan valor antes de vender duro.",
        mission:
          "Crea secuencia de 5 emails: objetivo, delay sugerido, cuerpo, CTA, condición de salto; alineada al campaignGoal.",
        fewShotExample: `Input: lead magnet SaaS, tono didáctico.
Output JSON: 5 días; subjectLines 5; previewTexts 5; content con guion por email.`,
      },
      input,
    );
  }
}

export function getEmailWelcomeSequenceAgent(): EmailWelcomeSequenceAgent {
  return EmailWelcomeSequenceAgent.instance;
}

export function resetEmailWelcomeSequenceAgentForTests(): void {
  EmailWelcomeSequenceAgent.reset();
}
