import type { ILlmClient } from "../../LlmClient";
import type { AgencyCertInput, AgencyCertOutput } from "./shared";
import { getDefaultAgencyCertLlm, runAgencyCertAgentCore } from "./shared";

const AGENT_ID = "agencycert-training";

export class AgencyCertTrainingAgent {
  private static inst: AgencyCertTrainingAgent | undefined;

  static get instance(): AgencyCertTrainingAgent {
    if (!AgencyCertTrainingAgent.inst) AgencyCertTrainingAgent.inst = new AgencyCertTrainingAgent();
    return AgencyCertTrainingAgent.inst;
  }

  static reset(): void {
    AgencyCertTrainingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAgencyCertLlm();
  }

  async run(input: AgencyCertInput): Promise<AgencyCertOutput> {
    return runAgencyCertAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Academy designer; learning paths por Silver/Gold/Platinum.",
        mission:
          "Genera material de formación personalizado por nivel: módulos OS, playbooks venta, soporte L2, casos reales.",
        fewShotExample:
          '{"content":"Path Platinum: beta features + white-label legal.","score":87,"highlights":["Módulos 12h","Quiz"],"metrics":["Cert interna"]}',
      },
      input,
      0.4,
    );
  }
}

export function getAgencyCertTrainingAgent(): AgencyCertTrainingAgent {
  return AgencyCertTrainingAgent.instance;
}

export function resetAgencyCertTrainingAgentForTests(): void {
  AgencyCertTrainingAgent.reset();
}
