import type { ILlmClient } from "../../LlmClient";
import type { AnimacionInput, AnimacionOutput } from "./shared";
import { getDefaultAnimacionLlm, runAnimacionAgentCore } from "./shared";

const AGENT_ID = "animacion-portfolio";

export class AnimacionPortfolioAgent {
  private static inst: AnimacionPortfolioAgent | undefined;

  static get instance(): AnimacionPortfolioAgent {
    if (!AnimacionPortfolioAgent.inst) AnimacionPortfolioAgent.inst = new AnimacionPortfolioAgent();
    return AnimacionPortfolioAgent.inst;
  }

  static reset(): void {
    AnimacionPortfolioAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAnimacionLlm();
  }

  async run(input: AnimacionInput): Promise<AnimacionOutput> {
    const eliteRole = "Eres **Animación Portfolio** — 3D y showreel.";
    const mission = "Diseña **portfolio 3D** y **showreel interactivo** alineado a servicios y targets.";
    const fewShot =
      '{"result":"Portfolio 3D + showreel interactivo estudio VFX","score":93,"recommendations":["Reel 90s","Breakdowns CGI"]}';
    return runAnimacionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAnimacionPortfolioAgent(): AnimacionPortfolioAgent {
  return AnimacionPortfolioAgent.instance;
}

export function resetAnimacionPortfolioAgentForTests(): void {
  AnimacionPortfolioAgent.reset();
}
