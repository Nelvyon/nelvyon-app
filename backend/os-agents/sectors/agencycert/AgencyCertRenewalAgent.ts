import type { ILlmClient } from "../../LlmClient";
import type { AgencyCertInput, AgencyCertOutput } from "./shared";
import { getDefaultAgencyCertLlm, runAgencyCertAgentCore } from "./shared";

const AGENT_ID = "agencycert-renewal";

export class AgencyCertRenewalAgent {
  private static inst: AgencyCertRenewalAgent | undefined;

  static get instance(): AgencyCertRenewalAgent {
    if (!AgencyCertRenewalAgent.inst) AgencyCertRenewalAgent.inst = new AgencyCertRenewalAgent();
    return AgencyCertRenewalAgent.inst;
  }

  static reset(): void {
    AgencyCertRenewalAgent.inst = undefined;
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
        eliteRole: "ROLE: Annual policy engine; sin intervención humana por defecto.",
        mission:
          "Gestiona renovaciones anuales automáticas: re-evalúa métricas y **renueva** certificación o **degrada** nivel; actualiza expires_at.",
        fewShotExample:
          '{"content":"Año 2: NPS cayó → Gold→Silver.","score":91,"highlights":["Auto","Degradación"],"metrics":["nuevo nivel"]}',
      },
      input,
      0.1,
    );
  }
}

export function getAgencyCertRenewalAgent(): AgencyCertRenewalAgent {
  return AgencyCertRenewalAgent.instance;
}

export function resetAgencyCertRenewalAgentForTests(): void {
  AgencyCertRenewalAgent.reset();
}
