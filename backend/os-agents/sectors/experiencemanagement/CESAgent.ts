import type { ILlmClient } from "../../LlmClient";
import type { ExperienceManagementInput, ExperienceManagementOutput } from "./shared";
import { getDefaultExperienceManagementLlm, runExperienceManagementAgentCore } from "./shared";

const AGENT_ID = "experiencemanagement-ces";

export class CESAgent {
  private static inst: CESAgent | undefined;

  static get instance(): CESAgent {
    if (!CESAgent.inst) CESAgent.inst = new CESAgent();
    return CESAgent.inst;
  }

  static reset(): void {
    CESAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultExperienceManagementLlm();
  }

  async run(input: ExperienceManagementInput): Promise<ExperienceManagementOutput> {
    const eliteRole = "Eres **CES** — Customer Effort Score por touchpoint.";
    const mission =
      "Mide **CES por touchpoint** y detecta **fricciones del journey** para reducir esfuerzo del cliente.";
    const fewShot =
      '{"content":"CES: por touchpoint, fricciones journey, esfuerzo cliente","score":89,"highlights":["Touchpoint CES","Fricciones"],"metrics":["CES score"]}';
    return runExperienceManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getCESAgent(): CESAgent {
  return CESAgent.instance;
}

export function resetCESAgentForTests(): void {
  CESAgent.reset();
}
