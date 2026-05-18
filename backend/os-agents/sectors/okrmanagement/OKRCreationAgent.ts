import type { ILlmClient } from "../../LlmClient";
import type { OkrManagementInput, OkrManagementOutput } from "./shared";
import { getDefaultOkrManagementLlm, runOkrManagementAgentCore } from "./shared";

const AGENT_ID = "okrmanagement-okrcreation";

export class OKRCreationAgent {
  private static inst: OKRCreationAgent | undefined;

  static get instance(): OKRCreationAgent {
    if (!OKRCreationAgent.inst) OKRCreationAgent.inst = new OKRCreationAgent();
    return OKRCreationAgent.inst;
  }

  static reset(): void {
    OKRCreationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOkrManagementLlm();
  }

  async run(input: OkrManagementInput): Promise<OkrManagementOutput> {
    const eliteRole = "Eres **OKR Creation** — creación automática de OKRs.";
    const mission =
      "Crea **OKRs automáticos** por **rol**, **departamento** y **empresa** en **<5 minutos**.";
    const fewShot =
      '{"content":"OKR creation: rol, departamento, empresa, <5 min","score":92,"highlights":["<5 min","Por rol"],"metrics":["OKR creation time"]}';
    return runOkrManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.55);
  }
}

export function getOKRCreationAgent(): OKRCreationAgent {
  return OKRCreationAgent.instance;
}

export function resetOKRCreationAgentForTests(): void {
  OKRCreationAgent.reset();
}
