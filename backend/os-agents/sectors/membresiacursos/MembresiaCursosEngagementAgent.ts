import type { ILlmClient } from "../../LlmClient";
import type { MembresiaCursosInput, MembresiaCursosOutput } from "./shared";
import { getDefaultMembresiaCursosLlm, runMembresiaCursosAgentCore } from "./shared";

const AGENT_ID = "membresiacursos-engagement";

export class MembresiaCursosEngagementAgent {
  private static inst: MembresiaCursosEngagementAgent | undefined;

  static get instance(): MembresiaCursosEngagementAgent {
    if (!MembresiaCursosEngagementAgent.inst) MembresiaCursosEngagementAgent.inst = new MembresiaCursosEngagementAgent();
    return MembresiaCursosEngagementAgent.inst;
  }

  static reset(): void {
    MembresiaCursosEngagementAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembresiaCursosLlm();
  }

  async run(input: MembresiaCursosInput): Promise<MembresiaCursosOutput> {
    const eliteRole = "Eres **MembresiaCursos Engagement** — engagement de alumnos.";
    const mission =
      "Impulsa **gamificación**, **badges**, **leaderboard** y **recordatorios automáticos**.";
    const fewShot =
      '{"content":"Engagement: gamificación, badges, leaderboard, recordatorios","score":92,"highlights":["Gamificación","Badges"],"metrics":["Student engagement"]}';
    return runMembresiaCursosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getMembresiaCursosEngagementAgent(): MembresiaCursosEngagementAgent {
  return MembresiaCursosEngagementAgent.instance;
}

export function resetMembresiaCursosEngagementAgentForTests(): void {
  MembresiaCursosEngagementAgent.reset();
}
