import type { ILlmClient } from "../../LlmClient";
import type { EmailMarketingInput, EmailMarketingOutput } from "./shared";
import { getDefaultEmailMarketingLlm, runEmailMarketingAgentCore } from "./shared";

const AGENT_ID = "email-abandoned-cart";

export class EmailAbandonedCartAgent {
  private static inst: EmailAbandonedCartAgent | undefined;

  static get instance(): EmailAbandonedCartAgent {
    if (!EmailAbandonedCartAgent.inst) EmailAbandonedCartAgent.inst = new EmailAbandonedCartAgent();
    return EmailAbandonedCartAgent.inst;
  }

  static reset(): void {
    EmailAbandonedCartAgent.inst = undefined;
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
          "ROLE: Ecommerce retention copy top 1%; secuencias carrito con cadencia y mensajes distintos por toque.",
        mission:
          "Crea secuencia de 3 emails para carrito abandonado: T1 recordatorio, T2 objeción/prueba social, T3 incentivo acotado.",
        fewShotExample: `Input: ticket medio alto, envío gratis solo email 3.
Output JSON: copy por email; 3 subjects + 3 previews; delays sugeridos.`,
      },
      input,
    );
  }
}

export function getEmailAbandonedCartAgent(): EmailAbandonedCartAgent {
  return EmailAbandonedCartAgent.instance;
}

export function resetEmailAbandonedCartAgentForTests(): void {
  EmailAbandonedCartAgent.reset();
}
