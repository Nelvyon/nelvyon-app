import type { ILlmClient } from "../../LlmClient";
import type { ProteccionIpInput, ProteccionIpOutput } from "./shared";
import { getDefaultProteccionIpLlm, runProteccionIpAgentCore } from "./shared";

const AGENT_ID = "proteccionip-litigacion";

let inst: ProteccionIpLitigacionAgent | null = null;

export class ProteccionIpLitigacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ProteccionIpLitigacionAgent {
    if (!inst) inst = new ProteccionIpLitigacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProteccionIpLlm();
  }

  async run(input: ProteccionIpInput): Promise<ProteccionIpOutput> {
    const eliteRole = "Eres **Protección IP Litigación** — enforcement.";
    const mission =
      "Diseña **estrategia de litigación** y **enforcement IP** (cease & desist, medidas cautelares, foros).";
    const fewShot =
      '{"result":"Árbol decisión demanda vs negociación","score":90,"recommendations":["Cadena pruebas","Presupuesto fases"]}';
    return runProteccionIpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getProteccionIpLitigacionAgent(): ProteccionIpLitigacionAgent {
  return ProteccionIpLitigacionAgent.instance();
}

export function resetProteccionIpLitigacionAgentForTests(): void {
  inst = null;
}
