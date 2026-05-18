import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCrmInput, SuperiorCrmOutput } from "./shared";
import { getDefaultSuperiorCrmLlm, runSuperiorCrmAgentCore } from "./shared";

const AGENT_ID = "superiorcrm-pipeline";

export class SuperiorCrmPipelineAgent {
  private static inst: SuperiorCrmPipelineAgent | undefined;

  static get instance(): SuperiorCrmPipelineAgent {
    if (!SuperiorCrmPipelineAgent.inst) SuperiorCrmPipelineAgent.inst = new SuperiorCrmPipelineAgent();
    return SuperiorCrmPipelineAgent.inst;
  }

  static reset(): void {
    SuperiorCrmPipelineAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCrmLlm();
  }

  async run(input: SuperiorCrmInput): Promise<SuperiorCrmOutput> {
    const eliteRole = "Eres **SuperiorCrm Pipeline Manager** — forecast y deals estancados.";
    const mission =
      "Gestiona **pipeline visual**, **forecast de ingresos** y **detección de deals estancados**; win rate **>35%**.";
    const fewShot =
      '{"content":"Pipeline board, revenue forecast, stalled deal alerts","score":88,"highlights":[">35% win rate","Stalled deals"],"metrics":["Pipeline value"]}';
    return runSuperiorCrmAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorCrmPipelineAgent(): SuperiorCrmPipelineAgent {
  return SuperiorCrmPipelineAgent.instance;
}

export function resetSuperiorCrmPipelineAgentForTests(): void {
  SuperiorCrmPipelineAgent.reset();
}
