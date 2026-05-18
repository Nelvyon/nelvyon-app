import type { ILlmClient } from "../../LlmClient";
import type { BadgesInput, BadgesOutput } from "./shared";
import { getDefaultBadgesLlm, runBadgesAgentCore } from "./shared";

const AGENT_ID = "badges-email-celebration";

export class BadgesEmailCelebrationAgent {
  private static inst: BadgesEmailCelebrationAgent | undefined;

  static get instance(): BadgesEmailCelebrationAgent {
    if (!BadgesEmailCelebrationAgent.inst) BadgesEmailCelebrationAgent.inst = new BadgesEmailCelebrationAgent();
    return BadgesEmailCelebrationAgent.inst;
  }

  static reset(): void {
    BadgesEmailCelebrationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBadgesLlm();
  }

  async run(input: BadgesInput): Promise<BadgesOutput> {
    return runBadgesAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Lifecycle celebration writer top 1%; orgullo genuino y siguiente paso útil.",
        mission:
          "Redacta emails de celebración personalizados por logro: asunto, cuerpo, CTA y variante por rareza.",
        fewShotExample:
          "Input: badge épico desbloqueado. Output JSON: badges plantillas email; milestones trigger envío.",
      },
      input,
      0.5,
    );
  }
}

export function getBadgesEmailCelebrationAgent(): BadgesEmailCelebrationAgent {
  return BadgesEmailCelebrationAgent.instance;
}

export function resetBadgesEmailCelebrationAgentForTests(): void {
  BadgesEmailCelebrationAgent.reset();
}
