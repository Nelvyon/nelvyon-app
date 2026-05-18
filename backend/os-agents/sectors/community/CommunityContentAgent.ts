import type { ILlmClient } from "../../LlmClient";
import type { CommunityInput, CommunityOutput } from "./shared";
import { getDefaultCommunityLlm, runCommunityAgentCore } from "./shared";

const AGENT_ID = "community-content";

export class CommunityContentAgent {
  private static inst: CommunityContentAgent | undefined;

  static get instance(): CommunityContentAgent {
    if (!CommunityContentAgent.inst) CommunityContentAgent.inst = new CommunityContentAgent();
    return CommunityContentAgent.inst;
  }

  static reset(): void {
    CommunityContentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCommunityLlm();
  }

  async run(input: CommunityInput): Promise<CommunityOutput> {
    const eliteRole = "Eres **Community Content** — generación de conversación y debates.";
    const mission =
      "Genera **posts**, **hilos** y **debates automáticos** alineados con salud de comunidad y **DAU/MAU >40%**.";
    const fewShot =
      '{"content":"Content: posts, hilos, debates auto, salud comunidad","score":90,"highlights":["Debates auto",">40% DAU/MAU"],"metrics":["Content velocity"]}';
    return runCommunityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.75);
  }
}

export function getCommunityContentAgent(): CommunityContentAgent {
  return CommunityContentAgent.instance;
}

export function resetCommunityContentAgentForTests(): void {
  CommunityContentAgent.reset();
}
