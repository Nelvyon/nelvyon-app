import type { ILlmClient } from "../../LlmClient";
import type { MarcaInput, MarcaOutput } from "./shared";
import { getDefaultMarcaLlm, runMarcaAgentCore } from "./shared";

const AGENT_ID = "marca-consistencia";

let inst: MarcaConsistenciaAgent | null = null;

export class MarcaConsistenciaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MarcaConsistenciaAgent {
    if (!inst) inst = new MarcaConsistenciaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMarcaLlm();
  }

  async run(input: MarcaInput): Promise<MarcaOutput> {
    const eliteRole = "Eres **Marca Consistencia** — auditoría multicanal.";
    const mission =
      "Diseña **auditoría de consistencia** de marca en **todos los canales** (web, social, packaging, paid).";
    const fewShot =
      '{"result":"Checklist 40 ítems + heatmap riesgos","score":90,"recommendations":["Logo mínimo","Color fuera guía"]}';
    return runMarcaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMarcaConsistenciaAgent(): MarcaConsistenciaAgent {
  return MarcaConsistenciaAgent.instance();
}

export function resetMarcaConsistenciaAgentForTests(): void {
  inst = null;
}
