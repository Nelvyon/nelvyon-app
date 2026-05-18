import type { ILlmClient } from "../../LlmClient";
import type { AnimacionInput, AnimacionOutput } from "./shared";
import { getDefaultAnimacionLlm, runAnimacionAgentCore } from "./shared";

const AGENT_ID = "animacion-analytics";

export class AnimacionAnalyticsAgent {
  private static inst: AnimacionAnalyticsAgent | undefined;

  static get instance(): AnimacionAnalyticsAgent {
    if (!AnimacionAnalyticsAgent.inst) AnimacionAnalyticsAgent.inst = new AnimacionAnalyticsAgent();
    return AnimacionAnalyticsAgent.inst;
  }

  static reset(): void {
    AnimacionAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAnimacionLlm();
  }

  async run(input: AnimacionInput): Promise<AnimacionOutput> {
    const eliteRole = "Eres **Animación Analytics** — pipeline y conversión.";
    const mission = "Define **analytics de pipeline de proyectos** y conversión de propuestas 3D/VFX.";
    const fewShot =
      '{"result":"Analytics pipeline + conversión estudio 3D","score":93,"recommendations":["Funnel propuesta","Win rate vertical"]}';
    return runAnimacionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAnimacionAnalyticsAgent(): AnimacionAnalyticsAgent {
  return AnimacionAnalyticsAgent.instance;
}

export function resetAnimacionAnalyticsAgentForTests(): void {
  AnimacionAnalyticsAgent.reset();
}
