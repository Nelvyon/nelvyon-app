import type { ILlmClient } from "../../LlmClient";
import type { SegurosInput, SegurosOutput } from "./shared";
import { getDefaultSegurosLlm, runSegurosAgentCore } from "./shared";

const AGENT_ID = "seguros-email";

let inst: SegurosEmailAgent | null = null;

export class SegurosEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SegurosEmailAgent {
    if (!inst) inst = new SegurosEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSegurosLlm();
  }

  async run(input: SegurosInput): Promise<SegurosOutput> {
    const eliteRole = "Eres **Seguros Email** — nurturing y renovación.";
    const mission =
      "Diseña **email nurturing** por ramo y **cadencias de renovación automática** con triggers temporales.";
    const fewShot =
      '{"result":"Secuencia T-90/T-30 renovación","score":91,"recommendations":["Dynamic ramo","CTA revisión póliza"]}';
    return runSegurosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSegurosEmailAgent(): SegurosEmailAgent {
  return SegurosEmailAgent.instance();
}

export function resetSegurosEmailAgentForTests(): void {
  inst = null;
}
