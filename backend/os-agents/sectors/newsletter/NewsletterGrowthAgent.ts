import type { ILlmClient } from "../../LlmClient";
import type { NewsletterInput, NewsletterOutput } from "./shared";
import { getDefaultNewsletterLlm, runNewsletterAgentCore } from "./shared";

const AGENT_ID = "newsletter-growth";

export class NewsletterGrowthAgent {
  private static inst: NewsletterGrowthAgent | undefined;

  static get instance(): NewsletterGrowthAgent {
    if (!NewsletterGrowthAgent.inst) NewsletterGrowthAgent.inst = new NewsletterGrowthAgent();
    return NewsletterGrowthAgent.inst;
  }

  static reset(): void {
    NewsletterGrowthAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNewsletterLlm();
  }

  async run(input: NewsletterInput): Promise<NewsletterOutput> {
    const eliteRole = "Eres **Newsletter Growth** — captación y crecimiento de lista.";
    const mission =
      "Impulsa **captación**, **lead magnets** y **viral loops**; crecimiento **+20%** mensual automático.";
    const fewShot =
      '{"content":"Growth: captación, lead magnets, viral loops, +20% mensual","score":88,"highlights":["+20% mensual","Lead magnets"],"metrics":["List growth"]}';
    return runNewsletterAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getNewsletterGrowthAgent(): NewsletterGrowthAgent {
  return NewsletterGrowthAgent.instance;
}

export function resetNewsletterGrowthAgentForTests(): void {
  NewsletterGrowthAgent.reset();
}
