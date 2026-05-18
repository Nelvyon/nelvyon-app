import type { ILlmClient } from "../../LlmClient";
import type { Webs3dInput, Webs3dOutput } from "./shared";
import { getDefaultWebs3dLlm, runWebs3dAgentCore } from "./shared";

const AGENT_ID = "webs3d-email";

let inst: Webs3dEmailAgent | null = null;

export class Webs3dEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): Webs3dEmailAgent {
    if (!inst) inst = new Webs3dEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWebs3dLlm();
  }

  async run(input: Webs3dInput): Promise<Webs3dOutput> {
    const eliteRole = "Eres **Webs3D Email** — outreach premium.";
    const mission =
      "Diseña **email outreach** a **marcas premium** y **agencias** (propuesta valor, demo link, seguimiento C-level).";
    const fewShot =
      '{"result":"Secuencia 3 mails AR producto","score":91,"recommendations":["Loom demo 90s","Case LCP mobile"]}';
    return runWebs3dAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getWebs3dEmailAgent(): Webs3dEmailAgent {
  return Webs3dEmailAgent.instance();
}

export function resetWebs3dEmailAgentForTests(): void {
  inst = null;
}
