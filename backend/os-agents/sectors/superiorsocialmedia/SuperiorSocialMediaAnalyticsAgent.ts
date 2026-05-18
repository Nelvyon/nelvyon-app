import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSocialMediaInput, SuperiorSocialMediaOutput } from "./shared";
import { getDefaultSuperiorSocialMediaLlm, runSuperiorSocialMediaAgentCore } from "./shared";

const AGENT_ID = "superiorsocialmedia-analytics";

export class SuperiorSocialMediaAnalyticsAgent {
  private static inst: SuperiorSocialMediaAnalyticsAgent | undefined;

  static get instance(): SuperiorSocialMediaAnalyticsAgent {
    if (!SuperiorSocialMediaAnalyticsAgent.inst) {
      SuperiorSocialMediaAnalyticsAgent.inst = new SuperiorSocialMediaAnalyticsAgent();
    }
    return SuperiorSocialMediaAnalyticsAgent.inst;
  }

  static reset(): void {
    SuperiorSocialMediaAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSocialMediaLlm();
  }

  async run(input: SuperiorSocialMediaInput): Promise<SuperiorSocialMediaOutput> {
    const eliteRole =
      "Eres **SuperiorSocialMedia Analytics Lead** — KPIs y benchmark sectorial.";
    const mission =
      "Reporta **engagement rate**, **reach**, **impressions**, **share of voice** y **benchmark sectorial**; alcance orgánico **>15%** seguidores/post.";
    const fewShot =
      '{"content":"ER 6.2%, reach 18% followers, SOV vs sector","score":89,"highlights":[">5% ER",">15% reach"],"metrics":["Engagement rate"]}';
    return runSuperiorSocialMediaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorSocialMediaAnalyticsAgent(): SuperiorSocialMediaAnalyticsAgent {
  return SuperiorSocialMediaAnalyticsAgent.instance;
}

export function resetSuperiorSocialMediaAnalyticsAgentForTests(): void {
  SuperiorSocialMediaAnalyticsAgent.reset();
}
