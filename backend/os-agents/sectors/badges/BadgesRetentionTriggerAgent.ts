import type { ILlmClient } from "../../LlmClient";
import type { BadgesInput, BadgesOutput } from "./shared";
import { getDefaultBadgesLlm, runBadgesAgentCore } from "./shared";

const AGENT_ID = "badges-retention-trigger";

export class BadgesRetentionTriggerAgent {
  private static inst: BadgesRetentionTriggerAgent | undefined;

  static get instance(): BadgesRetentionTriggerAgent {
    if (!BadgesRetentionTriggerAgent.inst) BadgesRetentionTriggerAgent.inst = new BadgesRetentionTriggerAgent();
    return BadgesRetentionTriggerAgent.inst;
  }

  static reset(): void {
    BadgesRetentionTriggerAgent.inst = undefined;
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
          "ROLE: Retention × gamification strategist top 1%; badges en momentos de riesgo y hábito.",
        mission:
          "Conecta badges con momentos clave de retención: señales, intervenciones y experimentos medibles.",
        fewShotExample:
          "Input: usuario D14 en riesgo. Output JSON: badges 'vuelve y gana'; milestones re-engagement.",
      },
      input,
      0.2,
    );
  }
}

export function getBadgesRetentionTriggerAgent(): BadgesRetentionTriggerAgent {
  return BadgesRetentionTriggerAgent.instance;
}

export function resetBadgesRetentionTriggerAgentForTests(): void {
  BadgesRetentionTriggerAgent.reset();
}
