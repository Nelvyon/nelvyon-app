import type { ILlmClient } from "../../LlmClient";
import type { AnimacionInput, AnimacionOutput } from "./shared";
import { getDefaultAnimacionLlm, runAnimacionAgentCore } from "./shared";

const AGENT_ID = "animacion-email";

export class AnimacionEmailAgent {
  private static inst: AnimacionEmailAgent | undefined;

  static get instance(): AnimacionEmailAgent {
    if (!AnimacionEmailAgent.inst) AnimacionEmailAgent.inst = new AnimacionEmailAgent();
    return AnimacionEmailAgent.inst;
  }

  static reset(): void {
    AnimacionEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAnimacionLlm();
  }

  async run(input: AnimacionInput): Promise<AnimacionOutput> {
    const eliteRole = "Eres **Animación Email** — outreach creativo.";
    const mission = "Diseña **email outreach a agencias y productoras** con reels adjuntos y seguimiento.";
    const fewShot =
      '{"result":"Email outreach agencias + productoras VFX","score":90,"recommendations":["Cold con reel","Follow-up 5d"]}';
    return runAnimacionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAnimacionEmailAgent(): AnimacionEmailAgent {
  return AnimacionEmailAgent.instance;
}

export function resetAnimacionEmailAgentForTests(): void {
  AnimacionEmailAgent.reset();
}
