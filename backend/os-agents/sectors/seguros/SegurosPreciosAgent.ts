import type { ILlmClient } from "../../LlmClient";
import type { SegurosInput, SegurosOutput } from "./shared";
import { getDefaultSegurosLlm, runSegurosAgentCore } from "./shared";

const AGENT_ID = "seguros-precios";

let inst: SegurosPreciosAgent | null = null;

export class SegurosPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SegurosPreciosAgent {
    if (!inst) inst = new SegurosPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSegurosLlm();
  }

  async run(input: SegurosInput): Promise<SegurosOutput> {
    const eliteRole = "Eres **Seguros Precios** — comparativo y valor.";
    const mission =
      "Diseña **pricing comparativo** y **argumentario de valor** (primas, franquicias, exclusiones resumidas) sin promesas de cobertura.";
    const fewShot =
      '{"result":"Tabla comparativa + storytelling valor","score":92,"recommendations":["Primera franquicia clara","Upsell asistencia"]}';
    return runSegurosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSegurosPreciosAgent(): SegurosPreciosAgent {
  return SegurosPreciosAgent.instance();
}

export function resetSegurosPreciosAgentForTests(): void {
  inst = null;
}
