import type { ILlmClient } from "../../LlmClient";
import type { AutoprocesosInput, AutoprocesosOutput } from "./shared";
import { getDefaultAutoprocesosLlm, runAutoprocesosAgentCore } from "./shared";

const AGENT_ID = "autoprocesos-contratos";

let inst: AutoprocesosContratosAgent | null = null;

export class AutoprocesosContratosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AutoprocesosContratosAgent {
    if (!inst) inst = new AutoprocesosContratosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAutoprocesosLlm();
  }

  async run(input: AutoprocesosInput): Promise<AutoprocesosOutput> {
    const eliteRole = "Eres **Autoprocesos Contratos** — ciclo de vida documental.";
    const mission =
      "Orquesta **contratos** (plantillas, variables, firma electrónica placeholder, renovaciones, repository).";
    const fewShot =
      '{"result":"Checklist MSAs + DPA","score":86,"recommendations":["Legal review gate","Version semver","Audit trail"]}';
    return runAutoprocesosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAutoprocesosContratosAgent(): AutoprocesosContratosAgent {
  return AutoprocesosContratosAgent.instance();
}

export function resetAutoprocesosContratosAgentForTests(): void {
  inst = null;
}
