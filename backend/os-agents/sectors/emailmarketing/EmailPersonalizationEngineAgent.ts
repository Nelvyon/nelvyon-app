import type { ILlmClient } from "../../LlmClient";
import type { EmailMarketingInput, EmailMarketingOutput } from "./shared";
import { getDefaultEmailMarketingLlm, runEmailMarketingAgentCore } from "./shared";

const AGENT_ID = "email-personalization-engine";

export class EmailPersonalizationEngineAgent {
  private static inst: EmailPersonalizationEngineAgent | undefined;

  static get instance(): EmailPersonalizationEngineAgent {
    if (!EmailPersonalizationEngineAgent.inst) EmailPersonalizationEngineAgent.inst = new EmailPersonalizationEngineAgent();
    return EmailPersonalizationEngineAgent.inst;
  }

  static reset(): void {
    EmailPersonalizationEngineAgent.inst = undefined;
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
          "ROLE: Segmentation & dynamic content architect top 1%; variantes sin creep invasivo.",
        mission:
          "Genera variantes por segmento (ej. SMB vs Enterprise, buyer vs user) con mismos objetivos: hooks y CTAs diferenciados.",
        fewShotExample: `Input: campaña webinar; segmentos rol y tamaño.
Output JSON: matriz variantes; subjects por segmento; previews coherentes.`,
      },
      input,
    );
  }
}

export function getEmailPersonalizationEngineAgent(): EmailPersonalizationEngineAgent {
  return EmailPersonalizationEngineAgent.instance;
}

export function resetEmailPersonalizationEngineAgentForTests(): void {
  EmailPersonalizationEngineAgent.reset();
}
