import type { ILlmClient } from "../../LlmClient";
import type { EmailMarketingInput, EmailMarketingOutput } from "./shared";
import { getDefaultEmailMarketingLlm, runEmailMarketingAgentCore } from "./shared";

const AGENT_ID = "email-reactivation";

export class EmailReactivationAgent {
  private static inst: EmailReactivationAgent | undefined;

  static get instance(): EmailReactivationAgent {
    if (!EmailReactivationAgent.inst) EmailReactivationAgent.inst = new EmailReactivationAgent();
    return EmailReactivationAgent.inst;
  }

  static reset(): void {
    EmailReactivationAgent.inst = undefined;
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
          "ROLE: Reactivation specialist top 1%; equilibrio entre incentivo y dignidad de marca.",
        mission:
          "Genera campaña para suscriptores inactivos +90 días: serie corta o email único según objetivo; línea de última oportunidad ética.",
        fewShotExample: `Input: ecommerce fashion, win-back con cupón capado.
Output JSON: asuntos de reapertura sin culpa; previews honestos; contenido con segmentación sugerida.`,
      },
      input,
    );
  }
}

export function getEmailReactivationAgent(): EmailReactivationAgent {
  return EmailReactivationAgent.instance;
}

export function resetEmailReactivationAgentForTests(): void {
  EmailReactivationAgent.reset();
}
