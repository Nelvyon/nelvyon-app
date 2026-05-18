import type { ILlmClient } from "../../LlmClient";
import type { BadgesInput, BadgesOutput } from "./shared";
import { getDefaultBadgesLlm, runBadgesAgentCore } from "./shared";

const AGENT_ID = "badges-shareable-content";

export class BadgesShareableContentAgent {
  private static inst: BadgesShareableContentAgent | undefined;

  static get instance(): BadgesShareableContentAgent {
    if (!BadgesShareableContentAgent.inst) BadgesShareableContentAgent.inst = new BadgesShareableContentAgent();
    return BadgesShareableContentAgent.inst;
  }

  static reset(): void {
    BadgesShareableContentAgent.inst = undefined;
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
          "ROLE: Social growth copy chief top 1%; shareables orgullosos, no spam.",
        mission:
          "Genera contenido compartible en RRSS por badge obtenido: copy, hashtags sugeridos y CTA ético.",
        fewShotExample:
          "Input: LinkedIn learning. Output JSON: badges plantilla imagen; milestones verificación skill.",
      },
      input,
      0.5,
    );
  }
}

export function getBadgesShareableContentAgent(): BadgesShareableContentAgent {
  return BadgesShareableContentAgent.instance;
}

export function resetBadgesShareableContentAgentForTests(): void {
  BadgesShareableContentAgent.reset();
}
