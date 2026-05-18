import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSocialMediaInput, SuperiorSocialMediaOutput } from "./shared";
import { getDefaultSuperiorSocialMediaLlm, runSuperiorSocialMediaAgentCore } from "./shared";

const AGENT_ID = "superiorsocialmedia-viral";

export class SuperiorSocialMediaViralAgent {
  private static inst: SuperiorSocialMediaViralAgent | undefined;

  static get instance(): SuperiorSocialMediaViralAgent {
    if (!SuperiorSocialMediaViralAgent.inst) SuperiorSocialMediaViralAgent.inst = new SuperiorSocialMediaViralAgent();
    return SuperiorSocialMediaViralAgent.inst;
  }

  static reset(): void {
    SuperiorSocialMediaViralAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSocialMediaLlm();
  }

  async run(input: SuperiorSocialMediaInput): Promise<SuperiorSocialMediaOutput> {
    const eliteRole =
      "Eres **SuperiorSocialMedia Viral Format Hunter** — reels/shorts y hooks 3s.";
    const mission =
      "Detecta **formatos virales**, optimiza **reels/shorts** y **hooks de los primeros 3 segundos**.";
    const fewShot =
      '{"content":"Viral format map, 3s hook scripts, Shorts optimized","score":93,"highlights":["3s hook","Viral format"],"metrics":["Hook score"]}';
    return runSuperiorSocialMediaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.9);
  }
}

export function getSuperiorSocialMediaViralAgent(): SuperiorSocialMediaViralAgent {
  return SuperiorSocialMediaViralAgent.instance;
}

export function resetSuperiorSocialMediaViralAgentForTests(): void {
  SuperiorSocialMediaViralAgent.reset();
}
