import type { ILlmClient } from "../../LlmClient";
import type { AnimacionInput, AnimacionOutput } from "./shared";
import { getDefaultAnimacionLlm, runAnimacionAgentCore } from "./shared";

const AGENT_ID = "animacion-seo";

export class AnimacionSEOAgent {
  private static inst: AnimacionSEOAgent | undefined;

  static get instance(): AnimacionSEOAgent {
    if (!AnimacionSEOAgent.inst) AnimacionSEOAgent.inst = new AnimacionSEOAgent();
    return AnimacionSEOAgent.inst;
  }

  static reset(): void {
    AnimacionSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAnimacionLlm();
  }

  async run(input: AnimacionInput): Promise<AnimacionOutput> {
    const eliteRole = "Eres **Animación SEO** — estudios y VFX.";
    const mission = "Diseña **SEO para estudios de animación y VFX** con landings por vertical y casos.";
    const fewShot =
      '{"result":"SEO estudio animación + VFX","score":92,"recommendations":["Landings CGI","Blog breakdowns"]}';
    return runAnimacionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAnimacionSEOAgent(): AnimacionSEOAgent {
  return AnimacionSEOAgent.instance;
}

export function resetAnimacionSEOAgentForTests(): void {
  AnimacionSEOAgent.reset();
}
