import type { ILlmClient } from "../../LlmClient";
import type { NewsletterInput, NewsletterOutput } from "./shared";
import { getDefaultNewsletterLlm, runNewsletterAgentCore } from "./shared";

const AGENT_ID = "newsletter-churn";

export class NewsletterChurnAgent {
  private static inst: NewsletterChurnAgent | undefined;

  static get instance(): NewsletterChurnAgent {
    if (!NewsletterChurnAgent.inst) NewsletterChurnAgent.inst = new NewsletterChurnAgent();
    return NewsletterChurnAgent.inst;
  }

  static reset(): void {
    NewsletterChurnAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNewsletterLlm();
  }

  async run(input: NewsletterInput): Promise<NewsletterOutput> {
    const eliteRole = "Eres **Newsletter Churn** — recuperación de suscriptores inactivos.";
    const mission =
      "Recupera **suscriptores inactivos** con secuencias automáticas y win-back.";
    const fewShot =
      '{"content":"Churn: recuperación inactivos, win-back automático","score":86,"highlights":["Win-back","Inactivos"],"metrics":["Reactivation rate"]}';
    return runNewsletterAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getNewsletterChurnAgent(): NewsletterChurnAgent {
  return NewsletterChurnAgent.instance;
}

export function resetNewsletterChurnAgentForTests(): void {
  NewsletterChurnAgent.reset();
}
