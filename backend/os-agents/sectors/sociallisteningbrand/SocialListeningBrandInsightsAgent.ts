import type { ILlmClient } from "../../LlmClient";
import type { SocialListeningBrandInput, SocialListeningBrandOutput } from "./shared";
import { getDefaultSocialListeningBrandLlm, runSocialListeningBrandAgentCore } from "./shared";

const AGENT_ID = "sociallisteningbrand-insights";

export class SocialListeningBrandInsightsAgent {
  private static inst: SocialListeningBrandInsightsAgent | undefined;

  static get instance(): SocialListeningBrandInsightsAgent {
    if (!SocialListeningBrandInsightsAgent.inst)
      SocialListeningBrandInsightsAgent.inst = new SocialListeningBrandInsightsAgent();
    return SocialListeningBrandInsightsAgent.inst;
  }

  static reset(): void {
    SocialListeningBrandInsightsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialListeningBrandLlm();
  }

  async run(input: SocialListeningBrandInput): Promise<SocialListeningBrandOutput> {
    const eliteRole = "Eres **SocialListeningBrand Insights** — insights accionables de mercado.";
    const mission =
      "Traduce escucha social en **qué dice el mercado**, **gaps de producto** y **oportunidades de posicionamiento**.";
    const fewShot =
      '{"content":"Insights: mercado, gaps producto, posicionamiento","score":87,"highlights":["Gaps","Posicionamiento"],"metrics":["Actionable insights"]}';
    return runSocialListeningBrandAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getSocialListeningBrandInsightsAgent(): SocialListeningBrandInsightsAgent {
  return SocialListeningBrandInsightsAgent.instance;
}

export function resetSocialListeningBrandInsightsAgentForTests(): void {
  SocialListeningBrandInsightsAgent.reset();
}
