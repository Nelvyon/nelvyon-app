import type { ILlmClient } from "../../LlmClient";
import type { NewsletterInput, NewsletterOutput } from "./shared";
import { getDefaultNewsletterLlm, runNewsletterAgentCore } from "./shared";

const AGENT_ID = "newsletter-personalization";

export class NewsletterPersonalizationAgent {
  private static inst: NewsletterPersonalizationAgent | undefined;

  static get instance(): NewsletterPersonalizationAgent {
    if (!NewsletterPersonalizationAgent.inst) NewsletterPersonalizationAgent.inst = new NewsletterPersonalizationAgent();
    return NewsletterPersonalizationAgent.inst;
  }

  static reset(): void {
    NewsletterPersonalizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNewsletterLlm();
  }

  async run(input: NewsletterInput): Promise<NewsletterOutput> {
    const eliteRole = "Eres **Newsletter Personalization** — personalización 1:1 por suscriptor.";
    const mission =
      "Personaliza **100%** cada envío por suscriptor sin intervención humana.";
    const fewShot =
      '{"content":"Personalization: 1:1 por suscriptor, 100% personalizado","score":92,"highlights":["100% 1:1","Auto"],"metrics":["Personalization coverage"]}';
    return runNewsletterAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getNewsletterPersonalizationAgent(): NewsletterPersonalizationAgent {
  return NewsletterPersonalizationAgent.instance;
}

export function resetNewsletterPersonalizationAgentForTests(): void {
  NewsletterPersonalizationAgent.reset();
}
