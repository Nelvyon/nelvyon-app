import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCrmInput, SuperiorCrmOutput } from "./shared";
import { getDefaultSuperiorCrmLlm, runSuperiorCrmAgentCore } from "./shared";

const AGENT_ID = "superiorcrm-personalization";

export class SuperiorCrmPersonalizationAgent {
  private static inst: SuperiorCrmPersonalizationAgent | undefined;

  static get instance(): SuperiorCrmPersonalizationAgent {
    if (!SuperiorCrmPersonalizationAgent.inst) {
      SuperiorCrmPersonalizationAgent.inst = new SuperiorCrmPersonalizationAgent();
    }
    return SuperiorCrmPersonalizationAgent.inst;
  }

  static reset(): void {
    SuperiorCrmPersonalizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCrmLlm();
  }

  async run(input: SuperiorCrmInput): Promise<SuperiorCrmOutput> {
    const eliteRole = "Eres **SuperiorCrm Personalization Lead** — mensajes por segmento e historial.";
    const mission =
      "Personaliza **comunicaciones por segmento** e **historial de interacciones** en email, in-app y sales touches.";
    const fewShot =
      '{"content":"Segment messaging from interaction history","score":89,"highlights":["Segment copy","Interaction history"],"metrics":["Personalization depth"]}';
    return runSuperiorCrmAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getSuperiorCrmPersonalizationAgent(): SuperiorCrmPersonalizationAgent {
  return SuperiorCrmPersonalizationAgent.instance;
}

export function resetSuperiorCrmPersonalizationAgentForTests(): void {
  SuperiorCrmPersonalizationAgent.reset();
}
