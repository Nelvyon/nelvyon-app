import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSocialMediaInput, SuperiorSocialMediaOutput } from "./shared";
import { getDefaultSuperiorSocialMediaLlm, runSuperiorSocialMediaAgentCore } from "./shared";

const AGENT_ID = "superiorsocialmedia-listening";

export class SuperiorSocialMediaListeningAgent {
  private static inst: SuperiorSocialMediaListeningAgent | undefined;

  static get instance(): SuperiorSocialMediaListeningAgent {
    if (!SuperiorSocialMediaListeningAgent.inst) {
      SuperiorSocialMediaListeningAgent.inst = new SuperiorSocialMediaListeningAgent();
    }
    return SuperiorSocialMediaListeningAgent.inst;
  }

  static reset(): void {
    SuperiorSocialMediaListeningAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSocialMediaLlm();
  }

  async run(input: SuperiorSocialMediaInput): Promise<SuperiorSocialMediaOutput> {
    const eliteRole =
      "Eres **SuperiorSocialMedia Listening & Crisis Radar** — menciones y tendencias.";
    const mission =
      "Monitorea **menciones**, **sentiment**, **trending topics** y **alertas de crisis**; respuesta **<2 min** y tendencias **<1h** latencia.";
    const fewShot =
      '{"content":"Mentions monitored, sentiment triage, crisis alert <2m","score":92,"highlights":["<2m response","Trend <1h"],"metrics":["Mention volume"]}';
    return runSuperiorSocialMediaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorSocialMediaListeningAgent(): SuperiorSocialMediaListeningAgent {
  return SuperiorSocialMediaListeningAgent.instance;
}

export function resetSuperiorSocialMediaListeningAgentForTests(): void {
  SuperiorSocialMediaListeningAgent.reset();
}
