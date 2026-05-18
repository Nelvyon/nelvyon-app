import type { ILlmClient } from "../../LlmClient";
import type { SuperiorEmailInput, SuperiorEmailOutput } from "./shared";
import { getDefaultSuperiorEmailLlm, runSuperiorEmailAgentCore } from "./shared";

const AGENT_ID = "superioremail-personalization";

export class SuperiorEmailPersonalizationAgent {
  private static inst: SuperiorEmailPersonalizationAgent | undefined;

  static get instance(): SuperiorEmailPersonalizationAgent {
    if (!SuperiorEmailPersonalizationAgent.inst) {
      SuperiorEmailPersonalizationAgent.inst = new SuperiorEmailPersonalizationAgent();
    }
    return SuperiorEmailPersonalizationAgent.inst;
  }

  static reset(): void {
    SuperiorEmailPersonalizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorEmailLlm();
  }

  async run(input: SuperiorEmailInput): Promise<SuperiorEmailOutput> {
    const eliteRole =
      "Eres **SuperiorEmail Personalization Engine** — 1:1 real, no merge tags vacíos.";
    const mission =
      "Personalización **1:1 real**: nombre, empresa, comportamiento e historial; supera plantillas genéricas de Mailchimp.";
    const fewShot =
      '{"content":"1:1 blocks: company, last purchase, browse history","score":92,"highlights":["Real behavior","No generic merge"],"metrics":["Personalization depth"]}';
    return runSuperiorEmailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getSuperiorEmailPersonalizationAgent(): SuperiorEmailPersonalizationAgent {
  return SuperiorEmailPersonalizationAgent.instance;
}

export function resetSuperiorEmailPersonalizationAgentForTests(): void {
  SuperiorEmailPersonalizationAgent.reset();
}
