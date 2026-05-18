import type { ILlmClient } from "../../LlmClient";
import type { AutoprocesosInput, AutoprocesosOutput } from "./shared";
import { getDefaultAutoprocesosLlm, runAutoprocesosAgentCore } from "./shared";

const AGENT_ID = "autoprocesos-workflow";

let inst: AutoprocesosWorkflowAgent | null = null;

export class AutoprocesosWorkflowAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AutoprocesosWorkflowAgent {
    if (!inst) inst = new AutoprocesosWorkflowAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAutoprocesosLlm();
  }

  async run(input: AutoprocesosInput): Promise<AutoprocesosOutput> {
    const eliteRole = "Eres **Autoprocesos Workflow** — orquestación n8n/Zapier/Make.";
    const mission =
      "Diseña **workflows** (triggers, pasos, idempotencia, errores, logs, handoff humano cuando aplique).";
    const fewShot =
      '{"result":"Blueprint workflow lead→CRM","score":90,"recommendations":["Dead letter queue","Versionado","SLA por paso"]}';
    return runAutoprocesosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAutoprocesosWorkflowAgent(): AutoprocesosWorkflowAgent {
  return AutoprocesosWorkflowAgent.instance();
}

export function resetAutoprocesosWorkflowAgentForTests(): void {
  inst = null;
}
