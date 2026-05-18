import type { ILlmClient } from "../../LlmClient";
import type { Webs3dInput, Webs3dOutput } from "./shared";
import { getDefaultWebs3dLlm, runWebs3dAgentCore } from "./shared";

const AGENT_ID = "webs3d-reviews";

let inst: Webs3dReviewsAgent | null = null;

export class Webs3dReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Webs3dReviewsAgent {
    if (!inst) inst = new Webs3dReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebs3dLlm();
  }

  async run(input: Webs3dInput): Promise<Webs3dOutput> {
    const eliteRole = "Eres **Webs3D Reviews** — casos y prueba técnica.";
    const mission =
      "Diseña **casos de éxito** y **prueba social técnica** (métricas, stack, testimonios CTO/creativos).";
    const fewShot =
      '{"result":"One-pager caso + quote técnico","score":90,"recommendations":["Badge Lighthouse","Video cliente B2B"]}';
    return runWebs3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWebs3dReviewsAgent(): Webs3dReviewsAgent {
  return Webs3dReviewsAgent.instance();
}

export function resetWebs3dReviewsAgentForTests(): void {
  inst = null;
}
