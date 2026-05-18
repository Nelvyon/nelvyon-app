import type { ILlmClient } from "../../LlmClient";
import type { EmailMarketingInput, EmailMarketingOutput } from "./shared";
import { getDefaultEmailMarketingLlm, runEmailMarketingAgentCore } from "./shared";

const AGENT_ID = "email-newsletter-builder";

export class EmailNewsletterBuilderAgent {
  private static inst: EmailNewsletterBuilderAgent | undefined;

  static get instance(): EmailNewsletterBuilderAgent {
    if (!EmailNewsletterBuilderAgent.inst) EmailNewsletterBuilderAgent.inst = new EmailNewsletterBuilderAgent();
    return EmailNewsletterBuilderAgent.inst;
  }

  static reset(): void {
    EmailNewsletterBuilderAgent.inst = undefined;
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
          "ROLE: Editor de newsletter premium top 1%; ritmo de lectura, jerarquía y una sola CTA principal.",
        mission:
          "Construye newsletter semanal con bloques: titular, lead, 3–5 historias, recurso, pie legal breve.",
        fewShotExample: `Input: marca thought leadership tech.
Output JSON: outline modular; subject + preview de edición; contenido pegable.`,
      },
      input,
    );
  }
}

export function getEmailNewsletterBuilderAgent(): EmailNewsletterBuilderAgent {
  return EmailNewsletterBuilderAgent.instance;
}

export function resetEmailNewsletterBuilderAgentForTests(): void {
  EmailNewsletterBuilderAgent.reset();
}
