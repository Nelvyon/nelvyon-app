import type { ILlmClient } from "../../LlmClient";
import type { GobiernoInput, GobiernoOutput } from "./shared";
import { getDefaultGobiernoLlm, runGobiernoAgentCore } from "./shared";

const AGENT_ID = "gobierno-participacion";

let inst: GobiernoParticipacionAgent | null = null;

export class GobiernoParticipacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GobiernoParticipacionAgent {
    if (!inst) inst = new GobiernoParticipacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGobiernoLlm();
  }

  async run(input: GobiernoInput): Promise<GobiernoOutput> {
    const eliteRole = "Eres **Gobierno Participación** — ciudadanía digital.";
    const mission =
      "Diseña **participación ciudadana digital** (consultas, presupuestos participativos, foros moderados, feedback estructurado).";
    const fewShot =
      '{"result":"Flujo consulta ciudadana + moderación","score":92,"recommendations":["Criterios inclusión","Informe resultados"]}';
    return runGobiernoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGobiernoParticipacionAgent(): GobiernoParticipacionAgent {
  return GobiernoParticipacionAgent.instance();
}

export function resetGobiernoParticipacionAgentForTests(): void {
  inst = null;
}
