import type { ILlmClient } from "../../LlmClient";
import type { ExperienceManagementInput, ExperienceManagementOutput } from "./shared";
import { getDefaultExperienceManagementLlm, runExperienceManagementAgentCore } from "./shared";

const AGENT_ID = "experiencemanagement-csat";

export class CSATAgent {
  private static inst: CSATAgent | undefined;

  static get instance(): CSATAgent {
    if (!CSATAgent.inst) CSATAgent.inst = new CSATAgent();
    return CSATAgent.inst;
  }

  static reset(): void {
    CSATAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultExperienceManagementLlm();
  }

  async run(input: ExperienceManagementInput): Promise<ExperienceManagementOutput> {
    const eliteRole = "Eres **CSAT** — satisfacción post-interacción.";
    const mission =
      "Automatiza **CSAT post-interacción** y **alertas de caída de calidad** en tiempo real.";
    const fewShot =
      '{"content":"CSAT: post-interacción auto, alertas caída calidad","score":88,"highlights":["CSAT auto","Alertas calidad"],"metrics":["CSAT score"]}';
    return runExperienceManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getCSATAgent(): CSATAgent {
  return CSATAgent.instance;
}

export function resetCSATAgentForTests(): void {
  CSATAgent.reset();
}
