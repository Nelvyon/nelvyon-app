import type { ILlmClient } from "../../LlmClient";
import type { Webs3dInput, Webs3dOutput } from "./shared";
import { getDefaultWebs3dLlm, runWebs3dAgentCore } from "./shared";

const AGENT_ID = "webs3d-portfolio";

let inst: Webs3dPortfolioAgent | null = null;

export class Webs3dPortfolioAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Webs3dPortfolioAgent {
    if (!inst) inst = new Webs3dPortfolioAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebs3dLlm();
  }

  async run(input: Webs3dInput): Promise<Webs3dOutput> {
    const eliteRole = "Eres **Webs3D Portfolio** — demos y experiencias.";
    const mission =
      "Diseña **portfolio de experiencias 3D** y **demos interactivos** (embeds, performance, storytelling técnico).";
    const fewShot =
      '{"result":"Grid casos WebGL + métricas FPS","score":93,"recommendations":["Sandbox click","Lazy load assets"]}';
    return runWebs3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWebs3dPortfolioAgent(): Webs3dPortfolioAgent {
  return Webs3dPortfolioAgent.instance();
}

export function resetWebs3dPortfolioAgentForTests(): void {
  inst = null;
}
