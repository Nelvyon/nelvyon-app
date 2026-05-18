import type { ILlmClient } from "../../LlmClient";
import type { BadgesInput, BadgesOutput } from "./shared";
import { getDefaultBadgesLlm, runBadgesAgentCore } from "./shared";

const AGENT_ID = "badges-certification-path";

export class BadgesCertificationPathAgent {
  private static inst: BadgesCertificationPathAgent | undefined;

  static get instance(): BadgesCertificationPathAgent {
    if (!BadgesCertificationPathAgent.inst) BadgesCertificationPathAgent.inst = new BadgesCertificationPathAgent();
    return BadgesCertificationPathAgent.inst;
  }

  static reset(): void {
    BadgesCertificationPathAgent.inst = undefined;
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
          "ROLE: Credentialing designer top 1%; rutas claras básico → avanzado → experto.",
        mission:
          "Crea rutas de certificación por nivel: requisitos, evaluación, renovación y integridad.",
        fewShotExample:
          "Input: partner program. Output JSON: badges por nivel; milestones examen práctico.",
      },
      input,
      0.2,
    );
  }
}

export function getBadgesCertificationPathAgent(): BadgesCertificationPathAgent {
  return BadgesCertificationPathAgent.instance;
}

export function resetBadgesCertificationPathAgentForTests(): void {
  BadgesCertificationPathAgent.reset();
}
