import type { ILlmClient } from "../../LlmClient";
import type { NewsletterInput, NewsletterOutput } from "./shared";
import { getDefaultNewsletterLlm, runNewsletterAgentCore } from "./shared";

const AGENT_ID = "newsletter-analytics";

export class NewsletterAnalyticsAgent {
  private static inst: NewsletterAnalyticsAgent | undefined;

  static get instance(): NewsletterAnalyticsAgent {
    if (!NewsletterAnalyticsAgent.inst) NewsletterAnalyticsAgent.inst = new NewsletterAnalyticsAgent();
    return NewsletterAnalyticsAgent.inst;
  }

  static reset(): void {
    NewsletterAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNewsletterLlm();
  }

  async run(input: NewsletterInput): Promise<NewsletterOutput> {
    const eliteRole = "Eres **Newsletter Analytics** — analytics por envío.";
    const mission =
      "Mide **open rate**, **CTR** y **revenue por envío** vs benchmarks de industria.";
    const fewShot =
      '{"content":"Analytics: open rate, CTR, revenue por envío","score":89,"highlights":[">45% open",">8% CTR"],"metrics":["Revenue per send"]}';
    return runNewsletterAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getNewsletterAnalyticsAgent(): NewsletterAnalyticsAgent {
  return NewsletterAnalyticsAgent.instance;
}

export function resetNewsletterAnalyticsAgentForTests(): void {
  NewsletterAnalyticsAgent.reset();
}
