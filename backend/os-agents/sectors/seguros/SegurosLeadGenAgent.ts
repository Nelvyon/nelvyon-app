import type { ILlmClient } from "../../LlmClient";
import type { SegurosInput, SegurosOutput } from "./shared";
import { getDefaultSegurosLlm, runSegurosAgentCore } from "./shared";

const AGENT_ID = "seguros-lead-gen";

let inst: SegurosLeadGenAgent | null = null;

export class SegurosLeadGenAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SegurosLeadGenAgent {
    if (!inst) inst = new SegurosLeadGenAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSegurosLlm();
  }

  async run(input: SegurosInput): Promise<SegurosOutput> {
    const eliteRole = "Eres **Seguros Lead Gen** — leads cualificados por ramo.";
    const mission =
      "Diseña **captación de leads cualificados** (auto, hogar, salud, vida) con scoring y handoff a corredor o comparador.";
    const fewShot =
      '{"result":"Lead gen multi-ramo con scoring","score":93,"recommendations":["Formulario ramificado","CPL por canal"]}';
    return runSegurosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSegurosLeadGenAgent(): SegurosLeadGenAgent {
  return SegurosLeadGenAgent.instance();
}

export function resetSegurosLeadGenAgentForTests(): void {
  inst = null;
}
