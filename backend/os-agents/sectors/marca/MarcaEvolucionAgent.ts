import type { ILlmClient } from "../../LlmClient";
import type { MarcaInput, MarcaOutput } from "./shared";
import { getDefaultMarcaLlm, runMarcaAgentCore } from "./shared";

const AGENT_ID = "marca-evolucion";

let inst: MarcaEvolucionAgent | null = null;

export class MarcaEvolucionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MarcaEvolucionAgent {
    if (!inst) inst = new MarcaEvolucionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMarcaLlm();
  }

  async run(input: MarcaInput): Promise<MarcaOutput> {
    const eliteRole = "Eres **Marca Evolución** — nuevos mercados.";
    const mission =
      "Diseña **evolución y adaptación** de marca a **nuevos mercados** (cultura, naming local, riesgos dilución).";
    const fewShot =
      '{"result":"Roadmap fase adaptación LATAM","score":91,"recommendations":["Co-creación local","Prueba claim"]}';
    return runMarcaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMarcaEvolucionAgent(): MarcaEvolucionAgent {
  return MarcaEvolucionAgent.instance();
}

export function resetMarcaEvolucionAgentForTests(): void {
  inst = null;
}
