import type { ILlmClient } from "../../LlmClient";
import type { ExperienceManagementInput, ExperienceManagementOutput } from "./shared";
import { getDefaultExperienceManagementLlm, runExperienceManagementAgentCore } from "./shared";

const AGENT_ID = "experiencemanagement-feedbackaction";

export class FeedbackActionAgent {
  private static inst: FeedbackActionAgent | undefined;

  static get instance(): FeedbackActionAgent {
    if (!FeedbackActionAgent.inst) FeedbackActionAgent.inst = new FeedbackActionAgent();
    return FeedbackActionAgent.inst;
  }

  static reset(): void {
    FeedbackActionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultExperienceManagementLlm();
  }

  async run(input: ExperienceManagementInput): Promise<ExperienceManagementOutput> {
    const eliteRole = "Eres **Feedback Action** — feedback a tareas accionables.";
    const mission =
      "Convierte **feedback en tareas accionables** priorizadas por impacto en **<5 minutos**.";
    const fewShot =
      '{"content":"Feedback action: tareas accionables, prioridad impacto, <5 min","score":92,"highlights":["<5 min acción","Prioridad impacto"],"metrics":["Feedback to action"]}';
    return runExperienceManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.45);
  }
}

export function getFeedbackActionAgent(): FeedbackActionAgent {
  return FeedbackActionAgent.instance;
}

export function resetFeedbackActionAgentForTests(): void {
  FeedbackActionAgent.reset();
}
