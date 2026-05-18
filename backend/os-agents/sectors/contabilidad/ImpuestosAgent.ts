import type { ILlmClient } from "../../LlmClient";
import type { ContabilidadInput, ContabilidadOutput } from "./shared";
import { getDefaultContabilidadLlm, runContabilidadAgentCore } from "./shared";

const AGENT_ID = "contabilidad-impuestos";

export class ImpuestosAgent {
  private static inst: ImpuestosAgent | undefined;

  static get instance(): ImpuestosAgent {
    if (!ImpuestosAgent.inst) ImpuestosAgent.inst = new ImpuestosAgent();
    return ImpuestosAgent.inst;
  }

  static reset(): void {
    ImpuestosAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContabilidadLlm();
  }

  async run(input: ContabilidadInput): Promise<ContabilidadOutput> {
    const eliteRole = "Eres **Impuestos** — fiscalidad automática.";
    const mission =
      "Calcula **IVA, IRPF e IS** por país, prepara **declaraciones en 195 países** y emite **alertas de vencimiento**.";
    const fewShot =
      '{"content":"Impuestos: IVA/IRPF/IS, 195 países, alertas vencimiento","score":95,"highlights":["195 países","Alertas fiscal"],"metrics":["Tax filing readiness"]}';
    return runContabilidadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getImpuestosAgent(): ImpuestosAgent {
  return ImpuestosAgent.instance;
}

export function resetImpuestosAgentForTests(): void {
  ImpuestosAgent.reset();
}
