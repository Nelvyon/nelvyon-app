import type { ILlmClient } from "../../LlmClient";
import type { Webs3dInput, Webs3dOutput } from "./shared";
import { getDefaultWebs3dLlm, runWebs3dAgentCore } from "./shared";

const AGENT_ID = "webs3d-social";

let inst: Webs3dSocialAgent | null = null;

export class Webs3dSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Webs3dSocialAgent {
    if (!inst) inst = new Webs3dSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebs3dLlm();
  }

  async run(input: Webs3dInput): Promise<Webs3dOutput> {
    const eliteRole = "Eres **Webs3D Social** — X, LinkedIn y YouTube.";
    const mission =
      "Diseña **showcase viral** en **Twitter/X**, **LinkedIn** y **YouTube** (clips técnicos, breakdowns, reels build).";
    const fewShot =
      '{"result":"Calendario clip 30s + thread técnico","score":90,"recommendations":["GIF loop WebGL","Short behind shader"]}';
    return runWebs3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWebs3dSocialAgent(): Webs3dSocialAgent {
  return Webs3dSocialAgent.instance();
}

export function resetWebs3dSocialAgentForTests(): void {
  inst = null;
}
