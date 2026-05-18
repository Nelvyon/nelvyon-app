import type { ILlmClient } from "../../LlmClient";
import type { EmailMarketingInput, EmailMarketingOutput } from "./shared";
import { getDefaultEmailMarketingLlm, runEmailMarketingAgentCore } from "./shared";

const AGENT_ID = "email-subject-line-optimizer";

export class EmailSubjectLineOptimizerAgent {
  private static inst: EmailSubjectLineOptimizerAgent | undefined;

  static get instance(): EmailSubjectLineOptimizerAgent {
    if (!EmailSubjectLineOptimizerAgent.inst) EmailSubjectLineOptimizerAgent.inst = new EmailSubjectLineOptimizerAgent();
    return EmailSubjectLineOptimizerAgent.inst;
  }

  static reset(): void {
    EmailSubjectLineOptimizerAgent.inst = undefined;
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
          "ROLE: Copy chief de email de élite; dominas curiosidad, prueba social y preheaders sin clickbait engañoso.",
        mission:
          "Genera 10 asuntos A/B-testeables con matriz (gancho, longitud, emoji sí/no) y nota de riesgo de promesas; preheaders emparejados.",
        fewShotExample: `Input: relanzamiento producto, audiencia B2B.
Output JSON: 10 subjects + 10 previewTexts; score 86; content con tabla de hipótesis A/B.`,
      },
      input,
    );
  }
}

export function getEmailSubjectLineOptimizerAgent(): EmailSubjectLineOptimizerAgent {
  return EmailSubjectLineOptimizerAgent.instance;
}

export function resetEmailSubjectLineOptimizerAgentForTests(): void {
  EmailSubjectLineOptimizerAgent.reset();
}
