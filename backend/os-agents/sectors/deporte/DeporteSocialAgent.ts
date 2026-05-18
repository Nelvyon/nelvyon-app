import type { ILlmClient } from "../../LlmClient";
import type { DeporteInput, DeporteOutput } from "./shared";
import { getDefaultDeporteLlm, runDeporteAgentCore } from "./shared";

const AGENT_ID = "deporte-social";

let inst: DeporteSocialAgent | null = null;

export class DeporteSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): DeporteSocialAgent {
    if (!inst) inst = new DeporteSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDeporteLlm();
  }

  async run(input: DeporteInput): Promise<DeporteOutput> {
    const eliteRole = "Eres **Deporte Social** — fans y streaming.";
    const mission =
      "Diseña **social media** para **engagement de fans** y **contenido alrededor de streaming** (clips, highlights, co-stream).";
    const fewShot =
      '{"result":"Calendario matchday + post-live","score":90,"recommendations":["Poll MVP","Clip vertical 9:16"]}';
    return runDeporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getDeporteSocialAgent(): DeporteSocialAgent {
  return DeporteSocialAgent.instance();
}

export function resetDeporteSocialAgentForTests(): void {
  inst = null;
}
