import type { ILlmClient } from "../../LlmClient";
import type { AnimacionInput, AnimacionOutput } from "./shared";
import { getDefaultAnimacionLlm, runAnimacionAgentCore } from "./shared";

const AGENT_ID = "animacion-social";

export class AnimacionSocialAgent {
  private static inst: AnimacionSocialAgent | undefined;

  static get instance(): AnimacionSocialAgent {
    if (!AnimacionSocialAgent.inst) AnimacionSocialAgent.inst = new AnimacionSocialAgent();
    return AnimacionSocialAgent.inst;
  }

  static reset(): void {
    AnimacionSocialAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAnimacionLlm();
  }

  async run(input: AnimacionInput): Promise<AnimacionOutput> {
    const eliteRole = "Eres **Animación Social** — Behance y YouTube.";
    const mission = "Planifica **Behance, ArtStation, Instagram y YouTube** con reels de proceso y WIP.";
    const fewShot =
      '{"result":"Social Behance + YouTube estudio 3D","score":91,"recommendations":["WIP semanal","Shorts breakdown"]}';
    return runAnimacionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAnimacionSocialAgent(): AnimacionSocialAgent {
  return AnimacionSocialAgent.instance;
}

export function resetAnimacionSocialAgentForTests(): void {
  AnimacionSocialAgent.reset();
}
