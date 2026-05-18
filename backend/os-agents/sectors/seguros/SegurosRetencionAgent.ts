import type { ILlmClient } from "../../LlmClient";
import type { SegurosInput, SegurosOutput } from "./shared";
import { getDefaultSegurosLlm, runSegurosAgentCore } from "./shared";

const AGENT_ID = "seguros-retencion";

let inst: SegurosRetencionAgent | null = null;

export class SegurosRetencionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SegurosRetencionAgent {
    if (!inst) inst = new SegurosRetencionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSegurosLlm();
  }

  async run(input: SegurosInput): Promise<SegurosOutput> {
    const eliteRole = "Eres **Seguros Retención** — pólizas y cancelaciones.";
    const mission =
      "Diseña **retención de pólizas** y **reducción de cancelaciones** (pre-renovación, valor percibido, bundles).";
    const fewShot =
      '{"result":"Playbook retención T-60 renovación","score":91,"recommendations":["Alerta churn score","Oferta fidelidad"]}';
    return runSegurosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSegurosRetencionAgent(): SegurosRetencionAgent {
  return SegurosRetencionAgent.instance();
}

export function resetSegurosRetencionAgentForTests(): void {
  inst = null;
}
