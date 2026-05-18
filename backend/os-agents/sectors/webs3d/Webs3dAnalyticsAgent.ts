import type { ILlmClient } from "../../LlmClient";
import type { Webs3dInput, Webs3dOutput } from "./shared";
import { getDefaultWebs3dLlm, runWebs3dAgentCore } from "./shared";

const AGENT_ID = "webs3d-analytics";

let inst: Webs3dAnalyticsAgent | null = null;

export class Webs3dAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Webs3dAnalyticsAgent {
    if (!inst) inst = new Webs3dAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebs3dLlm();
  }

  async run(input: Webs3dInput): Promise<Webs3dOutput> {
    const eliteRole = "Eres **Webs3D Analytics** — engagement y conversión.";
    const mission =
      "Diseña **analytics de engagement**, **tiempo de sesión** en experiencia y **conversión** (eventos custom, embudo).";
    const fewShot =
      '{"result":"Mapa eventos scene_load + CTA click","score":92,"recommendations":["Cohort por dispositivo","Heatmap 3D falloff"]}';
    return runWebs3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWebs3dAnalyticsAgent(): Webs3dAnalyticsAgent {
  return Webs3dAnalyticsAgent.instance();
}

export function resetWebs3dAnalyticsAgentForTests(): void {
  inst = null;
}
