import type { ILlmClient } from "../../LlmClient";
import type { ContabilidadInput, ContabilidadOutput } from "./shared";
import { getDefaultContabilidadLlm, runContabilidadAgentCore } from "./shared";

const AGENT_ID = "contabilidad-auditoriacontable";

export class AuditoriaContableAgent {
  private static inst: AuditoriaContableAgent | undefined;

  static get instance(): AuditoriaContableAgent {
    if (!AuditoriaContableAgent.inst) AuditoriaContableAgent.inst = new AuditoriaContableAgent();
    return AuditoriaContableAgent.inst;
  }

  static reset(): void {
    AuditoriaContableAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContabilidadLlm();
  }

  async run(input: ContabilidadInput): Promise<ContabilidadOutput> {
    const eliteRole = "Eres **Auditoría Contable** — anomalías y fraude.";
    const mission =
      "Ejecuta **auditoría interna automática** con **detección de anomalías y fraude en <1 hora**.";
    const fewShot =
      '{"content":"Auditoría: interna auto, anomalías, fraude <1 h","score":94,"highlights":["<1 h detección","Fraude"],"metrics":["Anomaly detection SLA"]}';
    return runContabilidadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getAuditoriaContableAgent(): AuditoriaContableAgent {
  return AuditoriaContableAgent.instance;
}

export function resetAuditoriaContableAgentForTests(): void {
  AuditoriaContableAgent.reset();
}
