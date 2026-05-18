import type { ILlmClient } from "../../LlmClient";
import type { BadgesInput, BadgesOutput } from "./shared";
import { getDefaultBadgesLlm, runBadgesAgentCore } from "./shared";

const AGENT_ID = "badges-system-designer";

export class BadgesSystemDesignerAgent {
  private static inst: BadgesSystemDesignerAgent | undefined;

  static get instance(): BadgesSystemDesignerAgent {
    if (!BadgesSystemDesignerAgent.inst) BadgesSystemDesignerAgent.inst = new BadgesSystemDesignerAgent();
    return BadgesSystemDesignerAgent.inst;
  }

  static reset(): void {
    BadgesSystemDesignerAgent.inst = undefined;
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
          "ROLE: Gamification systems architect top 1%; badges que refuerzan valor real, no vanity metrics vacías.",
        mission:
          "Diseña sistema completo de badges y niveles de usuario: taxonomía, rareza, progresión y anti-farming.",
        fewShotExample:
          "Input: edtech. Output JSON: badges por módulo; milestones XP umbral y verificación.",
      },
      input,
      0.2,
    );
  }
}

export function getBadgesSystemDesignerAgent(): BadgesSystemDesignerAgent {
  return BadgesSystemDesignerAgent.instance;
}

export function resetBadgesSystemDesignerAgentForTests(): void {
  BadgesSystemDesignerAgent.reset();
}
