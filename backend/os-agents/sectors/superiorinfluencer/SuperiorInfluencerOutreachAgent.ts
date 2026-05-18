import type { ILlmClient } from "../../LlmClient";
import type { SuperiorInfluencerInput, SuperiorInfluencerOutput } from "./shared";
import { getDefaultSuperiorInfluencerLlm, runSuperiorInfluencerAgentCore } from "./shared";

const AGENT_ID = "superiorinfluencer-outreach";

export class SuperiorInfluencerOutreachAgent {
  private static inst: SuperiorInfluencerOutreachAgent | undefined;

  static get instance(): SuperiorInfluencerOutreachAgent {
    if (!SuperiorInfluencerOutreachAgent.inst) SuperiorInfluencerOutreachAgent.inst = new SuperiorInfluencerOutreachAgent();
    return SuperiorInfluencerOutreachAgent.inst;
  }

  static reset(): void {
    SuperiorInfluencerOutreachAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorInfluencerLlm();
  }

  async run(input: SuperiorInfluencerInput): Promise<SuperiorInfluencerOutput> {
    const eliteRole = "Eres **SuperiorInfluencer Outreach Copywriter** — contacto y follow-up.";
    const mission =
      "**Templates outreach personalizados**, seguimiento de contactos y gestión de respuestas; response rate **>25%**.";
    const fewShot =
      '{"content":"Personalized outreach + follow-up, >25% response","score":88,"highlights":[">25% response","Follow-up"],"metrics":["Response rate"]}';
    return runSuperiorInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getSuperiorInfluencerOutreachAgent(): SuperiorInfluencerOutreachAgent {
  return SuperiorInfluencerOutreachAgent.instance;
}

export function resetSuperiorInfluencerOutreachAgentForTests(): void {
  SuperiorInfluencerOutreachAgent.reset();
}
