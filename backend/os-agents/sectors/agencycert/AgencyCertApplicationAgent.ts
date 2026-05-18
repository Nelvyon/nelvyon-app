import type { ILlmClient } from "../../LlmClient";
import type { AgencyCertInput, AgencyCertOutput } from "./shared";
import { getDefaultAgencyCertLlm, runAgencyCertAgentCore } from "./shared";

const AGENT_ID = "agencycert-application";

export class AgencyCertApplicationAgent {
  private static inst: AgencyCertApplicationAgent | undefined;

  static get instance(): AgencyCertApplicationAgent {
    if (!AgencyCertApplicationAgent.inst) AgencyCertApplicationAgent.inst = new AgencyCertApplicationAgent();
    return AgencyCertApplicationAgent.inst;
  }

  static reset(): void {
    AgencyCertApplicationAgent.inst = undefined;
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
        eliteRole: "ROLE: Intake partner program; checklist documentación.",
        mission:
          "Procesa solicitudes de certificación: datos agencia, países, portfolio, cumplimiento previo a evaluator.",
        fewShotExample:
          '{"content":"Solicitud completa; pendiente evaluator.","score":88,"highlights":["KYC partner","Referencias"],"metrics":["Estado: submitted"]}',
      },
      input,
      0.2,
    );
  }
}

export function getAgencyCertApplicationAgent(): AgencyCertApplicationAgent {
  return AgencyCertApplicationAgent.instance;
}

export function resetAgencyCertApplicationAgentForTests(): void {
  AgencyCertApplicationAgent.reset();
}
