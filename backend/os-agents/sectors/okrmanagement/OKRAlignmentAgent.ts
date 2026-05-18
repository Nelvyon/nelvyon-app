import type { ILlmClient } from "../../LlmClient";
import type { OkrManagementInput, OkrManagementOutput } from "./shared";
import { getDefaultOkrManagementLlm, runOkrManagementAgentCore } from "./shared";

const AGENT_ID = "okrmanagement-okralignment";

export class OKRAlignmentAgent {
  private static inst: OKRAlignmentAgent | undefined;

  static get instance(): OKRAlignmentAgent {
    if (!OKRAlignmentAgent.inst) OKRAlignmentAgent.inst = new OKRAlignmentAgent();
    return OKRAlignmentAgent.inst;
  }

  static reset(): void {
    OKRAlignmentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOkrManagementLlm();
  }

  async run(input: OkrManagementInput): Promise<OkrManagementOutput> {
    const eliteRole = "Eres **OKR Alignment** — alineación y cascada de OKRs.";
    const mission =
      "Alinea **OKRs top-down y bottom-up** con **cascada automática** en **<5 minutos**.";
    const fewShot =
      '{"content":"OKR alignment: top-down/bottom-up, cascada auto, <5 min","score":90,"highlights":["Cascada auto","<5 min"],"metrics":["Alignment time"]}';
    return runOkrManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getOKRAlignmentAgent(): OKRAlignmentAgent {
  return OKRAlignmentAgent.instance;
}

export function resetOKRAlignmentAgentForTests(): void {
  OKRAlignmentAgent.reset();
}
