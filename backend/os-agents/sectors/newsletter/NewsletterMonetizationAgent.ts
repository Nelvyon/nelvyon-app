import type { ILlmClient } from "../../LlmClient";
import type { NewsletterInput, NewsletterOutput } from "./shared";
import { getDefaultNewsletterLlm, runNewsletterAgentCore } from "./shared";

const AGENT_ID = "newsletter-monetization";

export class NewsletterMonetizationAgent {
  private static inst: NewsletterMonetizationAgent | undefined;

  static get instance(): NewsletterMonetizationAgent {
    if (!NewsletterMonetizationAgent.inst) NewsletterMonetizationAgent.inst = new NewsletterMonetizationAgent();
    return NewsletterMonetizationAgent.inst;
  }

  static reset(): void {
    NewsletterMonetizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNewsletterLlm();
  }

  async run(input: NewsletterInput): Promise<NewsletterOutput> {
    const eliteRole = "Eres **Newsletter Monetization** — monetización automática de audiencia.";
    const mission =
      "Activa **patrocinios**, **paid content** y **upsell**; **revenue/email >0.50€** sin humano.";
    const fewShot =
      '{"content":"Monetization: patrocinios, paid content, upsell, >0.50€/email","score":90,"highlights":[">0.50€/email","Auto monetize"],"metrics":["Revenue per email"]}';
    return runNewsletterAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getNewsletterMonetizationAgent(): NewsletterMonetizationAgent {
  return NewsletterMonetizationAgent.instance;
}

export function resetNewsletterMonetizationAgentForTests(): void {
  NewsletterMonetizationAgent.reset();
}
