import type { ILlmClient } from "../../LlmClient";
import type { NewsletterInput, NewsletterOutput } from "./shared";
import { getDefaultNewsletterLlm, runNewsletterAgentCore } from "./shared";

const AGENT_ID = "newsletter-scheduler";

export class NewsletterSchedulerAgent {
  private static inst: NewsletterSchedulerAgent | undefined;

  static get instance(): NewsletterSchedulerAgent {
    if (!NewsletterSchedulerAgent.inst) NewsletterSchedulerAgent.inst = new NewsletterSchedulerAgent();
    return NewsletterSchedulerAgent.inst;
  }

  static reset(): void {
    NewsletterSchedulerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNewsletterLlm();
  }

  async run(input: NewsletterInput): Promise<NewsletterOutput> {
    const eliteRole = "Eres **Newsletter Scheduler** — envío óptimo por zona y comportamiento.";
    const mission =
      "Programa envíos por **zona horaria** y **comportamiento** para maximizar apertura y CTR.";
    const fewShot =
      '{"content":"Scheduler: envío óptimo TZ y comportamiento, open >45%","score":91,"highlights":["TZ óptimo","Comportamiento"],"metrics":["Send time lift"]}';
    return runNewsletterAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getNewsletterSchedulerAgent(): NewsletterSchedulerAgent {
  return NewsletterSchedulerAgent.instance;
}

export function resetNewsletterSchedulerAgentForTests(): void {
  NewsletterSchedulerAgent.reset();
}
