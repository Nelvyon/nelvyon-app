import type { ILlmClient } from "../../LlmClient";
import type { ContabilidadInput, ContabilidadOutput } from "./shared";
import { getDefaultContabilidadLlm, runContabilidadAgentCore } from "./shared";

const AGENT_ID = "contabilidad-reconciliacion";

export class ReconciliacionAgent {
  private static inst: ReconciliacionAgent | undefined;

  static get instance(): ReconciliacionAgent {
    if (!ReconciliacionAgent.inst) ReconciliacionAgent.inst = new ReconciliacionAgent();
    return ReconciliacionAgent.inst;
  }

  static reset(): void {
    ReconciliacionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContabilidadLlm();
  }

  async run(input: ContabilidadInput): Promise<ContabilidadOutput> {
    const eliteRole = "Eres **Reconciliación** — conciliación bancaria.";
    const mission =
      "Ejecuta **conciliación bancaria 100% automática** y **detección de discrepancias** sin intervención.";
    const fewShot =
      '{"content":"Conciliación: 100% auto, discrepancias, sin intervención","score":96,"highlights":["100% auto","Discrepancias"],"metrics":["Reconciliation rate"]}';
    return runContabilidadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getReconciliacionAgent(): ReconciliacionAgent {
  return ReconciliacionAgent.instance;
}

export function resetReconciliacionAgentForTests(): void {
  ReconciliacionAgent.reset();
}
