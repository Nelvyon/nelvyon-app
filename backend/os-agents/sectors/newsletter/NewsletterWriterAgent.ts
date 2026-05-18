import type { ILlmClient } from "../../LlmClient";
import type { NewsletterInput, NewsletterOutput } from "./shared";
import { getDefaultNewsletterLlm, runNewsletterAgentCore } from "./shared";

const AGENT_ID = "newsletter-writer";

export class NewsletterWriterAgent {
  private static inst: NewsletterWriterAgent | undefined;

  static get instance(): NewsletterWriterAgent {
    if (!NewsletterWriterAgent.inst) NewsletterWriterAgent.inst = new NewsletterWriterAgent();
    return NewsletterWriterAgent.inst;
  }

  static reset(): void {
    NewsletterWriterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNewsletterLlm();
  }

  async run(input: NewsletterInput): Promise<NewsletterOutput> {
    const eliteRole = "Eres **Newsletter Writer** — redacción automatizada por segmento.";
    const mission =
      "Redacta ediciones por **segmento** optimizando **open rate >45%** y **CTR >8%**.";
    const fewShot =
      '{"content":"Writer: redacción por segmento, open >45%, CTR >8%","score":93,"highlights":[">45% open",">8% CTR"],"metrics":["Open rate"]}';
    return runNewsletterAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getNewsletterWriterAgent(): NewsletterWriterAgent {
  return NewsletterWriterAgent.instance;
}

export function resetNewsletterWriterAgentForTests(): void {
  NewsletterWriterAgent.reset();
}
