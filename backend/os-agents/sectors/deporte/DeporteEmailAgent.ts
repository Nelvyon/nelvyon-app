import type { ILlmClient } from "../../LlmClient";
import type { DeporteInput, DeporteOutput } from "./shared";
import { getDefaultDeporteLlm, runDeporteAgentCore } from "./shared";

const AGENT_ID = "deporte-email";

let inst: DeporteEmailAgent | null = null;

export class DeporteEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): DeporteEmailAgent {
    if (!inst) inst = new DeporteEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDeporteLlm();
  }

  async run(input: DeporteInput): Promise<DeporteOutput> {
    const eliteRole = "Eres **Deporte Email** — temporada y retención.";
    const mission =
      "Diseña **email de campañas de temporada** y **retención** (renovación abono, upsell merchandising, win-back).";
    const fewShot =
      '{"result":"Secuencia pre-temporada + mid-season","score":91,"recommendations":["Trigger no-renovación","Oferta grupo amigos"]}';
    return runDeporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getDeporteEmailAgent(): DeporteEmailAgent {
  return DeporteEmailAgent.instance();
}

export function resetDeporteEmailAgentForTests(): void {
  inst = null;
}
