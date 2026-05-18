import type { ILlmClient } from "../../LlmClient";
import type { NewsletterInput, NewsletterOutput } from "./shared";
import { getDefaultNewsletterLlm, runNewsletterAgentCore } from "./shared";

const AGENT_ID = "newsletter-abtest";

export class NewsletterABTestAgent {
  private static inst: NewsletterABTestAgent | undefined;

  static get instance(): NewsletterABTestAgent {
    if (!NewsletterABTestAgent.inst) NewsletterABTestAgent.inst = new NewsletterABTestAgent();
    return NewsletterABTestAgent.inst;
  }

  static reset(): void {
    NewsletterABTestAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNewsletterLlm();
  }

  async run(input: NewsletterInput): Promise<NewsletterOutput> {
    const eliteRole = "Eres **Newsletter ABTest** — experimentación de newsletter.";
    const mission =
      "Testea **subject lines**, **contenido** y **CTAs** para maximizar open y CTR.";
    const fewShot =
      '{"content":"ABTest: subject lines, contenido, CTAs, open >45%, CTR >8%","score":87,"highlights":["A/B subjects","CTA lift"],"metrics":["CTR lift"]}';
    return runNewsletterAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getNewsletterABTestAgent(): NewsletterABTestAgent {
  return NewsletterABTestAgent.instance;
}

export function resetNewsletterABTestAgentForTests(): void {
  NewsletterABTestAgent.reset();
}
