import type { ILlmClient } from "../../LlmClient";
import type { DeporteInput, DeporteOutput } from "./shared";
import { getDefaultDeporteLlm, runDeporteAgentCore } from "./shared";

const AGENT_ID = "deporte-patrocinios";

let inst: DeportePatrociniosAgent | null = null;

export class DeportePatrociniosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): DeportePatrociniosAgent {
    if (!inst) inst = new DeportePatrociniosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDeporteLlm();
  }

  async run(input: DeporteInput): Promise<DeporteOutput> {
    const eliteRole = "Eres **Deporte Patrocinios** — sponsors y partners.";
    const mission =
      "Diseña **captación de patrocinadores y partners** (packs naming, hospitality, activaciones estadio/stream).";
    const fewShot =
      '{"result":"Dossier patrocinio + niveles","score":92,"recommendations":["KPI visibilidad marca","Matchday B2B"]}';
    return runDeporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getDeportePatrociniosAgent(): DeportePatrociniosAgent {
  return DeportePatrociniosAgent.instance();
}

export function resetDeportePatrociniosAgentForTests(): void {
  inst = null;
}
