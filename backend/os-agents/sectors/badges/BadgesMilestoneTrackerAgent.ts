import type { ILlmClient } from "../../LlmClient";
import type { BadgesInput, BadgesOutput } from "./shared";
import { getDefaultBadgesLlm, runBadgesAgentCore } from "./shared";

const AGENT_ID = "badges-milestone-tracker";

export class BadgesMilestoneTrackerAgent {
  private static inst: BadgesMilestoneTrackerAgent | undefined;

  static get instance(): BadgesMilestoneTrackerAgent {
    if (!BadgesMilestoneTrackerAgent.inst) BadgesMilestoneTrackerAgent.inst = new BadgesMilestoneTrackerAgent();
    return BadgesMilestoneTrackerAgent.inst;
  }

  static reset(): void {
    BadgesMilestoneTrackerAgent.inst = undefined;
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
          "ROLE: Activation analytics PM top 1%; hitos medibles ligados a eventos de producto.",
        mission:
          "Define hitos de activación que desbloquean badges: eventos, umbrales, ventanas de tiempo y validación.",
        fewShotExample:
          "Input: SaaS. Output JSON: milestones 'primer informe exportado'; badges asociados.",
      },
      input,
      0.2,
    );
  }
}

export function getBadgesMilestoneTrackerAgent(): BadgesMilestoneTrackerAgent {
  return BadgesMilestoneTrackerAgent.instance;
}

export function resetBadgesMilestoneTrackerAgentForTests(): void {
  BadgesMilestoneTrackerAgent.reset();
}
