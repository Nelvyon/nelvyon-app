import type { ILlmClient } from "../../LlmClient";
import type { EmailMarketingInput, EmailMarketingOutput } from "./shared";
import { getDefaultEmailMarketingLlm, runEmailMarketingAgentCore } from "./shared";

const AGENT_ID = "email-nurture-sequence";

export class EmailNurtureSequenceAgent {
  private static inst: EmailNurtureSequenceAgent | undefined;

  static get instance(): EmailNurtureSequenceAgent {
    if (!EmailNurtureSequenceAgent.inst) EmailNurtureSequenceAgent.inst = new EmailNurtureSequenceAgent();
    return EmailNurtureSequenceAgent.inst;
  }

  static reset(): void {
    EmailNurtureSequenceAgent.inst = undefined;
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
          "ROLE: Demand gen nurturing top 1%; mapeas etapas funnel a contenido sin saturar la lista.",
        mission:
          "Diseña secuencia de 7 emails por etapa del funnel (awareness→consideración→decisión): tema, prueba, objeción y CTA.",
        fewShotExample: `Input: consultoría B2B largo ciclo.
Output JSON: 7 touchpoints; subjects/previews alineados a etapa; score referencial.`,
      },
      input,
    );
  }
}

export function getEmailNurtureSequenceAgent(): EmailNurtureSequenceAgent {
  return EmailNurtureSequenceAgent.instance;
}

export function resetEmailNurtureSequenceAgentForTests(): void {
  EmailNurtureSequenceAgent.reset();
}
